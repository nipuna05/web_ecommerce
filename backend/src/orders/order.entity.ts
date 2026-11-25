import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

const money = { to: (v: number) => v, from: (v: string | number) => Number(v) };

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  customerName: string;

  @Column()
  email: string;

  @Column("text")
  address: string;

  @Column()
  regionCode: string;

  @Column()
  shippingMethod: string;

  @Column("decimal", { precision: 10, scale: 2, transformer: money })
  subtotal: number;

  @Column("decimal", { precision: 10, scale: 2, transformer: money })
  tax: number;

  @Column("decimal", { precision: 10, scale: 2, transformer: money })
  shipping: number;

  @Column("decimal", { precision: 10, scale: 2, transformer: money })
  total: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true, eager: true })
  items: OrderItem[];
}

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: "CASCADE" })
  order: Order;

  @Column()
  productSlug: string;

  @Column()
  name: string;

  @Column("decimal", { precision: 10, scale: 2, transformer: money })
  unitPrice: number;

  @Column("int")
  qty: number;
}
