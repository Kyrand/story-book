import fs from "fs";
import path from "path";

// Function to read a book file
export function readBookFile(filename) {
  const bookPath = path.join(process.cwd(), "data", "books", filename);

  if (!fs.existsSync(bookPath)) {
    throw new Error(`Book file not found: ${filename}`);
  }

  const content = fs.readFileSync(bookPath, "utf-8");
  return content;
}

// Function to paginate book content
export function paginateBook(content, wordsPerPage = 300) {
  // Split content into words
  const words = content.split(/\s+/).filter((word) => word.length > 0);

  const pages = [];
  let currentPage = [];
  let wordCount = 0;

  for (const word of words) {
    currentPage.push(word);
    wordCount++;

    // Check if we've reached the page limit
    if (wordCount >= wordsPerPage) {
      // Try to find a sentence ending nearby
      const pageText = currentPage.join(" ");
      const lastPeriod = pageText.lastIndexOf(".");
      const lastQuestion = pageText.lastIndexOf("?");
      const lastExclamation = pageText.lastIndexOf("!");

      const lastSentenceEnd = Math.max(
        lastPeriod,
        lastQuestion,
        lastExclamation,
      );

      if (lastSentenceEnd > pageText.length * 0.7) {
        // Found a sentence ending in the last 30% of the page
        const wordsBeforeEnd = pageText
          .substring(0, lastSentenceEnd + 1)
          .split(/\s+/);
        const wordsAfterEnd = pageText
          .substring(lastSentenceEnd + 1)
          .trim()
          .split(/\s+/)
          .filter((w) => w);

        pages.push(wordsBeforeEnd.join(" "));
        currentPage = wordsAfterEnd;
        wordCount = wordsAfterEnd.length;
      } else {
        // No good sentence ending, just use the page as is
        pages.push(pageText);
        currentPage = [];
        wordCount = 0;
      }
    }
  }

  // Add remaining words as the last page
  if (currentPage.length > 0) {
    pages.push(currentPage.join(" "));
  }

  return pages;
}

// Function to get a specific page from a book
export function getBookPage(filename, pageNumber, wordsPerPage = 300) {
  const content = readBookFile(filename);
  const pages = paginateBook(content, wordsPerPage);

  if (pageNumber < 1 || pageNumber > pages.length) {
    throw new Error(`Invalid page number. Book has ${pages.length} pages.`);
  }

  return {
    content: pages[pageNumber - 1],
    totalPages: pages.length,
    currentPage: pageNumber,
  };
}

// Function to get book metadata from database
export async function getBookFromDB(db, bookId) {
  if (!db) {
    return null;
  }

  try {
    const book = db.prepare("SELECT * FROM books WHERE id = ?").get(bookId);
    return book;
  } catch (error) {
    console.error("Error fetching book from database:", error);
    return null;
  }
}

// Function to get all books from database
export async function getAllBooksFromDB(db) {
  if (!db) {
    return [];
  }

  try {
    const books = db.prepare("SELECT * FROM books ORDER BY title").all();
    return books;
  } catch (error) {
    console.error("Error fetching books from database:", error);
    return [];
  }
}

// Function to create a reading session
export async function createReadingSession(db, userId, bookId, language, languages, readingMode = 'paragraph') {
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const { randomUUID } = await import("crypto");
    const sessionId = randomUUID();

    // Serialize languages array for storage
    const languagesJson = languages ? JSON.stringify(languages) : null;

    // Check if user already has a session for this book and language combination
    const existing = db
      .prepare(
        `
			SELECT id FROM reading_sessions 
			WHERE user_id = ? AND book_id = ? AND language = ? AND reading_mode = ?
		`,
      )
      .get(userId, bookId, language, readingMode);

    if (existing) {
      // Update the existing session's updated_at and languages
      db.prepare(
        `
				UPDATE reading_sessions 
				SET updated_at = CURRENT_TIMESTAMP, languages = ?
				WHERE id = ?
			`,
      ).run(languagesJson, existing.id);

      return existing.id;
    }

    // Create new session
    db.prepare(
      `
			INSERT INTO reading_sessions (id, user_id, book_id, current_page, language, languages, reading_mode)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`,
    ).run(sessionId, userId, bookId, 1, language, languagesJson, readingMode);

    return sessionId;
  } catch (error) {
    console.error("Error creating reading session:", error);
    throw error;
  }
}

// Function to get a reading session
export async function getReadingSession(db, sessionId) {
  if (!db) {
    return null;
  }

  try {
    const session = db
      .prepare(
        `
			SELECT rs.*, b.title, b.author, b.file_path, b.total_pages
			FROM reading_sessions rs
			JOIN books b ON rs.book_id = b.id
			WHERE rs.id = ?
		`,
      )
      .get(sessionId);

    return session;
  } catch (error) {
    console.error("Error fetching reading session:", error);
    return null;
  }
}

// Function to update reading session progress
export async function updateReadingProgress(db, sessionId, currentPage) {
  if (!db) {
    return false;
  }

  try {
    db.prepare(
      `
			UPDATE reading_sessions 
			SET current_page = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ?
		`,
    ).run(currentPage, sessionId);

    return true;
  } catch (error) {
    console.error("Error updating reading progress:", error);
    return false;
  }
}

// Function to get user's reading sessions
export async function getUserReadingSessions(db, userId) {
  if (!db) {
    return [];
  }

  try {
    const sessions = db
      .prepare(
        `
			SELECT rs.*, b.title, b.author
			FROM reading_sessions rs
			JOIN books b ON rs.book_id = b.id
			WHERE rs.user_id = ?
			ORDER BY rs.updated_at DESC
		`,
      )
      .all(userId);

    return sessions;
  } catch (error) {
    console.error("Error fetching user reading sessions:", error);
    return [];
  }
}

// Function to add a bookmark
export async function addBookmark(
  db,
  sessionId,
  pageNumber,
  sentenceIndex = null,
  notes = null,
) {
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const { randomUUID } = await import("crypto");
    const bookmarkId = randomUUID();

    db.prepare(
      `
			INSERT INTO bookmarks (id, session_id, page_number, sentence_index, notes)
			VALUES (?, ?, ?, ?, ?)
		`,
    ).run(bookmarkId, sessionId, pageNumber, sentenceIndex, notes);

    return bookmarkId;
  } catch (error) {
    console.error("Error adding bookmark:", error);
    throw error;
  }
}

// Function to get bookmarks for a session
export async function getSessionBookmarks(db, sessionId) {
  if (!db) {
    return [];
  }

  try {
    const bookmarks = db
      .prepare(
        `
			SELECT * FROM bookmarks 
			WHERE session_id = ?
			ORDER BY page_number, sentence_index
		`,
      )
      .all(sessionId);

    return bookmarks;
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return [];
  }
}

// Function to split text into sentences for highlighting
export function splitIntoSentences(text) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Common abbreviations that should not end sentences
  const abbreviations = [
    'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'St', 'Ave', 'Rd', 'Blvd',
    'Co', 'Corp', 'Inc', 'Ltd', 'vs', 'e.g', 'i.e', 'cf', 'et al',
    'No', 'Vol', 'Ch', 'pp', 'Fig', 'Ref', 'Jan', 'Feb', 'Mar', 'Apr',
    'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Mon', 'Tue', 'Wed',
    'Thu', 'Fri', 'Sat', 'Sun', 'a.m', 'p.m', 'A.M', 'P.M'
  ];

  // Create a regex pattern that handles abbreviations
  // Split on periods, exclamation marks, or question marks followed by whitespace and a capital letter
  // But exclude cases where the period follows a known abbreviation
  const sentences = [];
  let currentSentence = '';
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    currentSentence += char;

    // Check if we hit a sentence-ending punctuation
    if (char === '.' || char === '!' || char === '?') {
      // Check if this might be an abbreviation by looking at the word before the punctuation
      const words = currentSentence.trim().split(/\s+/);
      const lastWord = words[words.length - 1];
      const wordBeforePunct = lastWord ? lastWord.replace(/[.!?]+$/, '') : '';
      
      const isAbbreviation = abbreviations.includes(wordBeforePunct);
      
      // If not an abbreviation, check if this looks like a sentence end
      if (!isAbbreviation) {
        // Look ahead to see if there's whitespace followed by any letter (or end of text)
        const nextChar = text[i + 1];
        const charAfterSpace = text[i + 2];
        
        if (!nextChar || // End of text
            (nextChar === ' ' && (!charAfterSpace || /[A-Za-z]/.test(charAfterSpace))) || // Space + any letter
            (nextChar === '\n')) { // Newline
          
          sentences.push(currentSentence.trim());
          currentSentence = '';
          
          // Skip the whitespace
          if (nextChar === ' ' || nextChar === '\n') {
            i++;
          }
        }
      }
    }
    
    i++;
  }

  // Add any remaining text as the last sentence
  if (currentSentence.trim().length > 0) {
    sentences.push(currentSentence.trim());
  }

  return sentences.filter(s => s.length > 0);
}
