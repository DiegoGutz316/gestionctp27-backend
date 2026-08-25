import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoPeriodo } from '../enums/estado-periodo.enum';
import { FondoCaja } from './fondo-caja.entity';

@Entity({ name: 'periodos_caja' })
export class PeriodoCaja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre', type: 'varchar', length: 120 })
  nombre: string;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: string;

  @Column({ name: 'fecha_fin', type: 'date' })
  fechaFin: string;

  @Index('periodos_caja_estado_idx')
  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoPeriodo,
    enumName: 'estado_periodo_caja',
    default: EstadoPeriodo.ABIERTO,
  })
  estado: EstadoPeriodo;

  @OneToMany(() => FondoCaja, (fondo) => fondo.periodo)
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
