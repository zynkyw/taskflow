import { randomBytes } from "crypto";

/**
 * Generates a short, URL-safe, collision-resistant id.
 * Format: <prefix>_<10 random base36 chars>
 */
export function generateId(prefix: string): string {
  const bytes = randomBytes(8);
  const random = BigInt(`0x${bytes.toString("hex")}`).toString(36).slice(0, 10);
  return `${prefix}_${random}`;
}

export function isValidId(id: string, prefix: string): boolean {
  const pattern = new RegExp(`^${prefix}_[a-z0-9]{1,10}$`);
  return pattern.test(id);
}
