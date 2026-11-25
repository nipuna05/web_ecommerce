import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { User } from "../auth/user.entity";
import { Order } from "../orders/order.entity";
import { Product } from "../products/product.entity";
import { VendorGuard } from "./vendor.guard";
import { Vendor } from "./vendor.entity";
import { VendorPortalController, VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";

@Module({
  imports: [TypeOrmModule.forFeature([Vendor, User, Product, Order]), AuthModule],
  controllers: [VendorsController, VendorPortalController],
  providers: [VendorsService, VendorGuard],
  exports: [VendorsService],
})
export class VendorsModule {}
