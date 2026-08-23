import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IntentoLogin } from './entities/intento-login.entity';

/** Fallos consecutivos admitidos antes de bloquear el correo. */
export const MAX_INTENTOS_FALLIDOS = 5;

/** Duracion del bloqueo. Se libera solo: nadie tiene que desbloquear a mano. */
export const MINUTOS_DE_BLOQUEO = 10;

interface FilaMinutos {
  minutos: string | number | null;
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
  constructor(
    @InjectRepository(IntentoLogin)
    private readonly intentos: Repository<IntentoLogin>,
  ) {}

  /**
   * Minutos que faltan para poder reintentar, o `null` si no hay bloqueo.
   *
   * El calculo se hace en la base de datos a proposito: `bloqueado_hasta` se
   * fija con el `now()` del servidor de BD, y restarle la hora del proceso de
   * Node mete el desfase entre ambos relojes. Con solo dos segundos de
   * diferencia, un bloqueo de 10 minutos se anunciaba como 11.
   */
  async minutosRestantes(correo: string): Promise<number | null> {
    const filas = await this.intentos.query<FilaMinutos[]>(
      `SELECT ceil(extract(epoch FROM ("bloqueado_hasta" - now())) / 60) AS minutos
         FROM "intentos_login"
        WHERE "correo" = $1
          AND "bloqueado_hasta" IS NOT NULL
          AND "bloqueado_hasta" > now()`,
      [correo],
    );
    return this.aNumero(filas[0]?.minutos);
  }

  /**
   * Registra un fallo y devuelve los minutos de bloqueo si este intento fue el
   * que lo activo (o `null` si todavia quedan intentos).
   *
   * Todo ocurre en una sola sentencia: leer el contador, sumarle uno y decidir
   * el bloqueo por separado permitiria que dos peticiones simultaneas leyeran
   * el mismo valor y el limite se pasara por alto.
   */
  async registrarFallo(correo: string): Promise<number | null> {
    const filas = await this.intentos.query<FilaMinutos[]>(
      `INSERT INTO "intentos_login"
              ("correo", "intentos_fallidos", "bloqueado_hasta", "actualizado_en")
       VALUES ($1, 1, NULL, now())
       ON CONFLICT ("correo") DO UPDATE SET
         "intentos_fallidos" = CASE
           WHEN "intentos_login"."intentos_fallidos" + 1 >= $2 THEN 0
           ELSE "intentos_login"."intentos_fallidos" + 1
         END,
         "bloqueado_hasta" = CASE
           WHEN "intentos_login"."intentos_fallidos" + 1 >= $2
             THEN now() + make_interval(mins => $3)
           ELSE NULL
         END,
         "actualizado_en" = now()
       RETURNING ceil(extract(epoch FROM ("bloqueado_hasta" - now())) / 60) AS minutos`,
      [correo, MAX_INTENTOS_FALLIDOS, MINUTOS_DE_BLOQUEO],
    );
    return this.aNumero(filas[0]?.minutos);
  }

  /** Se llama al validar la contrasena correctamente. */
  async limpiar(correo: string): Promise<void> {
    await this.intentos.delete({ correo });
  }

  /** `numeric` de Postgres llega como string por el driver. */
  private aNumero(valor: string | number | null | undefined): number | null {
    if (valor === null || valor === undefined) return null;
    const minutos = Number(valor);
    return Number.isFinite(minutos) && minutos > 0 ? minutos : null;
  }
}
