import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type IndexOptions,
} from 'typeorm';
import { Rol } from './rol.entity';

@Entity('usuarios')
@Index('uq_usuarios_correo', ['correo'], {
  unique: true,
  synchronize: false,
} as IndexOptions)
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  nombre!: string;

  @Column({
    type: 'varchar',
    length: 150,
  })
  correo!: string;

  @Column({
    name: 'contrasena_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  contrasenaHash!: string;

  @ManyToOne(() => Rol, {
    nullable: false,
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'rol_id',
  })
  rol!: Rol;

  @Column({
    type: 'boolean',
    default: true,
  })
  activo!: boolean;

  @Column({
    name: 'creado_por',
    type: 'uuid',
    nullable: true,
  })
  creadoPor!: string | null;

  @CreateDateColumn({
    name: 'creado_en',
    type: 'timestamptz',
  })
  creadoEn!: Date;

  @UpdateDateColumn({
    name: 'actualizado_en',
    type: 'timestamptz',
  })
  actualizadoEn!: Date;
}
