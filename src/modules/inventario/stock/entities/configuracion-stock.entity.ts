import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';
import { Producto } from '../../producto/entities/producto.entity';

const numericTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('configuraciones_stock')
export class ConfiguracionStock {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Producto, (producto) => producto.configuracionStock, {
    nullable: false,
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({
    name: 'stock_minimo',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  stockMinimo: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  precio: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPor: string | null;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPor: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
