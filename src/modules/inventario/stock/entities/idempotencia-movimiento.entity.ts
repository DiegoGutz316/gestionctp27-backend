import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '../../../usuarios/entities/usuario.entity';
import { MovimientoStock } from './movimiento-stock.entity';

@Entity('idempotencia_movimientos_stock')
@Unique('uq_idempotencia_responsable_clave', ['responsableId', 'clave'])
@Unique('uq_idempotencia_movimiento', ['movimientoId'])
export class IdempotenciaMovimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'responsable_id', type: 'uuid' })
  responsableId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responsable_id' })
  responsable: Usuario;

  @Column({ type: 'uuid' })
  clave: string;

  @Column({ type: 'char', length: 64 })
  huella: string;

  @Column({ name: 'movimiento_id', type: 'integer', nullable: true })
  movimientoId: number | null;

  @ManyToOne(() => MovimientoStock, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'movimiento_id' })
  movimiento: MovimientoStock | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
