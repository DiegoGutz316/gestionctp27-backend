import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';
import { FondoCaja } from './fondo-caja.entity';

const numericTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

/**
 * Movimiento del libro de caja de un departamento en un periodo.
 * El saldo no se guarda: se calcula con el fondo inicial más ingresos menos egresos.
 */
@Entity({ name: 'asientos_caja' })
@Index('asientos_caja_fondo_numero_uq', ['fondo', 'numero'], { unique: true })
export class AsientoCaja {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FondoCaja, (fondo) => fondo.asientos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'fondo_id' })
  fondo: FondoCaja;

  @Column({ name: 'numero', type: 'integer' })
  numero: number;

  @Column({ name: 'fecha', type: 'date' })
  fecha: string;

  @Column({
    name: 'numero_factura',
    type: 'varchar',
    length: 40,
    default: '',
  })
  numeroFactura: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 250 })
  descripcion: string;

  @Column({
    name: 'ingresos',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    default: 0,
  })
  ingresos: number;

  @Column({
    name: 'egresos',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    default: 0,
  })
  egresos: number;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPor: string | null;
}
