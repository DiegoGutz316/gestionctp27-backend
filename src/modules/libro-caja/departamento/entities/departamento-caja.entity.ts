import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  type IndexOptions,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FondoCaja } from '../../periodo/entities/fondo-caja.entity';

/**
 * Unidad productiva que opera con fondo de caja.
 * El índice único real es de expresión (lower(nombre_unidad) WHERE activo).
 */
@Entity({ name: 'departamentos_caja' })
@Index('uq_departamentos_caja_nombre', ['nombreUnidad'], {
  unique: true,
  synchronize: false,
} as IndexOptions)
export class DepartamentoCaja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre_unidad', type: 'varchar', length: 120 })
  nombreUnidad: string;

  @Column({ name: 'tipo_actividad', type: 'varchar', length: 120 })
  tipoActividad: string;

  @Index('departamentos_caja_activo_idx')
  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => FondoCaja, (fondo) => fondo.departamento)
  fondos?: FondoCaja[];

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPor: string | null;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPor: string | null;
}
