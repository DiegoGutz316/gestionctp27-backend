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

import { Animal } from '../../animal/entities/animal.entity';
import { TipoProduccion } from '../enums/tipo-produccion.enum';

const numericTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity({ name: 'produccion_pecuaria' })
@Index('produccion_pecuaria_animal_fecha_idx', ['animal', 'fecha'])
export class ProduccionPecuaria {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Animal, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'animal_id' })
  animal: Animal;

  @Column({
    name: 'tipo_produccion',
    type: 'varchar',
    length: 30,
  })
  tipoProduccion: TipoProduccion;

  @Column({
    name: 'cantidad',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  cantidad: number;

  @Column({
    name: 'fecha',
    type: 'date',
  })
  fecha: string;

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
