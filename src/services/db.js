const mongoose = require("mongoose");
const dns = require("dns");

// Some ISP/router DNS servers refuse SRV lookups, which breaks `mongodb+srv://`
// with "querySrv ECONNREFUSED". Force reliable public DNS resolvers so the
// driver's SRV/TXT resolution works regardless of the system DNS.
try {
  const servers = (process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (servers.length) dns.setServers(servers);
} catch (error) {
  // ignore — fall back to system DNS
}

// Cache the connection across serverless invocations (Vercel) so we don't
// open a new connection on every request.
let cached = global.__mongoose;
if (!cached) {
  cached = global.__mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to your environment.");
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        family: 4 // prefer IPv4 (some networks break on IPv6)
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    // Reset so the NEXT request retries instead of reusing the failed promise.
    cached.promise = null;
    throw error;
  }
};

// True when a MongoDB URI is configured; lets the app run in guest-only mode
// (no DB) when it isn't.
const isDbConfigured = () => Boolean(process.env.MONGODB_URI);

module.exports = { connectDB, isDbConfigured };
