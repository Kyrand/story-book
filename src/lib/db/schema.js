// Database schema for Story Book
import Database from "better-sqlite3";
import { join } from "path";

// Database connection
let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    try {
      const dbPath = join(process.cwd(), "data", "storybook.db");
      dbInstance = new Database(dbPath);

      // Enable foreign keys
      dbInstance.pragma("foreign_keys = ON");
    } catch (error) {
      console.error("Failed to create database connection:", error);
      // Return a mock database for development if better-sqlite3 fails
      return null;
    }
  }

  return dbInstance;
}

// Initialize database with schema
export function initializeDatabase() {
  const db = getDatabase();
  if (!db) {
    console.warn("Database not available, skipping initialization");
    return null;
  }

  // Users table for Better-Auth
  db.exec(`
		CREATE TABLE IF NOT EXISTS user (
			id TEXT PRIMARY KEY,
			email TEXT UNIQUE NOT NULL,
			emailVerified BOOLEAN DEFAULT FALSE,
			name TEXT,
			createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
			image TEXT
		);
	`);

  // Sessions table for Better-Auth
  db.exec(`
		CREATE TABLE IF NOT EXISTS session (
			id TEXT PRIMARY KEY,
			expiresAt DATETIME NOT NULL,
			token TEXT UNIQUE NOT NULL,
			createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
			ipAddress TEXT,
			userAgent TEXT,
			userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
		);
	`);

  // Account table for Better-Auth (for OAuth providers)
  db.exec(`
		CREATE TABLE IF NOT EXISTS account (
			id TEXT PRIMARY KEY,
			accountId TEXT NOT NULL,
			providerId TEXT NOT NULL,
			userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			accessToken TEXT,
			refreshToken TEXT,
			idToken TEXT,
			accessTokenExpiresAt DATETIME,
			refreshTokenExpiresAt DATETIME,
			scope TEXT,
			password TEXT,
			createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`);

  // Verification table for Better-Auth
  db.exec(`
		CREATE TABLE IF NOT EXISTS verification (
			id TEXT PRIMARY KEY,
			identifier TEXT NOT NULL,
			value TEXT NOT NULL,
			expiresAt DATETIME NOT NULL,
			createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`);

  // Books table
  db.exec(`
		CREATE TABLE IF NOT EXISTS books (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			author TEXT NOT NULL,
			file_path TEXT,
			cover_image_path TEXT,
			total_pages INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`);

  // Reading sessions table
  db.exec(`
		CREATE TABLE IF NOT EXISTS reading_sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
			current_page INTEGER DEFAULT 1,
			language TEXT NOT NULL,
			languages TEXT,
			reading_mode TEXT DEFAULT 'paragraph',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`);

  // Bookmarks table
  db.exec(`
		CREATE TABLE IF NOT EXISTS bookmarks (
			id TEXT PRIMARY KEY,
			session_id TEXT NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
			page_number INTEGER NOT NULL,
			sentence_index INTEGER,
			notes TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`);

  // Translations table
  db.exec(`
		CREATE TABLE IF NOT EXISTS translations (
			id TEXT PRIMARY KEY,
			book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
			language TEXT NOT NULL,
			page_number INTEGER NOT NULL,
			original_text TEXT NOT NULL,
			translated_text TEXT,
			phonetic_text TEXT,
			audio_path TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(book_id, language, page_number)
		);
	`);

  // Add cover_image_path column to existing books table if it doesn't exist
  try {
    db.exec(`ALTER TABLE books ADD COLUMN cover_image_path TEXT;`);
    console.log("✅ Added cover_image_path column to books table");
  } catch (error) {
    // Column might already exist, which is fine
    if (!error.message.includes("duplicate column name")) {
      console.error("❌ Error adding cover_image_path column:", error.message);
    }
  }

  // Add new columns to reading_sessions table for multiple languages and reading modes
  try {
    db.exec(`ALTER TABLE reading_sessions ADD COLUMN languages TEXT;`);
    console.log("✅ Added languages column to reading_sessions table");
  } catch (error) {
    if (!error.message.includes("duplicate column name")) {
      console.error("❌ Error adding languages column:", error.message);
    }
  }

  try {
    db.exec(`ALTER TABLE reading_sessions ADD COLUMN reading_mode TEXT DEFAULT 'paragraph';`);
    console.log("✅ Added reading_mode column to reading_sessions table");
  } catch (error) {
    if (!error.message.includes("duplicate column name")) {
      console.error("❌ Error adding reading_mode column:", error.message);
    }
  }

  // Create indexes for better performance
  db.exec(`
		CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId);
		CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId);
		CREATE INDEX IF NOT EXISTS idx_reading_sessions_user ON reading_sessions(user_id);
		CREATE INDEX IF NOT EXISTS idx_reading_sessions_book ON reading_sessions(book_id);
		CREATE INDEX IF NOT EXISTS idx_bookmarks_session ON bookmarks(session_id);
		CREATE INDEX IF NOT EXISTS idx_translations_book_lang ON translations(book_id, language);
	`);

  console.log("✅ Database schema initialized");
  return db;
}

// Seed database with test data
export async function seedDatabase() {
  const db = getDatabase();
  if (!db) {
    console.log("ℹ️ Database not available for seeding");
    return;
  }

  try {
    // Check if test user exists
    const existingUser = db
      .prepare("SELECT id FROM user WHERE email = ?")
      .get("kyran@storybook.test");

    if (!existingUser) {
      console.log(
        "ℹ️ Test user (kyran) not found, will be created via seed script",
      );
    } else {
      console.log("✅ Test user (kyran) already exists");
    }

    // Check if sample book exists
    const existingBook = db
      .prepare("SELECT id FROM books WHERE title = ?")
      .get("Pride and Prejudice");

    if (!existingBook) {
      const { randomUUID } = await import("crypto");
      const bookId = randomUUID();
      db.prepare(
        `
				INSERT INTO books (id, title, author, file_path, total_pages)
				VALUES (?, ?, ?, ?, ?)
			`,
      ).run(
        bookId,
        "Pride and Prejudice",
        "Jane Austen",
        "books/pride_and_prejudice.txt",
        50,
      );
      console.log("✅ Sample book created");
    } else {
      console.log("✅ Sample book already exists");
    }
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }

  console.log("ℹ️ Database seeding complete");
}
