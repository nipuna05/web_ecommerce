import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { randomBytes } from "node:crypto";
import { DataSource } from "typeorm";
import { orderTotals, regions } from "../pricing";
import { Product } from "../products/product.entity";
import { CreateOrderDto } from "./create-order.dto";
import { Order, OrderItem } from "./order.entity";

@Injectable()
export class OrdersService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async create(dto: CreateOrderDto) {
    const region = regions.find((r) => r.code === dto.regionCode);
    if (!region) throw new BadRequestException("Unsupported delivery country");
    const zone = region.zones.find((z) => z.code === dto.zoneCode);
    if (!zone) throw new BadRequestException("Unsupported delivery area for this country");

    // Merge duplicate lines so the stock check is per product.
    const wanted = new Map<string, number>();
    for (const l of dto.items) wanted.set(l.slug, (wanted.get(l.slug) ?? 0) + l.qty);

    return this.ds.transaction(async (m) => {
      const items: OrderItem[] = [];
      let subtotal = 0;
      let weightKg = 0;

      for (const [slug, qty] of wanted) {
        const p = await m.findOne(Product, { where: { slug } });
        if (!p) throw new BadRequestException(`Unknown product: ${slug}`);
        // Atomic stock decrement: only succeeds if enough stock remains.
        const res = await m
          .createQueryBuilder()
          .update(Product)
          .set({ stock: () => "stock - :qty" })
          .where("id = :id AND stock >= :qty", { id: p.id, qty })
          .execute();
        if (!res.affected) throw new BadRequestException(`Not enough stock for ${p.name}`);

        subtotal += p.price * qty;
        weightKg += p.weightKg * qty;
        items.push(m.create(OrderItem, { productSlug: p.slug, name: p.name, unitPrice: p.price, qty }));
      }

      const { subtotal: sub, tax, shipping, total } = orderTotals(subtotal, weightKg, region, zone, dto.shippingMethod === "express");
      const order = m.create(Order, {
        code: "ORD-" + randomBytes(5).toString("hex").toUpperCase(),
        customerName: dto.name,
        email: dto.email.toLowerCase(),
        address: dto.address,
        regionCode: region.code,
        zoneCode: zone.code,
        weightKg: Math.round(weightKg * 100) / 100,
        shippingMethod: dto.shippingMethod,
        subtotal: sub,
        tax,
        shipping,
        total,
        items,
      });
      return m.save(order);
    });
  }

  /** Look up an order by code; the email must match so codes alone don't expose customer data. */
  async find(code: string, email: string) {
    const order = await this.ds.getRepository(Order).findOne({ where: { code } });
    if (!order || order.email !== (email ?? "").toLowerCase()) throw new NotFoundException("Order not found");
    return order;
  }
}
