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
import { Insumo } from './insumo.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { TipoMovimiento } from '../enums/tipo-movimiento.enum';

// Postgres devuelve las columnas numeric como string; se exponen como number.
const numericTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

/**
 * Backlog 4.4 - Task de BD: "Crear tabla de movimientos de inventario".
 *
 * Historial inmutable: un movimiento no se edita ni se borra, porque es la
 * bitácora que explica cómo llegó el insumo a su cantidad actual. Corregir un
 * error implica registrar el movimiento contrario.
 *
 * synchronize está en false: debe coincidir con la migración
 * 1787000000000-MovimientosInventario.ts.
 */
@Entity('movimientos_inventario')
@Index('movimientos_insumo_idx', ['insumo'])
@Index('movimientos_tipo_fecha_idx', ['tipo', 'fecha'])
export class MovimientoInventario {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Insumo, {
    nullable: false,
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'insumo_id' })
  insumo: Insumo;

  @Column({
    type: 'enum',
    enum: TipoMovimiento,
    enumName: 'tipo_movimiento',
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

  /**
   * Fecha en que ocurrió el movimiento, la indica quien lo registra. Es
   * distinta de `creadoEn` (cuándo se capturó en el sistema): una entrega del
   * viernes se puede registrar el lunes.
   */
  @Column({ type: 'date' })
  fecha: string;

  /**
   * De dónde provino el insumo (compra, donación, proveedor…). Solo aplica a
   * las entradas; lo consulta el backlog 4.5 para "identificar el origen de
   * los ingresos registrados".
   */
  @Column({ type: 'varchar', length: 150, nullable: true })
  origen: string | null;

  /** Motivo de la salida. Se usará en el backlog 4.6. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  motivo: string | null;

  /**
   * Usuario responsable de la operación, tomado del JWT. A diferencia de
   * `insumos.creado_por`, aquí sí es NOT NULL: el historial no tiene sentido
   * sin saber quién movió el stock.
   */
  @Column({ name: 'responsable_id', type: 'uuid' })
  responsableId: string;

  /**
   * Backlog 4.5: la consulta debe mostrar el responsable con nombre, no con su
   * uuid. Se resuelve con este join porque el frontend no puede consultarlo por
   * su cuenta: quien tiene permiso de inventario no necesariamente lo tiene
   * sobre el módulo de usuarios.
   *
   * `eager: false` a propósito: solo se carga en los listados que lo muestran.
   * La columna y su clave foránea ya existen desde la migración del 4.4, así
   * que declarar la relación no requiere una migración nueva.
   */
  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responsable_id' })
  responsable: Usuario;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
