import { IsEmail, IsString, Length } from "class-validator";

export class RegisterDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsEmail()
  @Length(3, 200)
  email: string;

  @IsString()
  @Length(8, 128)
  password: string;
}

export class LoginDto {
  @IsEmail()
  @Length(3, 200)
  email: string;

  @IsString()
  @Length(1, 128)
  password: string;
}
