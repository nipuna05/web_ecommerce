import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Vendor } from "../vendors/vendor.entity";
import { Product } from "./product.entity";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  imports: [TypeOrmModule.forFeature([Product, Vendor])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
