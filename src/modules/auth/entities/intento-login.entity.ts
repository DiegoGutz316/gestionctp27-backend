import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Contador de intentos fallidos de inicio de sesión por correo.
 *
 * No referencia a `usuarios`: se registran también los intentos contra correos
 * inexistentes, para que la respuesta de bloqueo sea idéntica exista o no la
 * cuenta y no permita averiguar qué correos están registrados.
 *
 * synchronize esta en false: debe coincidir con la migracion
 * 1793000000000-IntentosLogin.ts.
 */
@Entity({ name: 'intentos_login' })
export class IntentoLogin {
  @PrimaryGeneratedColumn()
  id: number;

  /** Siempre normalizado (trim + minusculas) por LoginDto. */
  @Index('intentos_login_correo_unico', { unique: true })
  @Column({ name: 'correo', type: 'varchar', length: 150 })
  correo: string;

  @Column({ name: 'intentos_fallidos', type: 'integer', default: 0 })
  intentosFallidos: number;

  @Column({ name: 'bloqueado_hasta', type: 'timestamptz', nullable: true })
  bloqueadoHasta: Date | null;

  @Index('intentos_login_actualizado_idx')
  @Column({
    name: 'actualizado_en',
    type: 'timestamptz',
    default: () => 'now()',
  })
  actualizadoEn: Date;
}
