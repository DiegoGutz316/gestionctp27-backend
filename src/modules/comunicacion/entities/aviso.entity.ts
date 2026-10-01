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
 * No lleva columnas de actualizacion: editarlos y desactivarlos es el 5.7.
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
}
