import { IsIn, IsString, Length } from "class-validator";

export class ApplyVendorDto {
  @IsString()
  @Length(2, 60)
  shopName: string;

  @IsString()
  @Length(10, 1000)
  description: string;
}

export class VendorStatusDto {
  @IsIn(["pending", "approved", "rejected", "suspended"])
  status: "pending" | "approved" | "rejected" | "suspended";
}
