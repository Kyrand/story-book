import { json } from "@sveltejs/kit";
import { getDatabase } from "$lib/db/schema.js";

export async function PUT({ params, request, locals }) {
  const session = await locals.auth?.getSession();

  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const { readingMode } = await request.json();
  
  if (!readingMode || !['paragraph', 'sentence'].includes(readingMode)) {
    return json({ error: "Invalid reading mode" }, { status: 400 });
  }

  try {
    const db = getDatabase();
    
    if (!db) {
      return json({ error: "Database not available" }, { status: 503 });
    }

    // Verify the session belongs to the current user
    const existingSession = db
      .prepare("SELECT user_id FROM reading_sessions WHERE id = ?")
      .get(params.sessionId);

    if (!existingSession) {
      return json({ error: "Reading session not found" }, { status: 404 });
    }

    if (existingSession.user_id !== session.user.id) {
      return json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update the reading mode
    db.prepare(`
      UPDATE reading_sessions 
      SET reading_mode = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(readingMode, params.sessionId);

    return json({ success: true, readingMode });
  } catch (error) {
    console.error("Error updating reading mode:", error);
    return json(
      { error: "Failed to update reading mode" },
      { status: 500 }
    );
  }
}