import { Module } from "@nestjs/common";
import { TypeOrmModule, type TypeOrmModuleOptions } from "@nestjs/typeorm";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { User } from "./auth/user.entity";
import { Order, OrderItem } from "./orders/order.entity";
import { OrdersModule } from "./orders/orders.module";
import { Product } from "./products/product.entity";
import { Vendor } from "./vendors/vendor.entity";
import { VendorsModule } from "./vendors/vendors.module";
import { ProductsModule } from "./products/products.module";

const entities = [Product, Order, OrderItem, User, Vendor];

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
    // DB_SSL=true for hosted databases that require TLS (use the host's connection string in DATABASE_URL).
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    synchronize: process.env.DB_SYNC !== "false",
  };
}

@Module({
  imports: [TypeOrmModule.forRoot(dbOptions()), AuthModule, ProductsModule, OrdersModule, VendorsModule, AdminModule],
})
export class AppModule {}
