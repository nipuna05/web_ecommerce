import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { Repository } from "typeorm";
import { LoginDto, RegisterDto } from "./auth.dto";
import { hashPassword, verifyPassword } from "./password";
import { Role, User } from "./user.entity";

export type AuthUser = { id: string; email: string; name: string; role: Role };

const TOKEN_TTL = "12h";
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly log = new Logger("Auth");
  private readonly secret: string;
  private readonly fails = new Map<string, { n: number; reset: number }>();
  private dummyHash?: string;

  constructor(@InjectRepository(User) private readonly users: Repository<User>) {
    const s = process.env.JWT_SECRET;
    if (!s && process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set in production");
    }
    if (!s) this.log.warn("JWT_SECRET not set: using a random secret. Logins reset on every restart.");
    this.secret = s ?? randomBytes(32).toString("hex");
  }

  /** Optionally create the first admin from ADMIN_EMAIL / ADMIN_PASSWORD (never a built-in default). */
  async onModuleInit() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;
    if (password.length < 8) {
      this.log.error("ADMIN_PASSWORD must be at least 8 characters; admin not created.");
      return;
    }
    if (await this.users.findOne({ where: { email } })) return;
    await this.users.save(
      this.users.create({ email, name: "Admin", passwordHash: await hashPassword(password), role: "admin" }),
    );
    this.log.log(`Admin account created for ${email}`);
  }

  publicUser(u: User): AuthUser {
    return { id: u.id, email: u.email, name: u.name, role: u.role };
  }

  private sign(u: User) {
    return jwt.sign({ sub: u.id, role: u.role }, this.secret, { expiresIn: TOKEN_TTL });
  }

  async register(dto: RegisterDto, ip: string) {
    this.throttle(ip, "register", 20);
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException("An account with this email already exists");
    }
    const user = await this.users.save(
      this.users.create({ email, name: dto.name.trim(), passwordHash: await hashPassword(dto.password), role: "customer" }),
    );
    return { token: this.sign(user), user: this.publicUser(user) };
  }

  async login(dto: LoginDto, ip: string) {
    const email = dto.email.trim().toLowerCase();
    const key = `${ip}|${email}`;
    this.throttle(key, "login", MAX_FAILS, true);

    const user = await this.users.findOne({ where: { email } });
    // Verify against a dummy hash when the user is unknown so timing doesn't reveal which emails exist.
    this.dummyHash ??= await hashPassword("dummy-password");
    const ok = await verifyPassword(dto.password, user?.passwordHash ?? this.dummyHash);
    if (!user || !ok) {
      this.recordFail(key);
      throw new UnauthorizedException("Invalid email or password");
    }
    this.fails.delete(key);
    return { token: this.sign(user), user: this.publicUser(user) };
  }

  /** Verify a bearer token and load the current user (so deleted users or role changes apply at once). */
  async verify(token: string): Promise<AuthUser | null> {
    try {
      const p = jwt.verify(token, this.secret) as jwt.JwtPayload;
      const user = await this.users.findOne({ where: { id: String(p.sub) } });
      return user ? this.publicUser(user) : null;
    } catch {
      return null;
    }
  }

  // --- tiny in-memory rate limiter (per process; use Redis when running several instances) ---
  private throttle(key: string, scope: string, max: number, failuresOnly = false) {
    const k = `${scope}:${key}`;
    const now = Date.now();
    const e = this.fails.get(failuresOnly ? key : k);
    if (e && e.reset > now && e.n >= max) {
      throw new HttpException("Too many attempts. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!failuresOnly) {
      this.fails.set(k, e && e.reset > now ? { n: e.n + 1, reset: e.reset } : { n: 1, reset: now + WINDOW_MS });
    }
  }

  private recordFail(key: string) {
    const now = Date.now();
    const e = this.fails.get(key);
    this.fails.set(key, e && e.reset > now ? { n: e.n + 1, reset: e.reset } : { n: 1, reset: now + WINDOW_MS });
  }
}
