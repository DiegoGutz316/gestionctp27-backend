import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Datos bancarios e institucionales que encabezan el libro de caja.
 * Hay una sola fila (id = 1); se siembra en la migración.
 */
@Entity({ name: 'informacion_colegio' })
export class InformacionColegio {
  @PrimaryColumn({ type: 'integer', default: 1 })
  id: number;

  @Column({ name: 'nombre', type: 'varchar', length: 150 })
  nombre: string;

  @Column({ name: 'numero_cuenta_bancaria', type: 'varchar', length: 50 })
  numeroCuentaBancaria: string;

  @Column({ name: 'entidad_deposito', type: 'varchar', length: 150 })
  entidadDeposito: string;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPor: string | null;
}
