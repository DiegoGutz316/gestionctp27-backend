import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { EstadoAviso } from '../enums/estado-aviso.enum';

/**
 * Backlog 5.5 (Crear avisos institucionales).
 *
 * Editar o desactivar (5.7) no borra la fila: cambia los datos o el estado y
 * deja quién y cuándo lo modificó. Esas columnas quedan vacías hasta el
 * primer cambio.
 */
@Entity({ name: 'avisos' })
@Index('avisos_estado_fecha_idx', ['estado', 'fecha'])
export class Aviso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'titulo', type: 'varchar', length: 150 })
  titulo: string;

  @Column({ name: 'descripcion', type: 'text' })
  descripcion: string;

  /** Fecha de lo que se anuncia, no la de publicacion. Puede ser futura. */
  @Column({ name: 'fecha', type: 'date' })
  fecha: string;

  @Column({ name: 'estado', type: 'varchar', length: 20 })
  estado: EstadoAviso;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @Column({ name: 'creado_por', type: 'uuid', nullable: false })
  creadoPor: string;

  @Column({
    name: 'actualizado_en',
    type: 'timestamptz',
    nullable: true,
  })
  actualizadoEn: Date | null;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPor: string | null;

  /**
   * Imagen del flyer. No se selecciona en los listados: puede pesar varios
   * megabytes y solo hace falta al servir el archivo.
   */
  @Column({
    name: 'flyer',
    type: 'bytea',
    nullable: true,
    select: false,
  })
  flyer: Buffer | null;

  @Column({ name: 'flyer_tipo', type: 'varchar', length: 40, nullable: true })
  flyerTipo: string | null;
}
