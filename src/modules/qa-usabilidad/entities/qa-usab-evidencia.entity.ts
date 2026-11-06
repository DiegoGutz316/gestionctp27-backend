import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { QaUsabSesion } from './qa-usab-sesion.entity';

@Entity({ name: 'qa_usab_evidencias' })
export class QaUsabEvidencia {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => QaUsabSesion, (s) => s.evidencias, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sesion_id' })
  sesion: QaUsabSesion;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 200 })
  nombreArchivo: string;

  @Column({ name: 'mime', type: 'varchar', length: 120 })
  mime: string;

  @Column({ name: 'tamano_bytes', type: 'int' })
  tamanoBytes: number;

  @Column({ name: 'contenido', type: 'bytea' })
  contenido: Buffer;

  @CreateDateColumn({ name: 'subido_en', type: 'timestamptz' })
  subidoEn: Date;

  @Column({ name: 'subido_por', type: 'uuid' })
  subidoPor: string;
}
