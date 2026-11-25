import { BadRequestException, Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminGuard } from "../auth/auth.guard";
import { Order } from "../orders/order.entity";
import { OrdersService } from "../orders/orders.service";
import { Product } from "../products/product.entity";
import { VendorStatusDto } from "../vendors/vendors.dto";
import { VendorsService } from "../vendors/vendors.service";
import { CreateProductDto, UpdateProductDto, UpdateStatusDto } from "./admin.dto";

/** Everything under /api/admin requires a signed-in admin. */
@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly orders: OrdersService,
    private readonly vendors: VendorsService,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
  ) {}

  @Get("stats")
  async stats() {
    const orders = await this.orderRepo.find();
    const live = orders.filter((o) => o.status !== "cancelled");
    const lowStock = await this.products
      .createQueryBuilder("p")
      .where("p.stock <= :n", { n: 5 })
      .orderBy("p.stock", "ASC")
      .getMany();
    return {
      orders: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      revenue: Math.round(live.reduce((s, o) => s + o.total, 0) * 100) / 100,
      lowStock: lowStock.map((p) => ({ slug: p.slug, name: p.name, stock: p.stock })),
    };
  }

  /** All products including hidden ones and vendors' products (the public list hides those). */
  @Get("products")
  listProducts() {
    return this.products.find({ order: { name: "ASC" } });
  }

  @Get("vendors")
  listVendors() {
    return this.vendors.listForAdmin();
  }

  @Patch("vendors/:id/status")
  setVendorStatus(@Param("id") id: string, @Body() dto: VendorStatusDto) {
    return this.vendors.setStatus(id, dto.status);
  }

  @Get("orders")
  listOrders() {
    return this.orders.listAll();
  }

  @Patch("orders/:code/status")
  setStatus(@Param("code") code: string, @Body() dto: UpdateStatusDto) {
    return this.orders.setStatus(code, dto.status);
  }

  @Post("products")
  async createProduct(@Body() dto: CreateProductDto) {
    if (await this.products.findOne({ where: { slug: dto.slug } })) {
      throw new ConflictException("A product with this slug already exists");
    }
    return this.products.save(this.products.create({ ...dto, rating: 0, reviews: 0 }));
  }

  @Patch("products/:slug")
  async updateProduct(@Param("slug") slug: string, @Body() dto: UpdateProductDto) {
    const p = await this.products.findOne({ where: { slug } });
    if (!p) throw new NotFoundException("Product not found");
    if (Object.keys(dto).length === 0) throw new BadRequestException("Nothing to update");
    Object.assign(p, dto);
    return this.products.save(p);
  }

  @Delete("products/:slug")
  async deleteProduct(@Param("slug") slug: string) {
    const res = await this.products.delete({ slug });
    if (!res.affected) throw new NotFoundException("Product not found");
    return { deleted: slug };
  }
}
