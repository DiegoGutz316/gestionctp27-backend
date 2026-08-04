import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('roles')
@Index('uq_roles_nombre', ['nombre'], {
  unique: true,
})
export class Rol {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 50,
  })
  nombre!: string;

  @Column({
    type: 'boolean',
    default: true,
  })
  activo!: boolean;

  @CreateDateColumn({
    name: 'creado_en',
    type: 'timestamptz',
  })
  creadoEn!: Date;

  @UpdateDateColumn({
    name: 'actualizado_en',
    type: 'timestamptz',
  })
  actualizadoEn!: Date;
}
