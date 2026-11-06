import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import {
  PILOTO_TECNICO,
  PRUEBAS_USAB,
  pruebaPorCodigo,
} from './catalogo/pruebas-usab';
import type { ActualizarSesionDto } from './dto/actualizar-sesion.dto';
import type { CrearParticipanteDto } from './dto/crear-participante.dto';
import type { CrearSesionDto } from './dto/crear-sesion.dto';
import { QaUsabEvidencia } from './entities/qa-usab-evidencia.entity';
import { QaUsabHistorial } from './entities/qa-usab-historial.entity';
import { QaUsabParticipante } from './entities/qa-usab-participante.entity';
import { QaUsabSesion } from './entities/qa-usab-sesion.entity';
import {
  EstadoSesionUsab,
  ETIQUETA_RESULTADO_USAB,
  ResultadoUsab,
} from './enums/resultado-usab.enum';

const MIME_PERMITIDOS = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]);
const TAMANO_MAX = 5 * 1024 * 1024;

@Injectable()
export class QaUsabilidadService {
  constructor(
    @InjectRepository(QaUsabParticipante)
    private readonly participantes: Repository<QaUsabParticipante>,
    @InjectRepository(QaUsabSesion)
    private readonly sesiones: Repository<QaUsabSesion>,
    @InjectRepository(QaUsabEvidencia)
    private readonly evidencias: Repository<QaUsabEvidencia>,
    @InjectRepository(QaUsabHistorial)
    private readonly historial: Repository<QaUsabHistorial>,
  ) {}

  catalogo() {
    return {
      totalDefinidas: PRUEBAS_USAB.length,
      porModulo: {
        LIBRO_CAJA: PRUEBAS_USAB.filter((p) => p.modulo === 'LIBRO_CAJA').length,
        PECUARIA: PRUEBAS_USAB.filter((p) => p.modulo === 'PECUARIA').length,
        AGRICOLA: PRUEBAS_USAB.filter((p) => p.modulo === 'AGRICOLA').length,
        REPORTES_AVISOS: PRUEBAS_USAB.filter(
          (p) => p.modulo === 'REPORTES_AVISOS',
        ).length,
      },
      pruebas: PRUEBAS_USAB,
      pilotoTecnico: PILOTO_TECNICO,
      nota:
        'El piloto técnico no se mezcla con las estadísticas de sesiones reales.',
    };
  }

  async resumen() {
    const [participantes, sesiones, evidencias] = await Promise.all([
      this.participantes.count(),
      this.sesiones.find({
        relations: { participante: true, evidencias: true },
        order: { id: 'DESC' },
      }),
      this.evidencias.count(),
    ]);

    const reales = sesiones.filter((s) => s.origen === 'SESION_REAL');
    const finalizadas = reales.filter(
      (s) => s.estado === EstadoSesionUsab.FINALIZADA,
    );
    const codigosConSesion = new Set(reales.map((s) => s.pruebaCodigo));
    const pendientes = PRUEBAS_USAB.filter(
      (p) => !codigosConSesion.has(p.codigo),
    ).map((p) => p.codigo);

    const porResultado: Record<string, number> = {};
    for (const s of finalizadas) {
      if (!s.resultado) continue;
      porResultado[s.resultado] = (porResultado[s.resultado] ?? 0) + 1;
    }

    return {
      pruebasDefinidas: PRUEBAS_USAB.length,
      sesionesReales: reales.length,
      sesionesFinalizadas: finalizadas.length,
      participantes,
      evidencias,
      pruebasConAlMenosUnaSesion: codigosConSesion.size,
      pruebasPendientesSinSesion: pendientes,
      resultadosFinalizados: porResultado,
      pilotoTecnico: PILOTO_TECNICO,
      porModulo: this.agruparPorModulo(reales),
    };
  }

  private agruparPorModulo(sesiones: QaUsabSesion[]) {
    const base = {
      LIBRO_CAJA: 0,
      PECUARIA: 0,
      AGRICOLA: 0,
      REPORTES_AVISOS: 0,
    };
    for (const s of sesiones) {
      const def = pruebaPorCodigo(s.pruebaCodigo);
      if (def) base[def.modulo] += 1;
    }
    return base;
  }

  listarParticipantes() {
    return this.participantes.find({ order: { codigo: 'ASC' } });
  }

  async crearParticipante(dto: CrearParticipanteDto, actor: UsuarioAutenticado) {
    const codigo = dto.codigo.toUpperCase();
    const existe = await this.participantes.findOne({ where: { codigo } });
    if (existe) {
      throw new ConflictException(`Ya existe el participante ${codigo}.`);
    }
    const creado = this.participantes.create({
      codigo,
      rolPerfil: dto.rolPerfil,
      notas: dto.notas ?? null,
      creadoPor: actor.id,
    });
    return this.participantes.save(creado);
  }

  async listarSesiones() {
    const sesiones = await this.sesiones.find({
      relations: { participante: true, evidencias: true },
      order: { id: 'DESC' },
    });
    return sesiones.map((s) => this.mapSesion(s));
  }

  async obtenerSesion(id: number) {
    const sesion = await this.sesiones.findOne({
      where: { id },
      relations: { participante: true, evidencias: true },
    });
    if (!sesion) throw new NotFoundException('La sesión no existe.');
    const hist = await this.historial.find({
      where: { sesion: { id } },
      order: { id: 'ASC' },
    });
    return { ...this.mapSesion(sesion), historial: hist };
  }

  async crearSesion(dto: CrearSesionDto, actor: UsuarioAutenticado) {
    if (!pruebaPorCodigo(dto.pruebaCodigo)) {
      throw new BadRequestException('Prueba USAB desconocida.');
    }
    const participante = await this.participantes.findOne({
      where: { id: dto.participanteId },
    });
    if (!participante) {
      throw new NotFoundException('El participante no existe.');
    }

    const sesion = this.sesiones.create({
      participante,
      pruebaCodigo: dto.pruebaCodigo,
      fechaEjecucion: dto.fechaEjecucion,
      horaInicio: dto.horaInicio ?? null,
      horaFin: dto.horaFin ?? null,
      tiempoMinutos: dto.tiempoMinutos ?? null,
      resultado: dto.resultado ?? null,
      errores: dto.errores ?? 0,
      ayudas: dto.ayudas ?? 0,
      observaciones: dto.observaciones ?? null,
      estado: EstadoSesionUsab.BORRADOR,
      origen: 'SESION_REAL',
      registradoPor: actor.id,
      actualizadoPor: actor.id,
    });
    const guardada = await this.sesiones.save(sesion);
    await this.registrarHistorial(guardada.id, 'CREAR', { dto }, actor.id);
    return this.obtenerSesion(guardada.id);
  }

  async actualizarSesion(
    id: number,
    dto: ActualizarSesionDto,
    actor: UsuarioAutenticado,
  ) {
    const sesion = await this.sesiones.findOne({
      where: { id },
      relations: { participante: true },
    });
    if (!sesion) throw new NotFoundException('La sesión no existe.');

    if (sesion.estado === EstadoSesionUsab.FINALIZADA) {
      if (!dto.motivoCambio?.trim()) {
        throw new BadRequestException(
          'Para modificar una sesión finalizada indique el motivo del cambio (queda en el historial).',
        );
      }
    }

    const antes = { ...this.snapshot(sesion) };
    if (dto.horaInicio !== undefined) sesion.horaInicio = dto.horaInicio;
    if (dto.horaFin !== undefined) sesion.horaFin = dto.horaFin;
    if (dto.tiempoMinutos !== undefined) sesion.tiempoMinutos = dto.tiempoMinutos;
    if (dto.resultado !== undefined) sesion.resultado = dto.resultado;
    if (dto.errores !== undefined) sesion.errores = dto.errores;
    if (dto.ayudas !== undefined) sesion.ayudas = dto.ayudas;
    if (dto.observaciones !== undefined) {
      sesion.observaciones = dto.observaciones;
    }
    sesion.actualizadoPor = actor.id;
    await this.sesiones.save(sesion);

    await this.registrarHistorial(
      id,
      sesion.estado === EstadoSesionUsab.FINALIZADA
        ? 'EDITAR_FINALIZADA'
        : 'EDITAR',
      {
        antes,
        despues: this.snapshot(sesion),
        motivoCambio: dto.motivoCambio ?? null,
      },
      actor.id,
    );
    return this.obtenerSesion(id);
  }

  async finalizarSesion(id: number, actor: UsuarioAutenticado) {
    const sesion = await this.sesiones.findOne({ where: { id } });
    if (!sesion) throw new NotFoundException('La sesión no existe.');
    if (sesion.estado === EstadoSesionUsab.FINALIZADA) {
      throw new ConflictException('La sesión ya está finalizada.');
    }
    if (!sesion.resultado) {
      throw new BadRequestException(
        'Indique el resultado de la tarea antes de finalizar.',
      );
    }
    sesion.estado = EstadoSesionUsab.FINALIZADA;
    sesion.actualizadoPor = actor.id;
    await this.sesiones.save(sesion);
    await this.registrarHistorial(id, 'FINALIZAR', { resultado: sesion.resultado }, actor.id);
    return this.obtenerSesion(id);
  }

  async adjuntarEvidencia(
    sesionId: number,
    archivo: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    actor: UsuarioAutenticado,
  ) {
    const sesion = await this.sesiones.findOne({ where: { id: sesionId } });
    if (!sesion) throw new NotFoundException('La sesión no existe.');
    if (!MIME_PERMITIDOS.has(archivo.mimetype)) {
      throw new BadRequestException(
        'Solo se admiten PNG, JPEG, WebP o PDF (máx. 5 MB).',
      );
    }
    if (archivo.size > TAMANO_MAX) {
      throw new BadRequestException('El archivo no puede superar 5 MB.');
    }

    const evidencia = this.evidencias.create({
      sesion,
      nombreArchivo: archivo.originalname.slice(0, 200),
      mime: archivo.mimetype,
      tamanoBytes: archivo.size,
      contenido: archivo.buffer,
      subidoPor: actor.id,
    });
    const guardada = await this.evidencias.save(evidencia);
    await this.registrarHistorial(
      sesionId,
      'EVIDENCIA',
      { evidenciaId: guardada.id, nombre: guardada.nombreArchivo },
      actor.id,
    );
    return {
      id: guardada.id,
      nombreArchivo: guardada.nombreArchivo,
      mime: guardada.mime,
      tamanoBytes: guardada.tamanoBytes,
      subidoEn: guardada.subidoEn,
    };
  }

  async descargarEvidencia(evidenciaId: number) {
    const ev = await this.evidencias.findOne({ where: { id: evidenciaId } });
    if (!ev) throw new NotFoundException('La evidencia no existe.');
    return ev;
  }

  async generarInformeMarkdown(): Promise<string> {
    const resumen = await this.resumen();
    const sesionesRaw = await this.sesiones.find({
      relations: { participante: true, evidencias: true },
      order: { id: 'ASC' },
    });
    const lineas: string[] = [
      '# Informe de usabilidad — GestiónCTP27',
      '',
      `Generado: ${new Date().toISOString()}`,
      '',
      '## Separación piloto técnico vs sesiones reales',
      '',
      `- **Piloto técnico:** ${resumen.pilotoTecnico.descripcion}`,
      `- **Referencia:** ${resumen.pilotoTecnico.referencia}`,
      '- **Sesiones reales:** solo las registradas abajo. No se inventan resultados.',
      '',
      '## Resumen',
      '',
      `- Pruebas definidas: ${resumen.pruebasDefinidas}`,
      `- Sesiones reales: ${resumen.sesionesReales}`,
      `- Sesiones finalizadas: ${resumen.sesionesFinalizadas}`,
      `- Participantes: ${resumen.participantes}`,
      `- Evidencias: ${resumen.evidencias}`,
      `- Pruebas sin ninguna sesión: ${resumen.pruebasPendientesSinSesion.join(', ') || '(ninguna)'}`,
      '',
    ];

    if (resumen.sesionesReales === 0) {
      lineas.push(
        '> **Las pruebas con usuarios reales están pendientes.** No hay sesiones auténticas registradas.',
        '',
      );
    }

    lineas.push('## Catálogo USAB-01…10', '');
    for (const p of PRUEBAS_USAB) {
      lineas.push(`### ${p.codigo} — ${p.nombre}`);
      lineas.push(`- Módulo: ${p.modulo}`);
      lineas.push(`- Objetivo: ${p.objetivo}`);
      lineas.push('');
    }

    lineas.push('## Sesiones registradas', '');
    if (sesionesRaw.length === 0) {
      lineas.push('_Sin sesiones._', '');
    } else {
      for (const s of sesionesRaw) {
        const def = pruebaPorCodigo(s.pruebaCodigo);
        lineas.push(
          `### Sesión #${s.id} — ${s.pruebaCodigo} (${s.estado})`,
        );
        lineas.push(`- Participante: ${s.participante.codigo} (${s.participante.rolPerfil})`);
        lineas.push(`- Fecha: ${s.fechaEjecucion}`);
        lineas.push(
          `- Resultado: ${s.resultado ? ETIQUETA_RESULTADO_USAB[s.resultado] : '(sin indicar)'}`,
        );
        lineas.push(`- Tiempo (min): ${s.tiempoMinutos ?? '—'}`);
        lineas.push(`- Errores: ${s.errores}; Ayudas: ${s.ayudas}`);
        lineas.push(`- Observaciones: ${s.observaciones ?? '—'}`);
        lineas.push(
          `- Evidencias: ${(s.evidencias ?? []).map((e) => e.nombreArchivo).join(', ') || 'ninguna'}`,
        );
        lineas.push(`- Origen: ${s.origen}`);
        if (def) lineas.push(`- Prueba: ${def.nombre}`);
        lineas.push('');
      }
    }

    lineas.push(
      '## Conclusiones',
      '',
      resumen.sesionesFinalizadas === 0
        ? 'Aún no hay sesiones finalizadas con usuarios reales; las conclusiones universitarias quedan pendientes de esas sesiones.'
        : 'Basar las conclusiones únicamente en las sesiones finalizadas listadas arriba (no en el piloto técnico).',
      '',
    );

    return lineas.join('\n');
  }

  private snapshot(sesion: QaUsabSesion) {
    return {
      horaInicio: sesion.horaInicio,
      horaFin: sesion.horaFin,
      tiempoMinutos: sesion.tiempoMinutos,
      resultado: sesion.resultado,
      errores: sesion.errores,
      ayudas: sesion.ayudas,
      observaciones: sesion.observaciones,
      estado: sesion.estado,
    };
  }

  private mapSesion(sesion: QaUsabSesion) {
    return {
      id: sesion.id,
      pruebaCodigo: sesion.pruebaCodigo,
      prueba: pruebaPorCodigo(sesion.pruebaCodigo) ?? null,
      participante: {
        id: sesion.participante.id,
        codigo: sesion.participante.codigo,
        rolPerfil: sesion.participante.rolPerfil,
      },
      fechaEjecucion: sesion.fechaEjecucion,
      horaInicio: sesion.horaInicio,
      horaFin: sesion.horaFin,
      tiempoMinutos: sesion.tiempoMinutos,
      resultado: sesion.resultado,
      etiquetaResultado: sesion.resultado
        ? ETIQUETA_RESULTADO_USAB[sesion.resultado]
        : null,
      errores: sesion.errores,
      ayudas: sesion.ayudas,
      observaciones: sesion.observaciones,
      estado: sesion.estado,
      origen: sesion.origen,
      registradoEn: sesion.registradoEn,
      registradoPor: sesion.registradoPor,
      evidencias: (sesion.evidencias ?? []).map((e) => ({
        id: e.id,
        nombreArchivo: e.nombreArchivo,
        mime: e.mime,
        tamanoBytes: e.tamanoBytes,
        subidoEn: e.subidoEn,
      })),
    };
  }

  private async registrarHistorial(
    sesionId: number,
    accion: string,
    detalle: Record<string, unknown>,
    actorId: string,
  ) {
    await this.historial.save(
      this.historial.create({
        sesion: { id: sesionId } as QaUsabSesion,
        accion,
        detalle,
        actorId,
      }),
    );
  }
}
