// Initialize Story Book database with proper schema and test user
import { initializeDatabase, getDatabase } from "../src/lib/db/schema.js";
import { randomUUID } from "crypto";

async function createTestUser() {
  const db = getDatabase();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  try {
    // Check if test user already exists
    const existingUser = db
      .prepare("SELECT id FROM user WHERE email = ?")
      .get("kyran@storybook.test");

    if (existingUser) {
      console.log("ℹ️ Test user already exists, recreating...");
      // Delete existing user and related data
      db.prepare("DELETE FROM user WHERE email = ?").run(
        "kyran@storybook.test",
      );
    }

    // Create the test user directly in the database
    const userId = randomUUID();

    // Insert user (Better-Auth will handle password hashing via API)
    db.prepare(
      `
			INSERT INTO user (id, email, name, emailVerified)
			VALUES (?, ?, ?, ?)
		`,
    ).run(userId, "kyran@storybook.test", "kyran", 1);

    console.log("✅ Test user created in database: kyran@storybook.test");
    console.log("   User ID:", userId);
    console.log("   Use Better-Auth API to set password: storybook");

    return userId;
  } catch (error) {
    console.error("❌ Error creating test user:", error);
  }
}

async function main() {
  console.log("🚀 Initializing Story Book database...\n");

  // Initialize database schema
  const db = initializeDatabase();

  if (!db) {
    console.error("❌ Failed to initialize database");
    process.exit(1);
  }

  // Create test user
  await createTestUser();

  // Add sample books to database
  console.log("\n📚 Adding sample books...");

  const sampleBooks = [
    {
      title: "Pride and Prejudice",
      author: "Jane Austen",
      file_path: "pride_and_prejudice.txt",
      total_pages: 100,
    },
    {
      title: "Alice's Adventures in Wonderland",
      author: "Lewis Carroll",
      file_path: "alice_wonderland.txt",
      total_pages: 80,
    },
    {
      title: "Frankenstein",
      author: "Mary Shelley",
      file_path: "frankenstein.txt",
      total_pages: 120,
    },
  ];

  for (const book of sampleBooks) {
    const bookId = randomUUID();
    try {
      db.prepare(
        `
				INSERT INTO books (id, title, author, file_path, total_pages)
				VALUES (?, ?, ?, ?, ?)
			`,
      ).run(bookId, book.title, book.author, book.file_path, book.total_pages);

      console.log(`✅ Added book: ${book.title}`);
    } catch (error) {
      console.log(`ℹ️ Book already exists: ${book.title}`);
    }
  }

  console.log("\n✅ Database initialization complete!");
  console.log("\nNext steps:");
  console.log("1. Start the server: make dev");
  console.log(
    "2. Register the test user via the web interface to set the password",
  );
  console.log(
    "3. Or use the auth API directly to create the user with password",
  );

  db.close();
}

main().catch(console.error);
