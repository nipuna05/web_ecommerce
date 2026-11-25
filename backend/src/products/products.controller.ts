import { Controller, Get, Param, Query } from "@nestjs/common";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query("search") search?: string, @Query("category") category?: string) {
    return this.products.list(search, category);
  }

  @Get(":slug")
  one(@Param("slug") slug: string) {
    return this.products.bySlug(slug);
  }
}
