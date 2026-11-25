import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

const money = { to: (v: number) => v, from: (v: string | number) => Number(v) };

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column("decimal", { precision: 10, scale: 2, transformer: money })
  price: number;

  @Column("decimal", { precision: 2, scale: 1, transformer: money })
  rating: number;

  @Column("int")
  reviews: number;

  @Column("int")
  stock: number;

  @Column("decimal", { precision: 6, scale: 2, default: 0.5, transformer: money })
  weightKg: number;

  @Column()
  emoji: string;

  @Column("text")
  description: string;
}
