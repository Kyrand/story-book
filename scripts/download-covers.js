import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Book cover mappings with various sources
const bookCovers = {
  "Pride and Prejudice": {
    filename: "pride_and_prejudice.jpg",
    sources: [
      "https://www.gutenberg.org/files/1342/1342-h/images/cover.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/PrideAndPrejudiceTitlePage.jpg/256px-PrideAndPrejudiceTitlePage.jpg",
    ],
    fallbackColor: "#8B4513",
    textColor: "#FFFFFF",
  },
  "Alice's Adventures in Wonderland": {
    filename: "alice_wonderland.jpg",
    sources: [
      "https://www.gutenberg.org/files/11/11-h/images/cover.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Alice%27s_Adventures_in_Wonderland_cover_1865.jpg/256px-Alice%27s_Adventures_in_Wonderland_cover_1865.jpg",
    ],
    fallbackColor: "#4169E1",
    textColor: "#FFFFFF",
  },
  Frankenstein: {
    filename: "frankenstein.jpg",
    sources: [
      "https://www.gutenberg.org/files/84/84-h/images/cover.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Frankenstein_1818_edition_title_page.jpg/256px-Frankenstein_1818_edition_title_page.jpg",
    ],
    fallbackColor: "#2F4F4F",
    textColor: "#FFFFFF",
  },
  "The Adventures of Sherlock Holmes": {
    filename: "sherlock_holmes.jpg",
    sources: [
      "https://www.gutenberg.org/files/1661/1661-h/images/cover.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Adventures_of_sherlock_holmes.jpg/256px-Adventures_of_sherlock_holmes.jpg",
    ],
    fallbackColor: "#8B0000",
    textColor: "#FFFFFF",
  },
  "The Great Gatsby": {
    filename: "great_gatsby.jpg",
    sources: ["https://www.gutenberg.org/files/64317/64317-h/images/cover.jpg"],
    fallbackColor: "#DAA520",
    textColor: "#000000",
  },
  "A Tale of Two Cities": {
    filename: "tale_two_cities.jpg",
    sources: [
      "https://www.gutenberg.org/files/98/98-h/images/cover.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Dickens_A_Tale_of_Two_Cities_serialcover.jpg/256px-Dickens_A_Tale_of_Two_Cities_serialcover.jpg",
    ],
    fallbackColor: "#556B2F",
    textColor: "#FFFFFF",
  },
  "The Picture of Dorian Gray": {
    filename: "dorian_gray.jpg",
    sources: [
      "https://www.gutenberg.org/files/174/174-h/images/cover.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Picture_of_dorian_gray.jpg/256px-Picture_of_dorian_gray.jpg",
    ],
    fallbackColor: "#800080",
    textColor: "#FFFFFF",
  },
  Dracula: {
    filename: "dracula.jpg",
    sources: [
      "https://www.gutenberg.org/files/345/345-h/images/cover.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Dracula_1st_ed_cover_reproduction.jpg/256px-Dracula_1st_ed_cover_reproduction.jpg",
    ],
    fallbackColor: "#B22222",
    textColor: "#FFFFFF",
  },
  "The Adventures of Tom Sawyer": {
    filename: "tom_sawyer.jpg",
    sources: [
      "https://www.gutenberg.org/files/74/74-h/images/cover.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Tom_Sawyer_1876_frontispiece.jpg/256px-Tom_Sawyer_1876_frontispiece.jpg",
    ],
    fallbackColor: "#20B2AA",
    textColor: "#FFFFFF",
  },
  "Jane Eyre": {
    filename: "jane_eyre.jpg",
    sources: [
      "https://www.gutenberg.org/files/1260/1260-h/images/cover.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Jane_Eyre_title_page.jpg/256px-Jane_Eyre_title_page.jpg",
    ],
    fallbackColor: "#4B0082",
    textColor: "#FFFFFF",
  },
};

// Function to download an image from URL
async function downloadImage(url, filename) {
  try {
    console.log(`  Trying to download from: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const coverPath = path.join(__dirname, "..", "static", "covers", filename);
    fs.writeFileSync(coverPath, buffer);

    console.log(`  ✅ Downloaded cover: ${filename}`);
    return true;
  } catch (error) {
    console.log(`  ❌ Failed to download from ${url}: ${error.message}`);
    return false;
  }
}

// Function to create a simple SVG-based fallback cover
async function generateFallbackCover(
  title,
  author,
  filename,
  backgroundColor,
  textColor,
) {
  try {
    console.log(`  Generating SVG fallback cover for: ${title}`);

    // Split long titles into multiple lines
    const words = title.split(" ");
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      if (currentLine.length + words[i].length + 1 > 20) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine += " " + words[i];
      }
    }
    lines.push(currentLine);

    // Generate title tspan elements for multi-line text
    const titleElements = lines
      .map(
        (line, index) =>
          `<tspan x="100" dy="${index === 0 ? 0 : 18}">${line}</tspan>`,
      )
      .join("");

    // Create SVG content
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="300" fill="${backgroundColor}"/>
  <rect x="10" y="10" width="180" height="280" fill="none" stroke="${textColor}" stroke-width="2"/>
  
  <!-- Title -->
  <text x="100" y="110" font-family="serif" font-size="16" font-weight="bold" 
        fill="${textColor}" text-anchor="middle" dominant-baseline="middle">
    ${titleElements}
  </text>
  
  <!-- Author -->
  <text x="100" y="220" font-family="serif" font-size="12" 
        fill="${textColor}" text-anchor="middle" dominant-baseline="middle">
    ${author}
  </text>
</svg>`;

    // For simplicity, save as SVG for now (browsers can display SVG directly)
    const coverPath = path.join(
      __dirname,
      "..",
      "static",
      "covers",
      filename.replace(".jpg", ".svg"),
    );
    fs.writeFileSync(coverPath, svgContent);

    console.log(
      `  ✅ Generated SVG fallback cover: ${filename.replace(".jpg", ".svg")}`,
    );
    return filename.replace(".jpg", ".svg");
  } catch (error) {
    console.log(`  ❌ Failed to generate fallback cover: ${error.message}`);
    return false;
  }
}

// Function to download a book cover
async function downloadBookCover(title, coverInfo) {
  console.log(`\nDownloading cover for: ${title}`);

  // Check if cover already exists
  const coverPath = path.join(
    __dirname,
    "..",
    "static",
    "covers",
    coverInfo.filename,
  );
  if (fs.existsSync(coverPath)) {
    console.log(`  ✅ Cover already exists: ${coverInfo.filename}`);
    return {
      title,
      filename: coverInfo.filename,
      success: true,
      method: "existing",
    };
  }

  // Try to download from sources
  for (const source of coverInfo.sources) {
    const success = await downloadImage(source, coverInfo.filename);
    if (success) {
      return {
        title,
        filename: coverInfo.filename,
        success: true,
        method: "download",
      };
    }

    // Small delay between attempts
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Generate fallback cover
  const fallbackFilename = await generateFallbackCover(
    title,
    getAuthorForTitle(title),
    coverInfo.filename,
    coverInfo.fallbackColor,
    coverInfo.textColor,
  );

  if (fallbackFilename) {
    return {
      title,
      filename: fallbackFilename,
      success: true,
      method: "generated",
    };
  }

  return {
    title,
    filename: coverInfo.filename,
    success: false,
    method: "none",
  };
}

// Helper function to get author for a title
function getAuthorForTitle(title) {
  const titleAuthorMap = {
    "Pride and Prejudice": "Jane Austen",
    "Alice's Adventures in Wonderland": "Lewis Carroll",
    Frankenstein: "Mary Shelley",
    "The Adventures of Sherlock Holmes": "Arthur Conan Doyle",
    "The Great Gatsby": "F. Scott Fitzgerald",
    "A Tale of Two Cities": "Charles Dickens",
    "The Picture of Dorian Gray": "Oscar Wilde",
    Dracula: "Bram Stoker",
    "The Adventures of Tom Sawyer": "Mark Twain",
    "Jane Eyre": "Charlotte Brontë",
  };

  return titleAuthorMap[title] || "Unknown Author";
}

// Function to update database with cover paths
async function updateBookCoversInDB(results) {
  try {
    console.log("\nUpdating database with cover image paths...");
    const { initializeDatabase, getDatabase } = await import(
      "../src/lib/db/schema.js"
    );

    initializeDatabase();
    const db = getDatabase();

    if (!db) {
      console.log("❌ Database not available for updating cover paths");
      return;
    }

    for (const result of results) {
      if (result.success) {
        try {
          // Update the book with the cover image path
          const updated = db
            .prepare(
              `
						UPDATE books 
						SET cover_image_path = ?
						WHERE title = ?
					`,
            )
            .run(`/covers/${result.filename}`, result.title);

          if (updated.changes > 0) {
            console.log(`📚 Updated cover path for: ${result.title}`);
          } else {
            console.log(`⚠️  Book not found in database: ${result.title}`);
          }
        } catch (error) {
          console.error(`❌ Error updating ${result.title}:`, error.message);
        }
      }
    }

    console.log("✅ Database update complete");
  } catch (error) {
    console.error("❌ Error updating database:", error.message);
  }
}

// Main function
async function main() {
  console.log("Starting book cover download process...\n");

  // Ensure covers directory exists
  const coversDir = path.join(__dirname, "..", "static", "covers");
  if (!fs.existsSync(coversDir)) {
    fs.mkdirSync(coversDir, { recursive: true });
    console.log("✅ Created covers directory");
  }

  // Download covers for all books
  const results = [];
  for (const [title, coverInfo] of Object.entries(bookCovers)) {
    const result = await downloadBookCover(title, coverInfo);
    results.push(result);

    // Small delay between books
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Update database with cover paths
  await updateBookCoversInDB(results);

  // Summary
  const successful = results.filter((r) => r.success).length;
  const downloaded = results.filter(
    (r) => r.success && r.method === "download",
  ).length;
  const generated = results.filter(
    (r) => r.success && r.method === "generated",
  ).length;
  const existing = results.filter(
    (r) => r.success && r.method === "existing",
  ).length;
  const failed = results.filter((r) => !r.success).length;

  console.log("\n=== Cover Download Summary ===");
  console.log(`✅ Total successful: ${successful} covers`);
  if (downloaded > 0)
    console.log(`📥 Downloaded from web: ${downloaded} covers`);
  if (generated > 0) console.log(`🎨 Generated fallback: ${generated} covers`);
  if (existing > 0) console.log(`📁 Already existed: ${existing} covers`);
  if (failed > 0) console.log(`❌ Failed: ${failed} covers`);

  console.log("\n✅ Book cover download process complete!");
}

// Run the script
main().catch(console.error);
