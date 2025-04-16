import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Hash a password with a random salt
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const password = "manager123"; // Replace with the password you want to hash
  const hashedPassword = await hashPassword(password);
  console.log(`Password: ${password}`);
  console.log(`Hashed Password: ${hashedPassword}`);
}

main().catch(console.error);