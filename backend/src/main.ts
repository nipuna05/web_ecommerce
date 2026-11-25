import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  // Browsers allowed to call the API. Override with CORS_ORIGIN="https://a.com,https://b.com".
  const origins = (process.env.CORS_ORIGIN ?? "http://localhost:3000,https://nipuna05.github.io").split(",");
  app.enableCors({ origin: origins });
  return app;
}

if (require.main === module) {
  createApp().then(async (app) => {
    const port = Number(process.env.PORT ?? 4000);
    await app.listen(port);
    console.log(`API running on http://localhost:${port}/api`);
  });
}
