import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'animales' })
export class Animal {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('animales_codigo_unico', { unique: true })
  @Column({
    name: 'codigo',
    type: 'varchar',
    length: 50,
  })
  codigo: string;

  @Column({
    name: 'nombre',
    type: 'varchar',
    length: 120,
  })
  nombre: string;

  @Column({
    name: 'especie',
    type: 'varchar',
    length: 80,
  })
  especie: string;

  @Column({
    name: 'raza',
    type: 'varchar',
    length: 100,
  })
  raza: string;

  @Column({
    name: 'fecha_nacimiento',
    type: 'date',
  })
  fechaNacimiento: string;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 50,
  })
  estado: string;

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

  @UpdateDateColumn({
    name: 'actualizado_en',
    type: 'timestamptz',
  })
  actualizadoEn: Date;

  @Column({
    name: 'actualizado_por',
    type: 'uuid',
    nullable: true,
  })
  actualizadoPor: string | null;
}
