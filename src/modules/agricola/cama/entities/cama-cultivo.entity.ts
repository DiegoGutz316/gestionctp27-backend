import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'camas_cultivo' })
export class CamaCultivo {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('camas_cultivo_codigo_unico', { unique: true })
  @Column({
    name: 'codigo',
    type: 'varchar',
    length: 50,
  })
  codigo: string;

  @Column({
    name: 'ubicacion',
    type: 'varchar',
    length: 120,
  })
  ubicacion: string;

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
