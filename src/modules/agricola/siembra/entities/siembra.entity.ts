import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type ValueTransformer,
} from 'typeorm';

import { CamaCultivo } from '../../cama/entities/cama-cultivo.entity';
import { Cultivo } from '../../cultivo/entities/cultivo.entity';
import { UnidadSiembra } from '../enums/unidad-siembra.enum';

const numericTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity({ name: 'siembras' })
@Index('siembras_cama_fecha_idx', ['cama', 'fechaSiembra'])
@Index('siembras_cultivo_idx', ['tipoCultivo'])
export class Siembra {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CamaCultivo, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'cama_id' })
  cama: CamaCultivo;

  @ManyToOne(() => Cultivo, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'cultivo_id' })
  cultivo: Cultivo;

  /**
   * El nombre del cultivo tal como estaba al sembrar.
   *
   * Lo leen los filtros, los reportes y las exportaciones, y deja constancia
   * aunque despues se renombre el cultivo en el catalogo.
   */
  @Column({
    name: 'tipo_cultivo',
    type: 'varchar',
    length: 120,
  })
  tipoCultivo: string;

  @Column({
    name: 'fecha_siembra',
    type: 'date',
  })
  fechaSiembra: string;

  /** Nula mientras el ciclo sigue activo. Al finalizar se conserva el registro. */
  @Column({
    name: 'finalizada_en',
    type: 'date',
    nullable: true,
  })
  finalizadaEn: string | null;

  /** Por qué se cerró el ciclo cuando no hubo cosecha. Nulo si sigue activa o si cerró con cosecha. */
  @Column({
    name: 'motivo_finalizacion',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  motivoFinalizacion: string | null;

  @Column({
    name: 'motivo_detalle',
    type: 'text',
    nullable: true,
  })
  motivoDetalle: string | null;

  @Column({
    name: 'cantidad_sembrada',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  cantidadSembrada: number;

  /** En que se cuenta lo sembrado: semillas o plantulas, o peso a granel. */
  @Column({
    name: 'unidad_sembrada',
    type: 'varchar',
    length: 20,
  })
  unidadSembrada: UnidadSiembra;

  @CreateDateColumn({
    name: 'creado_en',
    type: 'timestamptz',
  })
  creadoEn: Date;

  @Column({
    name: 'creado_por',
    type: 'uuid',
    nullable: false,
  })
  creadoPor: string;
}
