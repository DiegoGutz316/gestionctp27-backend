import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Animal } from '../../animal/entities/animal.entity';
import { CondicionSalud } from '../enums/condicion-salud.enum';

@Entity({ name: 'registros_salud_animales' })
@Index('registros_salud_animal_fecha_idx', ['animal', 'fecha'])
export class RegistroSalud {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Animal, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'animal_id' })
  animal: Animal;

  @Column({
    name: 'fecha',
    type: 'date',
  })
  fecha: string;

  @Column({
    name: 'condicion_observada',
    type: 'varchar',
    length: 30,
  })
  condicionObservada: CondicionSalud;

  @Column({
    name: 'diagnostico',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  diagnostico: string | null;

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
