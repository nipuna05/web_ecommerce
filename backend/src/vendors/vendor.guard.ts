import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import type { AuthedRequest } from "../auth/auth.guard";
import { Vendor } from "./vendor.entity";
import { VendorsService } from "./vendors.service";

export type VendorRequest = AuthedRequest & { vendor?: Vendor };

/** Requires a login whose vendor account is approved. Suspended or pending vendors are refused. */
@Injectable()
export class VendorGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly vendors: VendorsService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<VendorRequest>();
    const h = req.headers.authorization;
    const user = h?.startsWith("Bearer ") ? await this.auth.verify(h.slice(7)) : null;
    if (!user) throw new UnauthorizedException("Please sign in");
    req.user = user;
    const vendor = await this.vendors.mine(user.id);
    if (!vendor || vendor.status !== "approved") {
      throw new ForbiddenException("Your vendor account is not approved");
    }
    req.vendor = vendor;
    return true;
  }
}
