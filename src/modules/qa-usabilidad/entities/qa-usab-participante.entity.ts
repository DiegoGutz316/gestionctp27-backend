import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'qa_usab_participantes' })
export class QaUsabParticipante {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('qa_usab_participantes_codigo_uq', { unique: true })
  @Column({ name: 'codigo', type: 'varchar', length: 40 })
  codigo: string;

  /** Perfil anónimo: DOCENTE_PECUARIO, DOCENTE_AGRICOLA, DIRECTORA, OTRO */
  @Column({ name: 'rol_perfil', type: 'varchar', length: 40 })
  rolPerfil: string;

  @Column({ name: 'notas', type: 'varchar', length: 250, nullable: true })
  notas: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @Column({ name: 'creado_por', type: 'uuid' })
  creadoPor: string;
}
