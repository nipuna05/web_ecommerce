import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class OrderLineDto {
  @IsString()
  @Length(1, 100)
  slug: string;

  @IsInt()
  @Min(1)
  @Max(99)
  qty: number;
}

export class CreateOrderDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsEmail()
  @Length(3, 200)
  email: string;

  @IsString()
  @Length(5, 500)
  address: string;

  @IsString()
  @Length(2, 2)
  regionCode: string;

  @IsString()
  @Length(1, 20)
  zoneCode: string;

  @IsIn(["standard", "express"])
  shippingMethod: "standard" | "express";

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items: OrderLineDto[];
}
