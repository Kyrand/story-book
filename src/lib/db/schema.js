// Database schema for Story Book
import Database from 'better-sqlite3';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Database connection
let dbInstance = null;

export function getDatabase() {
	if (!dbInstance) {
		try {
			const dbPath = join(process.cwd(), 'data', 'story_book.db');
			dbInstance = new Database(dbPath);

			// Enable foreign keys
			dbInstance.pragma('foreign_keys = ON');
		} catch (error) {
			console.error('Failed to create database connection:', error);
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
		console.warn('Database not available, skipping initialization');
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

	// Create indexes for better performance
	db.exec(`
		CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId);
		CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId);
	`);

	console.log('✅ Database schema initialized');
	return db;
}

// Seed database with test data
export function seedDatabase() {
	const db = getDatabase();
	if (!db) {
		console.log('ℹ️ Database not available for seeding');
		return;
	}

	try {
		// Check if test user exists
		const existingUser = db
			.prepare('SELECT id FROM user WHERE email = ?')
			.get('test@story-book.test');

		if (!existingUser) {
			console.log('ℹ️ No test user found, should be created via auth API');
		} else {
			// Check if the user has any projects etc.
		}
	} catch (error) {
		console.error('❌ Error seeding database:', error);
	}

	console.log('ℹ️ Database seeding complete');
}
