import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TipoCultivo } from '../enums/tipo-cultivo.enum';

/**
 * Catalogo de lo que la huerta siembra.
 *
 * Antes el cultivo se escribia a mano en cada siembra, asi que «Maiz», «maiz»
 * y «Maíz» eran tres cultivos distintos para el sistema y los totales de
 * produccion salian partidos. Ahora se registra una vez y se elige.
 */
@Entity({ name: 'cultivos' })
export class Cultivo {
  @PrimaryGeneratedColumn()
  id: number;

  /** Como lo escribe quien lo registra: «Maíz», con su tilde. */
  @Column({
    name: 'nombre',
    type: 'varchar',
    length: 120,
  })
  nombre: string;

  /**
   * El mismo nombre en minuscula y sin tildes, que es por donde se compara.
   *
   * Lleva el indice unico: asi «Maíz», «maiz» y «MAIZ» no pueden coexistir.
   * Se guarda en una columna en vez de indexar una expresion porque `unaccent`
   * no es inmutable y Postgres no deja indexarla directamente.
   */
  @Index('cultivos_nombre_normalizado_unico', { unique: true })
  @Column({
    name: 'nombre_normalizado',
    type: 'varchar',
    length: 120,
  })
  nombreNormalizado: string;

  @Column({
    name: 'tipo',
    type: 'varchar',
    length: 30,
  })
  tipo: TipoCultivo;

  @Column({
    name: 'descripcion',
    type: 'text',
    nullable: true,
  })
  descripcion: string | null;

  /**
   * Un cultivo no se borra: las siembras pasadas lo referencian. Se desactiva
   * para que deje de ofrecerse al registrar una siembra nueva.
   */
  @Column({
    name: 'activo',
    type: 'boolean',
    default: true,
  })
  activo: boolean;

  @CreateDateColumn({
    name: 'creado_en',
    type: 'timestamptz',
  })
  creadoEn: Date;

  @Column({
    name: 'creado_por',
    type: 'uuid',
    nullable: false,
  })
  creadoPor: string;
}
