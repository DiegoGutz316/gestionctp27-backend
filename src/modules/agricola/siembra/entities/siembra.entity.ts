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

  @Column({
    name: 'cantidad_sembrada',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  cantidadSembrada: number;

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
