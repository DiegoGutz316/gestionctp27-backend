import type { Animal } from '../../animal/entities/animal.entity';
import type { ProduccionPecuaria } from '../entities/produccion-pecuaria.entity';
import { TipoProduccion } from '../enums/tipo-produccion.enum';
import { mapearConsultaProduccion } from './produccion.mapper';

describe('mapearConsultaProduccion', () => {
  const animal = {
    id: 1,
    codigo: 'BOV-001',
    nombre: 'Luna',
    especie: 'VACA',
    estado: 'ACTIVO',
  } as Animal;

  it('agrupa y redondea los totales por tipo de producción', () => {
    const registros = [
      {
        id: 1,
        animal,
        tipoProduccion: TipoProduccion.LECHE,
        cantidad: 1.11,
        fecha: '2026-09-01',
        creadoEn: new Date('2026-09-01T12:00:00.000Z'),
        creadoPor: 'b62082bb-17b7-49c1-994b-538d77bc814a',
      },
      {
        id: 2,
        animal,
        tipoProduccion: TipoProduccion.LECHE,
        cantidad: 2.22,
        fecha: '2026-09-02',
        creadoEn: new Date('2026-09-02T12:00:00.000Z'),
        creadoPor: 'b62082bb-17b7-49c1-994b-538d77bc814a',
      },
    ] as ProduccionPecuaria[];

    const resultado = mapearConsultaProduccion(
      animal,
      { animalId: 1, desde: '2026-09-01' },
      registros,
    );

    expect(resultado.totales).toEqual([
      { tipoProduccion: TipoProduccion.LECHE, cantidad: 3.33 },
    ]);
    expect(resultado.registros).toHaveLength(2);
    expect(resultado.desde).toBe('2026-09-01');
  });
});
