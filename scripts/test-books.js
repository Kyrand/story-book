// Test script to verify book loading is working
import { getDatabase } from "../src/lib/db/schema.js";
import { getBookPage } from "../src/lib/services/books.js";

async function testBooks() {
  console.log("🧪 Testing book loading...\n");

  const db = getDatabase();
  if (!db) {
    console.log("❌ Database not available");
    return;
  }

  // Get all books
  const books = db.prepare("SELECT * FROM books LIMIT 3").all();

  for (const book of books) {
    console.log(`📚 Testing: ${book.title} by ${book.author}`);
    console.log(`   File path: ${book.file_path}`);

    try {
      const page = getBookPage(book.file_path, 1);
      console.log(`   ✅ Successfully loaded page 1`);
      console.log(`   📄 Total pages: ${page.totalPages}`);
      console.log(
        `   📝 Content preview: "${page.content.substring(0, 100)}..."`,
      );
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log("");
  }

  console.log("✅ Book loading test complete!");
}

testBooks().catch(console.error);
