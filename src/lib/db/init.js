// Database initialization utility
import { initializeDatabase, seedDatabase } from "./schema.js";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

export async function ensureDatabase() {
  // Ensure data directory exists
  const dataDir = join(process.cwd(), "data");
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log("📁 Created data directory");
  }

  // Initialize database schema
  const db = initializeDatabase();

  // Seed with test data
  await seedDatabase();

  console.log("🗄️ Database ready");
  return db;
}
