import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

const scryptAsync = (pw: string, salt: Buffer, len: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(pw, salt, len, (err, key) => (err ? reject(err) : resolve(key))),
  );

/** Salted scrypt hash, stored as "scrypt$<salt hex>$<hash hex>". */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, saltHex, hashHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(pw, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}
