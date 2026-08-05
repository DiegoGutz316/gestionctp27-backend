import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ROLES_USUARIO, type RolUsuario } from '../../../schemas';

/**
 * Backlog 1.1 / Task de BD: tabla de usuarios con correo, contrasena, estado y rol.
 *
 * synchronize esta en false: esta entidad debe coincidir exactamente con la
 * migracion 1785824000000-Usuarios.ts. Cualquier cambio aqui exige una
 * migracion nueva.
 */
@Entity({ name: 'usuarios' })
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'nombre', type: 'varchar', length: 120 })
  nombre!: string;

  /** Siempre en minusculas (se normaliza en el servicio) para que UNIQUE funcione. */
  @Index('usuarios_correo_unico', { unique: true })
  @Column({ name: 'correo', type: 'varchar', length: 150, unique: true })
  correo!: string;

  /**
   * Hash bcrypt. select: false evita que salga en consultas normales, asi el
   * hash nunca viaja por accidente en una respuesta de la API.
   * Para leerlo hay que pedirlo explicitamente con addSelect.
   */
  @Column({
    name: 'contrasena_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  contrasenaHash!: string;

  @Column({
    name: 'rol',
    type: 'enum',
    enum: ROLES_USUARIO as unknown as string[],
    enumName: 'rol_usuario',
  })
  rol!: RolUsuario;

  /** Desactivacion logica (Backlog 1.5): el registro se conserva. */
  @Index('usuarios_activo_idx')
  @Column({ name: 'activo', type: 'boolean', default: true })
  activo!: boolean;

  @Column({ name: 'ultimo_acceso', type: 'timestamptz', nullable: true })
  ultimoAcceso!: Date | null;

  // --- Auditoria transversal a todo el sistema -----------------------------
  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn!: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn!: Date;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPor!: string | null;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPor!: string | null;
}
