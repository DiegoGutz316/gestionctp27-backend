import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Animal } from './animal.entity';

/**
 * Backlog 2.7 (Registrar desparasitaciones).
 *
 * No lleva columnas de actualizacion porque el backlog solo contempla el
 * registro: una desparasitacion es un hecho ocurrido, no un dato que se edite.
 */
@Entity({ name: 'desparasitaciones' })
@Index('desparasitaciones_animal_fecha', ['animalId', 'fecha'])
export class Desparasitacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'animal_id',
    type: 'integer',
  })
  animalId: number;

  @ManyToOne(() => Animal, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'animal_id' })
  animal: Animal;

  @Column({
    name: 'producto',
    type: 'varchar',
    length: 120,
  })
  producto: string;

  @Column({
    name: 'fecha',
    type: 'date',
  })
  fecha: string;

  @Column({
    name: 'observaciones',
    type: 'text',
    nullable: true,
  })
  observaciones: string | null;

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
