import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

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

  /** Owning vendor; null = sold by the store itself. */
  @Column({ type: "varchar", nullable: true })
  vendorId: string | null;

  /** false = hidden from the shop (by the vendor or an admin). */
  @Column({ default: true })
  active: boolean;

  /**
   * Review state. Store products and anything created before this existed are "approved".
   * New vendor products start "pending" and are not public until an admin approves them.
   */
  @Column({ default: "approved" })
  approvalStatus: "pending" | "approved" | "rejected";

  /** Moderation hide. Only admins can change it; a vendor cannot undo it. */
  @Column({ default: false })
  hiddenByAdmin: boolean;

  /** Shown as "last updated" so buyers can spot abandoned listings. */
  @UpdateDateColumn()
  updatedAt: Date;
}
