import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type IndexOptions,
  type ValueTransformer,
} from 'typeorm';
import { CategoriaInsumo } from './categoria-insumo.entity';

// Postgres devuelve las columnas numeric como string; se exponen como number.
const numericTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

// El índice único real es de expresión (lower(nombre), categoria_id WHERE
// activo = true) y se crea a mano en la migración; synchronize:false evita
// que la CLI lo toque. typeorm 1.0 quitó `synchronize` del tipo IndexOptions
// pero el runtime aún lo respeta, de ahí el cast.
@Entity('insumos')
@Index('uq_insumos_nombre_categoria', ['nombre', 'categoria'], {
  unique: true,
  synchronize: false,
} as IndexOptions)
export class Insumo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @ManyToOne(() => CategoriaInsumo, {
    nullable: false,
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'categoria_id' })
  categoria: CategoriaInsumo;

  @Column({ name: 'unidad_medida', type: 'varchar', length: 10 })
  unidadMedida: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  cantidad: number;

  @Column({
    name: 'nivel_minimo',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  nivelMinimo: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // TODO(Feature 1 - auth): volver NOT NULL + FK a usuarios y llenar desde el
  // usuario autenticado cuando exista el módulo de autenticación.
  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPor: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
