import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "node:crypto";
import { In, Repository } from "typeorm";
import { User } from "../auth/user.entity";
import { Order } from "../orders/order.entity";
import { Product } from "../products/product.entity";
import { Vendor, VendorStatus } from "./vendor.entity";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor) private readonly vendors: Repository<Vendor>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
  ) {}

  mine(userId: string) {
    return this.vendors.findOne({ where: { userId } });
  }

  async apply(userId: string, shopName: string, description: string) {
    if (await this.mine(userId)) throw new ConflictException("You already have a vendor application");
    const base = slugify(shopName) || "shop";
    let slug = base;
    while (await this.vendors.findOne({ where: { slug } })) slug = `${base}-${randomBytes(2).toString("hex")}`;
    return this.vendors.save(
      this.vendors.create({ userId, shopName: shopName.trim(), slug, description: description.trim(), status: "pending" }),
    );
  }

  /** Public shop page data. Only approved vendors, only active products. */
  async publicShop(slug: string) {
    const v = await this.vendors.findOne({ where: { slug, status: "approved" } });
    if (!v) throw new NotFoundException("Shop not found");
    const products = await this.products.find({ where: { vendorId: v.id, active: true }, order: { name: "ASC" } });
    return {
      shop: { name: v.shopName, slug: v.slug, description: v.description },
      products: products.map(({ vendorId, ...p }) => ({ ...p, vendor: { name: v.shopName, slug: v.slug } })),
    };
  }

  /** Orders that contain this vendor's items, showing only those items. */
  async ordersFor(vendorId: string) {
    return this.orders
      .createQueryBuilder("o")
      .leftJoinAndSelect("o.items", "i")
      .where("i.vendorId = :vendorId", { vendorId })
      .orderBy("o.createdAt", "DESC")
      .getMany();
  }

  // ---- admin ----
  async listForAdmin() {
    const all = await this.vendors.find({ order: { createdAt: "DESC" } });
    const owners = all.length ? await this.users.find({ where: { id: In(all.map((v) => v.userId)) } }) : [];
    const byId = new Map(owners.map((u) => [u.id, u]));
    return all.map((v) => ({
      id: v.id,
      shopName: v.shopName,
      slug: v.slug,
      description: v.description,
      status: v.status,
      createdAt: v.createdAt,
      ownerName: byId.get(v.userId)?.name,
      ownerEmail: byId.get(v.userId)?.email,
    }));
  }

  async setStatus(id: string, status: VendorStatus) {
    const v = await this.vendors.findOne({ where: { id } });
    if (!v) throw new NotFoundException("Vendor not found");
    if (!["pending", "approved", "rejected", "suspended"].includes(status)) throw new BadRequestException("Bad status");
    v.status = status;
    return this.vendors.save(v);
  }
}
