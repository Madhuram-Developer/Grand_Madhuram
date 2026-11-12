import mongoose from "mongoose";

const g = globalThis as unknown as { _mongo?: Promise<typeof mongoose> };

/** Single shared connection, survives dev HMR. A failed attempt is forgotten so the next request retries. */
export function db() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  // small pool per server instance (many instances share Atlas' connection limit); fail fast instead of 30s hangs
  return (g._mongo ??= mongoose.connect(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 }).catch((e) => {
    g._mongo = undefined; // don't cache a rejected promise (DB was down / starting)
    throw e;
  }));
}
