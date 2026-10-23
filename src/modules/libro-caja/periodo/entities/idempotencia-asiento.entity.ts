import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Evita que un reintento del mismo registro cree dos asientos.
 * La huella es el contenido de la solicitud; la misma clave con otro
 * contenido se rechaza.
 */
@Entity({ name: 'idempotencia_asientos' })
@Unique('uq_idempotencia_asiento_responsable_clave', ['responsableId', 'clave'])
export class IdempotenciaAsiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'responsable_id', type: 'uuid' })
  responsableId: string;

  @Column({ type: 'uuid' })
  clave: string;

  @Column({ type: 'char', length: 64 })
  huella: string;

  @Column({ name: 'asiento_id', type: 'integer', nullable: true })
  asientoId: number | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
