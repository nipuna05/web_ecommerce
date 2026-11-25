import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Order } from "../orders/order.entity";
import { OrdersModule } from "../orders/orders.module";
import { Product } from "../products/product.entity";
import { AdminController } from "./admin.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Product, Order]), AuthModule, OrdersModule],
  controllers: [AdminController],
})
export class AdminModule {}
