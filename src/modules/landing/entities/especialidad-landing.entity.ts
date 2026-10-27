import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { IconoEspecialidad } from '../enums/icono-especialidad.enum';

@Entity({ name: 'especialidades_landing' })
@Index('especialidades_landing_activo_orden_idx', ['activo', 'orden', 'id'])
export class EspecialidadLanding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 400 })
  descripcion: string;

  @Column({ type: 'varchar', length: 40 })
  icono: IconoEspecialidad;

  @Column({ type: 'varchar', length: 60 })
  acento: string;

  @Column({ name: 'foto_alt', type: 'varchar', length: 250, default: '' })
  fotoAlt: string;

  @Column({ name: 'posicion_foto', type: 'varchar', length: 40, nullable: true })
  posicionFoto: string | null;

  /** Ruta pública de respaldo si aún no se subió una foto a la BD. */
  @Column({ name: 'foto_estatica', type: 'varchar', length: 250, nullable: true })
  fotoEstatica: string | null;

  @Column({
    name: 'foto',
    type: 'bytea',
    nullable: true,
    select: false,
  })
  foto: Buffer | null;

  @Column({ name: 'foto_tipo', type: 'varchar', length: 40, nullable: true })
  fotoTipo: string | null;

  @Column({ type: 'integer', default: 0 })
  orden: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPor: string | null;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPor: string | null;
}
