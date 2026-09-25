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
import { TipoTratamiento } from '../enums/tipo-tratamiento.enum';
import { UnidadTratamiento } from '../enums/unidad-tratamiento.enum';

const numericTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity({ name: 'tratamientos_agricolas' })
@Index('tratamientos_agricolas_siembra_fecha_idx', [
  'siembra',
  'fecha',
])
@Index('tratamientos_agricolas_producto_idx', ['producto'])
export class TratamientoAgricola {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Siembra, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'siembra_id' })
  siembra: Siembra;

  @Column({
    name: 'tipo',
    type: 'varchar',
    length: 40,
  })
  tipo: TipoTratamiento;

  @Column({
    name: 'producto',
    type: 'varchar',
    length: 120,
  })
  producto: string;

  @Column({
    name: 'fecha',
    type: 'date',
  })
  fecha: string;

  @Column({
    name: 'cantidad',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  cantidad: number;

  @Column({
    name: 'unidad',
    type: 'varchar',
    length: 20,
  })
  unidad: UnidadTratamiento;

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