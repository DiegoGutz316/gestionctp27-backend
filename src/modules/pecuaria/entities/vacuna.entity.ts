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
 * Backlog 2.5 (Registrar vacunas).
 *
 * Igual que Desparasitacion, representa un hecho sanitario ya ocurrido: el
 * backlog solo contempla registrarla y consultarla, no editarla, por eso no
 * lleva columnas de actualizacion.
 */
@Entity({ name: 'vacunas' })
@Index('vacunas_animal_fecha', ['animalId', 'fecha'])
export class Vacuna {
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
    name: 'tipo_vacuna',
    type: 'varchar',
    length: 120,
  })
  tipoVacuna: string;

  @Column({
    name: 'fecha',
    type: 'date',
  })
  fecha: string;

  // El proyecto no tiene un patron previo para "dosis" (no es una cantidad de
  // inventario ni una medida estandarizada): se representa como texto libre
  // corto, igual que "estado" en Animal, para admitir valores como "5 ml" o
  // "2da dosis" sin imponer una unidad que el backlog no pidio.
  @Column({
    name: 'dosis',
    type: 'varchar',
    length: 50,
  })
  dosis: string;

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
