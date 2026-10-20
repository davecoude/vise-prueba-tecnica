import {
  Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from "typeorm"

import { decimalTransformer } from "../../../common/transformers/decimal.transformer"
import { Category } from "../../categories/entities/category.entity"

@Entity('products')
// invariantes de dominio garantizadas por la BD
@Check('CHK_products_stock_non_negative', '"stock" >= 0')
@Check('CHK_products_price_non_negative', '"price" >= 0')
export class Product {
  
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'varchar', length: 150 })
  name!: string

  @Index('UQ_products_sku', { unique: true })
  @Column({ type: 'varchar', length: 50 })
  sku!: string

  // FK expuesta para filtrar por categoria sin JOIN
  @Index('IDX_products_category_id')
  @Column({ name: 'category_id', type: 'int' })
  categoryId!: number

  // no se puede borrar una categoria que tenga productos
  @ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: Category

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  price!: number

  // cambios atraves de movimientos(kardex), nunca por el crud
  @Column({ type: 'int', default: 0 })
  stock!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}