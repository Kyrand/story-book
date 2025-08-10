// Check database content
import { getDatabase } from "../src/lib/db/schema.js";

function checkDatabase() {
  const db = getDatabase();

  if (!db) {
    console.log("❌ Database not available");
    return;
  }

  console.log("✅ Database connection successful!\n");

  // Check users
  try {
    const users = db
      .prepare("SELECT id, email, name, emailVerified FROM user")
      .all();
    console.log("👥 Users in database:");
    console.table(users);

    // Check books
    const books = db
      .prepare("SELECT id, title, author, total_pages FROM books")
      .all();
    console.log("\n📚 Books in database:");
    console.table(books);

    // Check accounts (for auth)
    const accounts = db
      .prepare("SELECT id, providerId, userId FROM account")
      .all();
    console.log("\n🔐 Auth accounts:");
    console.table(accounts);
  } catch (error) {
    console.error("❌ Error querying database:", error);
  }

  db.close();
}

checkDatabase();
