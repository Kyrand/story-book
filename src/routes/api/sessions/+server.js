import { json } from "@sveltejs/kit";
import { getDatabase } from "$lib/db/schema.js";
import { createReadingSession } from "$lib/services/books.js";
import { createMockSession } from "$lib/mock-data.js";

export async function POST({ request, locals }) {
  const session = await locals.auth?.getSession();

  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId, language, languages, readingMode } = await request.json();

  if (!bookId || !language) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const db = getDatabase();
    let sessionId;

    if (db) {
      sessionId = await createReadingSession(
        db,
        session.user.id,
        bookId,
        language,
        languages,
        readingMode
      );
    } else {
      // Use mock data when database is not available
      console.log("Creating mock reading session");
      const mockSession = createMockSession(session.user.id, bookId, language);
      sessionId = mockSession.id;
    }

    return json({ sessionId });
  } catch (error) {
    console.error("Error creating reading session:", error);
    return json({ error: "Failed to create reading session" }, { status: 500 });
  }
}
