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

import { Siembra } from '../../siembra/entities/siembra.entity';

const numericTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

/**
 * Backlog 3.6 (Registrar cosechas).
 *
 * No lleva columnas de actualizacion: una cosecha es un hecho ocurrido y el
 * backlog solo contempla registrarla y consultarla.
 */
@Entity({ name: 'cosechas' })
@Index('cosechas_siembra_fecha_idx', ['siembra', 'fecha'])
export class Cosecha {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Siembra, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'siembra_id' })
  siembra: Siembra;

  @Column({
    name: 'fecha',
    type: 'date',
  })
  fecha: string;

  @Column({
    name: 'cantidad_obtenida',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  cantidadObtenida: number;

  @Column({
    name: 'observaciones',
    type: 'text',
    nullable: true,
  })
  observaciones: string | null;

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
