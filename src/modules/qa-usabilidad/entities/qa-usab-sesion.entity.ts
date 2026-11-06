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
} from 'typeorm';

import { EstadoSesionUsab, ResultadoUsab } from '../enums/resultado-usab.enum';
import { QaUsabEvidencia } from './qa-usab-evidencia.entity';
import { QaUsabParticipante } from './qa-usab-participante.entity';

@Entity({ name: 'qa_usab_sesiones' })
@Index('qa_usab_sesiones_prueba_idx', ['pruebaCodigo'])
export class QaUsabSesion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => QaUsabParticipante, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'participante_id' })
  participante: QaUsabParticipante;

  @Column({ name: 'prueba_codigo', type: 'varchar', length: 20 })
  pruebaCodigo: string;

  @Column({ name: 'fecha_ejecucion', type: 'date' })
  fechaEjecucion: string;

  @Column({ name: 'hora_inicio', type: 'varchar', length: 8, nullable: true })
  horaInicio: string | null;

  @Column({ name: 'hora_fin', type: 'varchar', length: 8, nullable: true })
  horaFin: string | null;

  @Column({ name: 'tiempo_minutos', type: 'numeric', precision: 8, scale: 2, nullable: true })
  tiempoMinutos: number | null;

  @Column({ name: 'resultado', type: 'varchar', length: 40, nullable: true })
  resultado: ResultadoUsab | null;

  @Column({ name: 'errores', type: 'int', default: 0 })
  errores: number;

  @Column({ name: 'ayudas', type: 'int', default: 0 })
  ayudas: number;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones: string | null;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 20,
    default: EstadoSesionUsab.BORRADOR,
  })
  estado: EstadoSesionUsab;

  @Column({ name: 'origen', type: 'varchar', length: 30, default: 'SESION_REAL' })
  origen: string;

  @CreateDateColumn({ name: 'registrado_en', type: 'timestamptz' })
  registradoEn: Date;

  @Column({ name: 'registrado_por', type: 'uuid' })
  registradoPor: string;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPor: string | null;

  @OneToMany(() => QaUsabEvidencia, (e) => e.sesion)
  evidencias?: QaUsabEvidencia[];
}
