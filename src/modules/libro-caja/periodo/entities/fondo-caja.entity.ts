import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';
import { DepartamentoCaja } from '../../departamento/entities/departamento-caja.entity';
import { EstadoFondo } from '../enums/estado-fondo.enum';
import { AsientoCaja } from './asiento-caja.entity';
import { PeriodoCaja } from './periodo-caja.entity';

const numericTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

/**
 * Fondo de caja inicial de un departamento dentro de un periodo.
 * Se crea al abrir el periodo (uno por cada departamento activo) y el
 * departamento debe solicitar el monto.
 */
@Entity({ name: 'fondos_caja' })
@Index('fondos_caja_periodo_departamento_uq', ['periodo', 'departamento'], {
  unique: true,
})
export class FondoCaja {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PeriodoCaja, (periodo) => periodo.fondos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'periodo_id' })
  periodo: PeriodoCaja;

  @ManyToOne(() => DepartamentoCaja, (departamento) => departamento.fondos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'departamento_id' })
  departamento: DepartamentoCaja;

  @Column({
    name: 'monto_solicitado',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  montoSolicitado: number | null;

  @Index('fondos_caja_estado_idx')
  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoFondo,
    enumName: 'estado_fondo_caja',
    default: EstadoFondo.PENDIENTE,
  })
  estado: EstadoFondo;

  @Column({ name: 'solicitado_en', type: 'timestamptz', nullable: true })
  solicitadoEn: Date | null;

  @Column({ name: 'solicitado_por', type: 'uuid', nullable: true })
  solicitadoPor: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;

  @OneToMany(() => AsientoCaja, (asiento) => asiento.fondo)
  asientos?: AsientoCaja[];
}
