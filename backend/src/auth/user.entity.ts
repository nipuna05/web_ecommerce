import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export type Role = "customer" | "admin";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  /** Never sent to clients (see AuthService.publicUser). */
  @Column()
  passwordHash: string;

  @Column({ default: "customer" })
  role: Role;

  @CreateDateColumn()
  createdAt: Date;
}
