import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type ValueTransformer,
} from 'typeorm';
import { Inventario } from './inventario.entity';
import { Usuario } from '../../../usuarios/entities/usuario.entity';
import { TipoMovimiento } from '../enums/tipo-movimiento.enum';

const numericTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

/**
 * Historial inmutable de entradas/salidas de un registro de stock: un
 * movimiento no se edita ni se borra, corrige un error registrando el
 * movimiento contrario. `Inventario.cantidad` solo cambia a través de estos
 * movimientos (ver `StockService.registrarEntrada`/`registrarSalida`).
 */
@Entity('movimientos_stock')
@Index('movimientos_stock_inventario_idx', ['inventario'])
@Index('movimientos_stock_tipo_fecha_idx', ['tipo', 'fecha'])
export class MovimientoStock {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Inventario, {
    nullable: false,
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'inventario_id' })
  inventario: Inventario;

  @Column({
    type: 'enum',
    enum: TipoMovimiento,
    enumName: 'tipo_movimiento_stock',
  })
  tipo: TipoMovimiento;

  /** Siempre positiva; el signo lo determina `tipo`. */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  cantidad: number;

  @Column({ type: 'date' })
  fecha: string;

  /** Procedencia del stock en una entrada (compra, donación, proveedor…). */
  @Column({ type: 'varchar', length: 150, nullable: true })
  origen: string | null;

  /** Motivo de la salida (consumo, merma, traslado…). */
  @Column({ type: 'varchar', length: 200, nullable: true })
  motivo: string | null;

  @Column({ name: 'responsable_id', type: 'uuid' })
  responsableId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responsable_id' })
  responsable: Usuario;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
