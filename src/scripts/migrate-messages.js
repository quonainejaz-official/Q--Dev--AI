/**
 * Migration script: embedded messages[] → Message collection.
 *
 * Run with: node src/scripts/migrate-messages.js
 *
 * This script:
 * 1. Finds all Chat documents that have embedded messages.
 * 2. Copies each message into the Message collection with chatId + userId.
 * 3. Updates chat.messageCount and removes the embedded messages array.
 *
 * Idempotent: skips chats with messageCount > 0 and no embedded messages.
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required. Set it in .env or environment.");
  process.exit(1);
}

// Inline schemas to avoid importing app models (may have side effects).
const chatSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Chat = mongoose.model("Chat_migrate", chatSchema, "chats");

const messageSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Message = mongoose.model("Message_migrate", messageSchema, "messages");

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log("[migrate] Connected to MongoDB.");

  // Find chats with embedded messages (legacy format).
  const chats = await Chat.find({ messages: { $exists: true, $ne: [] } }).lean();
  console.log(`[migrate] Found ${chats.length} chats with embedded messages.`);

  let migrated = 0;
  let skipped = 0;
  let totalMessages = 0;

  for (const chat of chats) {
    if (!chat.messages || !chat.messages.length) {
      skipped++;
      continue;
    }

    // Check if messages already exist in the Message collection.
    const existingCount = await Message.countDocuments({ chatId: chat._id });
    if (existingCount > 0) {
      console.log(`[migrate] Chat ${chat._id} already has ${existingCount} messages in Message collection. Skipping.`);
      skipped++;
      continue;
    }

    // Copy messages to Message collection.
    const docs = chat.messages.map((m) => ({
      chatId: chat._id,
      userId: chat.userId,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      images: m.images,
      audios: m.audios,
      videos: m.videos,
      pdfs: m.pdfs,
      model: m.model,
      tokensIn: m.tokensIn,
      tokensOut: m.tokensOut,
      finishReason: m.finishReason
    }));

    await Message.insertMany(docs);

    // Update chat: set messageCount, remove embedded messages.
    await Chat.updateOne(
      { _id: chat._id },
      {
        $set: { messageCount: docs.length },
        $unset: { messages: "" }
      }
    );

    totalMessages += docs.length;
    migrated++;
    console.log(`[migrate] Chat ${chat._id}: migrated ${docs.length} messages.`);
  }

  console.log(`[migrate] Done. ${migrated} chats migrated, ${skipped} skipped. ${totalMessages} total messages moved.`);
  await mongoose.disconnect();
  console.log("[migrate] Disconnected.");
}

migrate().catch((err) => {
  console.error("[migrate] Fatal error:", err);
  process.exit(1);
});
