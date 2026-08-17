import { TipoProducto } from '../enums/tipo-producto.enum';
import { UnidadMedida } from '../enums/unidad-medida.enum';
import { Departamento } from '../enums/departamento.enum';
import { Ubicacion } from '../enums/ubicacion.enum';
import {
  Entity,
  Index,
  IndexOptions,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  UpdateDateColumn,
} from 'typeorm';
import { Inventario } from '../../stock/entities/inventario.entity';

// El índice único real es de expresión (lower(nombre) WHERE activo = true) y
// se crea a mano en la migración; synchronize:false evita que la CLI lo toque.
@Entity('productos')
@Index('uq_productos_nombre', ['nombre'], {
  unique: true,
  synchronize: false,
} as IndexOptions)
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({
    name: 'tipo_producto',
    type: 'enum',
    enum: TipoProducto,
    enumName: 'tipo_producto',
  })
  tipoProducto: TipoProducto;

  @Column({
    name: 'unidad_medida',
    type: 'enum',
    enum: UnidadMedida,
    enumName: 'unidad_medida',
  })
  unidadMedida: UnidadMedida;

  @Column({ type: 'enum', enum: Departamento, enumName: 'departamento' })
  departamento: Departamento;

  @Column({ type: 'enum', enum: Ubicacion, enumName: 'ubicacion' })
  ubicacion: Ubicacion;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  /**
   * Configuración y existencia actual del producto. La relación es opcional
   * mientras el producto todavía no haya sido configurado en inventario.
   */
  @OneToOne(() => Inventario, (inventario) => inventario.producto)
  stock?: Inventario | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
