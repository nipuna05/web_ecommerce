import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export type VendorStatus = "pending" | "approved" | "rejected" | "suspended";

/** A seller account. Belongs to one user; can list products only while approved. */
@Entity("vendors")
export class Vendor {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column()
  shopName: string;

  @Column({ unique: true })
  slug: string;

  @Column("text")
  description: string;

  @Column({ default: "pending" })
  status: VendorStatus;

  @CreateDateColumn()
  createdAt: Date;
}
