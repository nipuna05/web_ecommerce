import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { AuthService, type AuthUser } from "./auth.service";

export type AuthedRequest = Request & { user?: AuthUser };

async function attachUser(auth: AuthService, req: AuthedRequest) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return;
  const user = await auth.verify(h.slice(7));
  if (user) req.user = user;
}

/** Requires a valid login. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    await attachUser(this.auth, req);
    if (!req.user) throw new UnauthorizedException("Please sign in");
    return true;
  }
}

/** Attaches the user if a valid token is sent, but allows guests. */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(ctx: ExecutionContext) {
    await attachUser(this.auth, ctx.switchToHttp().getRequest<AuthedRequest>());
    return true;
  }
}

/** Requires a login with the admin role. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    await attachUser(this.auth, req);
    if (!req.user) throw new UnauthorizedException("Please sign in");
    if (req.user.role !== "admin") throw new ForbiddenException("Admins only");
    return true;
  }
}
