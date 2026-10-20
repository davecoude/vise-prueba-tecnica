import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity('users')
export class User {

  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string

  // el hash viaja explicitamente si se le pide, en un find()
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}