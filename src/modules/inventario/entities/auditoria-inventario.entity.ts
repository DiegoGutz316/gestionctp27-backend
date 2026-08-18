import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum AccionAuditoriaInventario {
  CREAR = 'CREAR',
  EDITAR = 'EDITAR',
}

export enum RecursoAuditoriaInventario {
  PRODUCTO = 'PRODUCTO',
  CONFIGURACION_STOCK = 'CONFIGURACION_STOCK',
}

@Entity('auditoria_inventario')
export class AuditoriaInventario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  accion: AccionAuditoriaInventario;

  @Column({ type: 'varchar', length: 30 })
  recurso: RecursoAuditoriaInventario;

  @Column({ name: 'recurso_id', type: 'integer' })
  recursoId: number;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_id' })
  actor: Usuario;

  @Column({ type: 'jsonb' })
  datos: Record<string, unknown>;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
