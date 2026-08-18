import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { ModuloSistema } from '../enums/modulo-sistema.enum';
import { NivelPermiso } from '../enums/nivel-permiso.enum';

/**
 * Backlog 1.6 - Task de BD: "Crear tabla de permisos si se requiere mayor
 * detalle". Mapea (rol, modulo) -> nivel de acceso.
 *
 * El rol sigue siendo un enum en `usuarios.rol` (los 5 roles son fijos y no los
 * administra el usuario final); lo que si vive en BD es la matriz de permisos,
 * para poder ajustar que ve cada rol sin recompilar ni desplegar.
 *
 * synchronize esta en false: debe coincidir con la migracion
 * 1786400000000-PermisosRol.ts.
 */
@Entity({ name: 'permisos_rol' })
@Index('permisos_rol_unico', ['rol', 'modulo'], { unique: true })
export class PermisoRol {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'rol',
    type: 'enum',
    enum: RolUsuario,
    enumName: 'rol_usuario',
  })
  rol: RolUsuario;

  @Column({
    name: 'modulo',
    type: 'enum',
    enum: ModuloSistema,
    enumName: 'modulo_sistema',
  })
  modulo: ModuloSistema;

  @Column({
    name: 'nivel',
    type: 'enum',
    enum: NivelPermiso,
    enumName: 'nivel_permiso',
    default: NivelPermiso.NINGUNO,
  })
  nivel: NivelPermiso;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
