import {
  Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm"
import { Product } from "../../products/entities/product.entity"

export enum MovementType {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
}

@Entity('movements')
// indice compuesto alineado con la consulta del kardex:
@Index('IDX_movements_product_date', ['productId', 'date', 'id'])
@Check('CHK_movements_quantity_positive', '"quantity" > 0')
@Check('CHK_movements_balance_non_negative', '"balance_after" >= 0')
export class Movement {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  // un producto con historial no se puede eliminar
  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ type: 'enum', enum: MovementType, enumName: 'movement_type' })
  type!: MovementType;

  @Column({ type: 'int' })
  quantity!: number;

  // saldo del producto inmediatamente despues de este movimiento
  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  date!: Date;
}