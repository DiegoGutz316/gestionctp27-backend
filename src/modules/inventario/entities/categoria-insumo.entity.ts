import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type IndexOptions,
} from 'typeorm';

// El índice único real es de expresión (lower(nombre) WHERE activo = true) y
// se crea a mano en la migración; synchronize:false evita que la CLI lo toque.
// typeorm 1.0 quitó `synchronize` del tipo IndexOptions pero el runtime aún lo
// respeta (RdbmsSchemaBuilder.shouldDropIndices), de ahí el cast.
@Entity('categorias_insumo')
@Index('uq_categorias_insumo_nombre', ['nombre'], {
  unique: true,
  synchronize: false,
} as IndexOptions)
export class CategoriaInsumo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 60 })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
