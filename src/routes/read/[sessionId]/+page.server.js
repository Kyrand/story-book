import { getDatabase } from "$lib/db/schema.js";
import { getReadingSession, getBookPage } from "$lib/services/books.js";
import { getMockSession } from "$lib/mock-data.js";
import { error, redirect } from "@sveltejs/kit";

// Mock page content for demo
const mockPageContent = {
  content: `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.

"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"

Mr. Bennet replied that he had not.

"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."`,
  totalPages: 100,
  currentPage: 1,
};

export async function load({ params, locals }) {
  const authSession = await locals.auth?.getSession();

  if (!authSession?.user) {
    throw redirect(303, "/");
  }

  const db = getDatabase();
  let session = null;

  if (db) {
    session = await getReadingSession(db, params.sessionId);
  } else {
    // Use mock session when database is not available
    console.log("Using mock session data");
    session = getMockSession(params.sessionId);
  }

  if (!session) {
    throw error(404, "Reading session not found");
  }

  // Verify the session belongs to the current user
  if (session.user_id !== authSession.user.id) {
    throw error(403, "Unauthorized");
  }

  // Load the current page content
  let pageContent = null;
  try {
    if (session.file_path) {
      pageContent = getBookPage(session.file_path, session.current_page);
    } else {
      // Use mock content when file is not available
      pageContent = mockPageContent;
    }
  } catch (err) {
    console.error("Error loading book page, using mock content:", err);
    pageContent = mockPageContent;
  }

  return {
    session,
    pageContent,
  };
}
