import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Top 10 Project Gutenberg books with their text URLs
const books = [
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    url: "https://www.gutenberg.org/files/1342/1342-0.txt",
    filename: "pride_and_prejudice.txt",
  },
  {
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    url: "https://www.gutenberg.org/files/11/11-0.txt",
    filename: "alice_wonderland.txt",
  },
  {
    title: "Frankenstein",
    author: "Mary Shelley",
    url: "https://www.gutenberg.org/files/84/84-0.txt",
    filename: "frankenstein.txt",
  },
  {
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    url: "https://www.gutenberg.org/files/1661/1661-0.txt",
    filename: "sherlock_holmes.txt",
  },
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    url: "https://www.gutenberg.org/files/64317/64317-0.txt",
    filename: "great_gatsby.txt",
  },
  {
    title: "A Tale of Two Cities",
    author: "Charles Dickens",
    url: "https://www.gutenberg.org/files/98/98-0.txt",
    filename: "tale_two_cities.txt",
  },
  {
    title: "The Picture of Dorian Gray",
    author: "Oscar Wilde",
    url: "https://www.gutenberg.org/files/174/174-0.txt",
    filename: "dorian_gray.txt",
  },
  {
    title: "Dracula",
    author: "Bram Stoker",
    url: "https://www.gutenberg.org/files/345/345-0.txt",
    filename: "dracula.txt",
  },
  {
    title: "The Adventures of Tom Sawyer",
    author: "Mark Twain",
    url: "https://www.gutenberg.org/files/74/74-0.txt",
    filename: "tom_sawyer.txt",
  },
  {
    title: "Jane Eyre",
    author: "Charlotte Brontë",
    url: "https://www.gutenberg.org/files/1260/1260-0.txt",
    filename: "jane_eyre.txt",
  },
];

// Function to download a book
async function downloadBook(book) {
  try {
    console.log(`Downloading ${book.title}...`);
    const response = await fetch(book.url);

    if (!response.ok) {
      throw new Error(
        `Failed to download ${book.title}: ${response.statusText}`,
      );
    }

    const text = await response.text();
    const bookPath = path.join(__dirname, "..", "data", "books", book.filename);

    // Clean up the text (remove Gutenberg headers/footers)
    const cleanedText = cleanGutenbergText(text);

    fs.writeFileSync(bookPath, cleanedText, "utf-8");
    console.log(`✅ Downloaded ${book.title}`);

    return { ...book, path: bookPath, success: true };
  } catch (error) {
    console.error(`❌ Error downloading ${book.title}:`, error.message);
    return { ...book, success: false, error: error.message };
  }
}

// Function to clean Gutenberg text
function cleanGutenbergText(text) {
  // Remove BOM if present
  text = text.replace(/^\uFEFF/, "");

  // Find the start of the actual book content
  const startMarkers = [
    "*** START OF THE PROJECT GUTENBERG",
    "*** START OF THIS PROJECT GUTENBERG",
    "***START OF THE PROJECT GUTENBERG",
    "*END*THE SMALL PRINT",
  ];

  let startIndex = -1;
  for (const marker of startMarkers) {
    const index = text.indexOf(marker);
    if (index !== -1) {
      // Find the next newline after the marker
      startIndex = text.indexOf("\n", index) + 1;
      break;
    }
  }

  // Find the end of the actual book content
  const endMarkers = [
    "*** END OF THE PROJECT GUTENBERG",
    "*** END OF THIS PROJECT GUTENBERG",
    "***END OF THE PROJECT GUTENBERG",
    "End of the Project Gutenberg",
  ];

  let endIndex = text.length;
  for (const marker of endMarkers) {
    const index = text.indexOf(marker);
    if (index !== -1 && index < endIndex) {
      endIndex = index;
    }
  }

  // Extract the content
  if (startIndex > 0 && endIndex < text.length) {
    text = text.substring(startIndex, endIndex);
  }

  // Clean up extra whitespace
  text = text.trim();
  text = text.replace(/\r\n/g, "\n"); // Normalize line endings
  text = text.replace(/\n{3,}/g, "\n\n"); // Remove excessive newlines

  return text;
}

// Function to create book metadata file
function createBookMetadata(results) {
  const metadata = results
    .filter((r) => r.success)
    .map((r) => ({
      title: r.title,
      author: r.author,
      filename: r.filename,
    }));

  const metadataPath = path.join(
    __dirname,
    "..",
    "data",
    "books",
    "metadata.json",
  );
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log("✅ Created book metadata file");
}

// Main function
async function main() {
  console.log("Starting book downloads from Project Gutenberg...\n");

  // Ensure books directory exists
  const booksDir = path.join(__dirname, "..", "data", "books");
  if (!fs.existsSync(booksDir)) {
    fs.mkdirSync(booksDir, { recursive: true });
  }

  // Download books sequentially to avoid overwhelming the server
  const results = [];
  for (const book of books) {
    const result = await downloadBook(book);
    results.push(result);
    // Small delay between downloads
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Create metadata file
  createBookMetadata(results);

  // Summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log("\n=== Download Summary ===");
  console.log(`✅ Successfully downloaded: ${successful} books`);
  if (failed > 0) {
    console.log(`❌ Failed downloads: ${failed} books`);
  }

  // Update database with downloaded books
  console.log("\nUpdating database with book information...");
  const { initializeDatabase, getDatabase } = await import(
    "../src/lib/db/schema.js"
  );
  const { randomUUID } = await import("crypto");

  initializeDatabase();
  const db = getDatabase();

  if (db) {
    for (const result of results) {
      if (result.success) {
        try {
          // Check if book already exists
          const existing = db
            .prepare("SELECT id FROM books WHERE title = ?")
            .get(result.title);

          if (!existing) {
            const bookId = randomUUID();
            db.prepare(
              `
							INSERT INTO books (id, title, author, file_path, total_pages)
							VALUES (?, ?, ?, ?, ?)
						`,
            ).run(bookId, result.title, result.author, result.filename, 100); // Default 100 pages, will be calculated later

            console.log(`📚 Added ${result.title} to database`);
          }
        } catch (error) {
          console.error(
            `Error adding ${result.title} to database:`,
            error.message,
          );
        }
      }
    }
  }

  console.log("\n✅ Book download and import complete!");
}

// Run the script
main().catch(console.error);
