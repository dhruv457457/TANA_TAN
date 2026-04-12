import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) throw new Error("MONGODB_URI is not set in .env");

// Cache connection across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: typeof mongoose | null;
}

let cached = global._mongooseConn ?? null;

export async function connectDB() {
  if (cached) return cached;
  cached = await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  global._mongooseConn = cached;

  // Drop stale unique index on strategyId (removed from schema)
  try {
    const col = cached.connection.collection("strategies");
    const indexes = await col.indexes();
    if (indexes.some((i: { name?: string }) => i.name === "strategyId_1")) {
      await col.dropIndex("strategyId_1");
      console.log("Dropped stale strategyId_1 index");
    }
  } catch { /* collection may not exist yet */ }

  return cached;
}
