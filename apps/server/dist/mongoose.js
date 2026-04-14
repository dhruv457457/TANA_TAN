import mongoose from "mongoose";
const MONGODB_URI = process.env.MONGODB_URI
    ?? "mongodb+srv://dpancholipp123_db_user:Dhruv457@prediction.qptyt7b.mongodb.net/?appName=prediction";
let cached = global._mongoConnection;
if (!cached) {
    cached = null;
}
export async function connectDB() {
    if (cached?.connection.readyState === 1) {
        return cached;
    }
    cached = await mongoose.connect(MONGODB_URI);
    global._mongoConnection = cached;
    console.log("[DB] Connected to MongoDB");
    return cached;
}
export default mongoose;
