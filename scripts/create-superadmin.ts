// Usage: npm run create-superadmin -- <username>
// Creates (or resets) a superadmin and prints a one-time password.
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { db } from "../lib/db";
import { User } from "../lib/models";

async function main() {
  const username = (process.argv[2] ?? "").toLowerCase().trim();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("Usage: npm run create-superadmin -- <username> (3-32 chars a-z 0-9 . _ -)");
  await db();
  const password = randomBytes(12).toString("base64url");
  await User.findOneAndUpdate(
    { username },
    { username, passwordHash: await bcrypt.hash(password, 12), role: "superadmin", permissions: [], active: true },
    { upsert: true },
  );
  console.log(`Superadmin "${username}" ready. Password (shown once): ${password}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
