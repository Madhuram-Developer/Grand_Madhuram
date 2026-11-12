import mongoose from "mongoose";

const g = globalThis as unknown as { _mongo?: Promise<typeof mongoose> };

/** Single shared connection, survives dev HMR. */
export function db() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  return (g._mongo ??= mongoose.connect(uri));
}
