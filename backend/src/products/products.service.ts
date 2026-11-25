import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "./product.entity";
import { seedProducts } from "./seed-data";

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(@InjectRepository(Product) private readonly repo: Repository<Product>) {}

  async onModuleInit() {
    if ((await this.repo.count()) === 0) {
      await this.repo.save(seedProducts.map((p) => this.repo.create(p)));
    }
  }

  async list(search?: string, category?: string) {
    const all = await this.repo.find({ order: { name: "ASC" } });
    const q = (search ?? "").trim().toLowerCase();
    return all.filter(
      (p) =>
        (!category || category === "All" || p.category === category) &&
        (!q || `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q)),
    );
  }

  async bySlug(slug: string) {
    const p = await this.repo.findOne({ where: { slug } });
    if (!p) throw new NotFoundException("Product not found");
    return p;
  }
}
