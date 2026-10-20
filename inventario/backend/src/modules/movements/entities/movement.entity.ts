import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

export enum MovementType {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
}

@Entity('movements')
// indice alineado con la consulta del kardex: WHERE product_id = ? ORDER BY id
@Index('IDX_movements_product_id_id', ['productId', 'id'])
@Check('CHK_movements_quantity_positive', '"quantity" > 0')
@Check('CHK_movements_balance_non_negative', '"balance_after" >= 0')
export class Movement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  // RESTRICT: un producto con historial no se puede eliminar (integridad del kardex)
  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ type: 'enum', enum: MovementType, enumName: 'movement_type' })
  type!: MovementType;

  @Column({ type: 'int' })
  quantity!: number;

  // saldo del producto inmediatamente después de este movimiento (snapshot)
  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note!: string | null;

  // clock_timestamp() = instante real del INSERT. now() devolvería el inicio de la
  // transacción, que puede ser anterior al momento en que se obtuvo el lock
  // → fechas desordenadas bajo concurrencia.
  /** Fecha y hora en que se registró el movimiento. */
  @CreateDateColumn({ type: 'timestamptz', default: () => 'clock_timestamp()' })
  date!: Date;
}
