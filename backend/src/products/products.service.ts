import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Vendor } from "../vendors/vendor.entity";
import { Product } from "./product.entity";
import { seedProducts } from "./seed-data";

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
    @InjectRepository(Vendor) private readonly vendors: Repository<Vendor>,
  ) {}

  async onModuleInit() {
    if ((await this.repo.count()) === 0) {
      await this.repo.save(seedProducts.map((p) => this.repo.create(p)));
    }
  }

  /**
   * Public view: drops hidden products and products of vendors that are not approved,
   * and replaces the internal vendorId with { name, slug } for "Sold by".
   */
  private async publicView(list: Product[]) {
    const ids = [...new Set(list.map((p) => p.vendorId).filter((x): x is string => !!x))];
    const vs = ids.length ? await this.vendors.find({ where: { id: In(ids) } }) : [];
    const byId = new Map(vs.map((v) => [v.id, v]));
    return list
      .filter((p) => p.active && !p.hiddenByAdmin && p.approvalStatus === "approved" && (!p.vendorId || byId.get(p.vendorId)?.status === "approved"))
      .map(({ vendorId, ...p }) => {
        const v = vendorId ? byId.get(vendorId) : undefined;
        return { ...p, vendor: v ? { name: v.shopName, slug: v.slug } : null };
      });
  }

  async list(search?: string, category?: string) {
    const all = await this.publicView(await this.repo.find({ order: { name: "ASC" } }));
    const q = (search ?? "").trim().toLowerCase();
    return all.filter(
      (p) =>
        (!category || category === "All" || p.category === category) &&
        (!q || `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q)),
    );
  }

  async bySlug(slug: string) {
    const p = await this.repo.findOne({ where: { slug } });
    const [view] = p ? await this.publicView([p]) : [];
    if (!view) throw new NotFoundException("Product not found");
    return view;
  }
}
