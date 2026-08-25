import type { InformacionColegio } from '../entities/informacion-colegio.entity';

export interface InformacionColegioRespuesta {
  id: number;
  nombre: string;
  numeroCuentaBancaria: string;
  entidadDeposito: string;
  actualizadoEn: Date;
}

export function mapearInformacionColegio(
  colegio: InformacionColegio,
): InformacionColegioRespuesta {
  return {
    id: colegio.id,
    nombre: colegio.nombre,
    numeroCuentaBancaria: colegio.numeroCuentaBancaria,
    entidadDeposito: colegio.entidadDeposito,
    actualizadoEn: colegio.actualizadoEn,
  };
}
