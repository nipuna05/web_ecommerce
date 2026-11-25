import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateProductDto, UpdateProductDto } from "../admin/admin.dto";
import { AuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { Product } from "../products/product.entity";
import { ApplyVendorDto } from "./vendors.dto";
import { VendorGuard, type VendorRequest } from "./vendor.guard";
import { VendorsService } from "./vendors.service";

/** Public shop pages and the signed-in user's own vendor application. */
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  /** The platform's flat seller fee (percent of the item price). Set COMMISSION_PERCENT; default 5 (demo value). */
  @Get("fees")
  fees() {
    const n = Number(process.env.COMMISSION_PERCENT ?? 5);
    return { percent: Number.isFinite(n) && n >= 0 && n <= 50 ? n : 5 };
  }

  @Post("apply")
  @UseGuards(AuthGuard)
  apply(@Body() dto: ApplyVendorDto, @Req() req: AuthedRequest) {
    return this.vendors.apply(req.user!.id, dto.shopName, dto.description);
  }

  /** Returns the caller's vendor record, or null if they have not applied. */
  @Get("me")
  @UseGuards(AuthGuard)
  async me(@Req() req: AuthedRequest) {
    return (await this.vendors.mine(req.user!.id)) ?? null;
  }

  @Get("shop/:slug")
  shop(@Param("slug") slug: string) {
    return this.vendors.publicShop(slug);
  }
}

/** The vendor's own dashboard API. Every action is limited to that vendor's own products and orders. */
@Controller("vendor")
@UseGuards(VendorGuard)
export class VendorPortalController {
  constructor(
    private readonly vendors: VendorsService,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  @Get("products")
  list(@Req() req: VendorRequest) {
    return this.products.find({ where: { vendorId: req.vendor!.id }, order: { name: "ASC" } });
  }

  @Post("products")
  async create(@Body() dto: CreateProductDto, @Req() req: VendorRequest) {
    if (await this.products.findOne({ where: { slug: dto.slug } })) {
      throw new ConflictException("A product with this slug already exists");
    }
    return this.products.save(
      this.products.create({ ...dto, rating: 0, reviews: 0, vendorId: req.vendor!.id, active: true }),
    );
  }

  @Patch("products/:slug")
  async update(@Param("slug") slug: string, @Body() dto: UpdateProductDto, @Req() req: VendorRequest) {
    const p = await this.products.findOne({ where: { slug, vendorId: req.vendor!.id } });
    if (!p) throw new NotFoundException("Product not found");
    if (Object.keys(dto).length === 0) throw new BadRequestException("Nothing to update");
    Object.assign(p, dto);
    return this.products.save(p);
  }

  @Delete("products/:slug")
  async remove(@Param("slug") slug: string, @Req() req: VendorRequest) {
    const res = await this.products.delete({ slug, vendorId: req.vendor!.id });
    if (!res.affected) throw new NotFoundException("Product not found");
    return { deleted: slug };
  }

  @Get("orders")
  orders(@Req() req: VendorRequest) {
    return this.vendors.ordersFor(req.vendor!.id);
  }
}
