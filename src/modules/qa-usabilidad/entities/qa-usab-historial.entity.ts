import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { QaUsabSesion } from './qa-usab-sesion.entity';

@Entity({ name: 'qa_usab_historial' })
export class QaUsabHistorial {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => QaUsabSesion, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sesion_id' })
  sesion: QaUsabSesion;

  @Column({ name: 'accion', type: 'varchar', length: 40 })
  accion: string;

  @Column({ name: 'detalle', type: 'jsonb' })
  detalle: Record<string, unknown>;

  @CreateDateColumn({ name: 'ocurrido_en', type: 'timestamptz' })
  ocurridoEn: Date;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;
}
