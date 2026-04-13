import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) throw new Error("MONGODB_URI is not set in .env");

// Cache connection across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: typeof mongoose | null;
}

let cached = global._mongooseConn ?? null;
let connecting = false;

export async function connectDB() {
  // Already connected
  if (cached?.connection.readyState === 1) return cached;
  
  // Already connecting, wait for it
  if (connecting) {
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (cached?.connection.readyState === 1) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      // Timeout after 30s
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 30000);
    });
    return cached;
  }
  
  connecting = true;
  try {
    // Clear stale connection if exists
    if (cached) {
      try {
        await mongoose.disconnect();
      } catch { /* ignore */ }
      cached = null;
    }
    
    cached = await mongoose.connect(MONGODB_URI, { 
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    global._mongooseConn = cached;
    console.log("[DB] Connected to MongoDB");

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
  } finally {
    connecting = false;
  }
}
