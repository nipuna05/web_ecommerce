import { IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from "class-validator";

export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;

export class CreateProductDto {
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: "slug must be lowercase letters, numbers and dashes" })
  slug: string;

  @IsString()
  @Length(1, 150)
  name: string;

  @IsString()
  @Length(1, 60)
  category: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  price: number;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  weightKg: number;

  @IsString()
  @Length(1, 16)
  emoji: string;

  @IsString()
  @Length(1, 2000)
  description: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @Length(1, 150) name?: string;
  @IsOptional() @IsString() @Length(1, 60) category?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1_000_000) price?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) stock?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1000) weightKg?: number;
  @IsOptional() @IsString() @Length(1, 16) emoji?: string;
  @IsOptional() @IsString() @Length(1, 2000) description?: string;
}

export class UpdateStatusDto {
  @IsIn(ORDER_STATUSES as unknown as string[])
  status: string;
}
