import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { LoginDto, RegisterDto } from "./auth.dto";
import { AuthGuard, type AuthedRequest } from "./auth.guard";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto, @Req() req: AuthedRequest) {
    return this.auth.register(dto, req.ip ?? "unknown");
  }

  @Post("login")
  login(@Body() dto: LoginDto, @Req() req: AuthedRequest) {
    return this.auth.login(dto, req.ip ?? "unknown");
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() req: AuthedRequest) {
    return req.user;
  }
}
