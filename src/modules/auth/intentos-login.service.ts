import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IntentoLogin } from './entities/intento-login.entity';

/** Fallos consecutivos admitidos antes de bloquear el correo. */
export const MAX_INTENTOS_FALLIDOS = 5;

/** Duracion del bloqueo. Se libera solo: nadie tiene que desbloquear a mano. */
export const MINUTOS_DE_BLOQUEO = 10;

/**
 * Tiempo sin actividad tras el cual se descarta el registro de un correo.
 *
 * Cumple dos funciones. La primera es evitar que la tabla crezca sin limite:
 * cada correo mal tecleado —o inventado por un atacante— crea una fila, y sin
 * purga solo se borran las de quien acaba iniciando sesion.
 *
 * La segunda es que los fallos caduquen. El contador cuenta fallos seguidos sin
 * ninguna nocion de tiempo, asi que sin esto cuatro errores de tecleo repartidos
 * a lo largo de meses dejarian la cuenta bloqueada al quinto.
 */
export const MINUTOS_DE_RETENCION = 60;

/** Filas que se purgan como maximo por intento, para acotar el trabajo. */
const MAXIMO_A_PURGAR = 200;

interface FilaSegundos {
  segundos: string | number | null;
}

/**
 * Bloqueo temporal del inicio de sesion por correo intentado.
 *
 * Complementa al limite por IP que ya aplica ThrottlerGuard sobre la ruta de
 * login: el de IP frena a un atacante rapido desde un solo origen, este frena
 * al que reparte los intentos entre varias IPs contra la misma cuenta.
 */
@Injectable()
export class IntentosLoginService {
  private readonly logger = new Logger(IntentosLoginService.name);

  constructor(
    @InjectRepository(IntentoLogin)
    private readonly intentos: Repository<IntentoLogin>,
  ) {}

  /**
   * Segundos que faltan para poder reintentar, o `null` si no hay bloqueo.
   * Se devuelven segundos y no minutos para que la interfaz pueda mostrar una
   * cuenta regresiva fina; el mensaje al usuario los redondea a minutos.
   *
   * El calculo se hace en la base de datos a proposito: `bloqueado_hasta` se
   * fija con el `now()` del servidor de BD, y restarle la hora del proceso de
   * Node mete el desfase entre ambos relojes. Con solo dos segundos de
   * diferencia, un bloqueo de 10 minutos se anunciaba como 11.
   */
  async segundosRestantes(correo: string): Promise<number | null> {
    const filas = await this.intentos.query<FilaSegundos[]>(
      `SELECT ceil(extract(epoch FROM ("bloqueado_hasta" - now()))) AS segundos
         FROM "intentos_login"
        WHERE "correo" = $1
          AND "bloqueado_hasta" IS NOT NULL
          AND "bloqueado_hasta" > now()`,
      [correo],
    );
    return this.aNumero(filas[0]?.segundos);
  }

  /**
   * Registra un fallo y devuelve los segundos de bloqueo si este intento fue el
   * que lo activo (o `null` si todavia quedan intentos).
   *
   * Todo ocurre en una sola sentencia: leer el contador, sumarle uno y decidir
   * el bloqueo por separado permitiria que dos peticiones simultaneas leyeran
   * el mismo valor y el limite se pasara por alto.
   *
   * La caducidad se resuelve aqui y no en la purga: `purgarAntiguos` excluye el
   * correo del intento en curso para no borrar la fila que este upsert va a
   * actualizar, asi que si la caducidad dependiera solo de ella, los fallos
   * viejos de este mismo correo seguirian contando.
   */
  async registrarFallo(correo: string): Promise<number | null> {
    await this.purgarAntiguos(correo);

    const filas = await this.intentos.query<FilaSegundos[]>(
      `INSERT INTO "intentos_login"
              ("correo", "intentos_fallidos", "bloqueado_hasta", "actualizado_en")
       VALUES ($1, 1, NULL, now())
       ON CONFLICT ("correo") DO UPDATE SET
         "intentos_fallidos" = CASE
           -- Sin actividad reciente, la cuenta de fallos vuelve a empezar.
           WHEN "intentos_login"."actualizado_en" < now() - make_interval(mins => $4)
             THEN 1
           WHEN "intentos_login"."intentos_fallidos" + 1 >= $2 THEN 0
           ELSE "intentos_login"."intentos_fallidos" + 1
         END,
         "bloqueado_hasta" = CASE
           WHEN "intentos_login"."actualizado_en" < now() - make_interval(mins => $4)
             THEN NULL
           WHEN "intentos_login"."intentos_fallidos" + 1 >= $2
             THEN now() + make_interval(mins => $3)
           ELSE NULL
         END,
         "actualizado_en" = now()
       RETURNING ceil(extract(epoch FROM ("bloqueado_hasta" - now()))) AS segundos`,
      [correo, MAX_INTENTOS_FALLIDOS, MINUTOS_DE_BLOQUEO, MINUTOS_DE_RETENCION],
    );
    return this.aNumero(filas[0]?.segundos);
  }

  /** Se llama al validar la contrasena correctamente. */
  async limpiar(correo: string): Promise<void> {
    await this.intentos.delete({ correo });
  }

  /**
   * Borra registros sin actividad reciente que no esten bloqueados.
   *
   * Se ejecuta en la misma ruta que crea las filas —cada intento fallido— en
   * vez de con un planificador: el proyecto no tiene ninguno y esto evita
   * sumar una dependencia solo para esto. El trabajo esta acotado por `LIMIT`
   * y se apoya en el indice de `actualizado_en`, asi que en el caso normal es
   * un recorrido de indice que no encuentra nada.
   *
   * Se excluye el correo del intento en curso: si estuviera lo bastante viejo,
   * la purga podria borrar la misma fila que el upsert siguiente va a
   * actualizar, y el fallo se perderia.
   *
   * Un error aqui no debe tumbar el inicio de sesion: la purga es
   * mantenimiento, no parte de la validacion.
   */
  private async purgarAntiguos(correoEnCurso: string): Promise<void> {
    try {
      await this.intentos.query(
        `DELETE FROM "intentos_login"
          WHERE "ctid" IN (
            SELECT "ctid"
              FROM "intentos_login"
             WHERE "correo" <> $1
               AND "actualizado_en" < now() - make_interval(mins => $2)
               AND ("bloqueado_hasta" IS NULL OR "bloqueado_hasta" <= now())
             LIMIT $3
          )`,
        [correoEnCurso, MINUTOS_DE_RETENCION, MAXIMO_A_PURGAR],
      );
    } catch (error) {
      this.logger.warn(
        `No se pudieron purgar intentos de login antiguos: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** `numeric` de Postgres llega como string por el driver. */
  private aNumero(valor: string | number | null | undefined): number | null {
    if (valor === null || valor === undefined) return null;
    const segundos = Number(valor);
    return Number.isFinite(segundos) && segundos > 0 ? segundos : null;
  }
}
