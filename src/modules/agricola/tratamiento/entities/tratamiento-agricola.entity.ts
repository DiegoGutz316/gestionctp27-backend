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
import { ActividadAgricola } from '../enums/actividad-agricola.enum';
import { TipoTratamiento } from '../enums/tipo-tratamiento.enum';
import { UnidadTratamiento } from '../enums/unidad-tratamiento.enum';

const numericTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity({ name: 'tratamientos_agricolas' })
@Index('tratamientos_agricolas_siembra_fecha_idx', ['siembra', 'fecha'])
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

  /**
   * Que se hizo. Un riego y una limpieza no gastan producto, asi que el
   * producto y su medida quedan vacios en esas dos.
   */
  @Column({
    name: 'actividad',
    type: 'varchar',
    length: 20,
  })
  actividad: ActividadAgricola;

  @Column({
    name: 'tipo',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  tipo: TipoTratamiento | null;

  @Column({
    name: 'producto',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  producto: string | null;

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
    nullable: true,
    transformer: numericTransformer,
  })
  cantidad: number | null;

  @Column({
    name: 'unidad',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  unidad: UnidadTratamiento | null;

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
