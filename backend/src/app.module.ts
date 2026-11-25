import { Module } from "@nestjs/common";
import { TypeOrmModule, type TypeOrmModuleOptions } from "@nestjs/typeorm";
import { Order, OrderItem } from "./orders/order.entity";
import { OrdersModule } from "./orders/orders.module";
import { Product } from "./products/product.entity";
import { ProductsModule } from "./products/products.module";

const entities = [Product, Order, OrderItem];

/**
 * DB_TYPE=postgres (default): uses DATABASE_URL, or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME.
 * DB_TYPE=sqljs: in-memory database for quick local runs and tests (data is lost on restart).
 * `synchronize` auto-creates tables, which is fine for development. Use migrations before production.
 */
function dbOptions(): TypeOrmModuleOptions {
  if (process.env.DB_TYPE === "sqljs") {
    return { type: "sqljs", entities, synchronize: true, autoSave: false };
  }
  return {
    type: "postgres",
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER ?? "ecommerce",
    password: process.env.DB_PASSWORD ?? "ecommerce",
    database: process.env.DB_NAME ?? "ecommerce",
    entities,
    synchronize: process.env.DB_SYNC !== "false",
  };
}

@Module({
  imports: [TypeOrmModule.forRoot(dbOptions()), ProductsModule, OrdersModule],
})
export class AppModule {}
