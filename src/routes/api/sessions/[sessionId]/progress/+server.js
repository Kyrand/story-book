import { json } from "@sveltejs/kit";
import { getDatabase } from "$lib/db/schema.js";
import { updateReadingProgress } from "$lib/services/books.js";

export async function PUT({ params, request, locals }) {
  const session = await locals.auth?.getSession();

  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPage } = await request.json();

  if (!currentPage || currentPage < 1) {
    return json({ error: "Invalid page number" }, { status: 400 });
  }

  try {
    const db = getDatabase();
    const success = await updateReadingProgress(
      db,
      params.sessionId,
      currentPage,
    );

    if (success) {
      return json({ success: true });
    } else {
      return json({ error: "Failed to update progress" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error updating progress:", error);
    return json({ error: "Failed to update progress" }, { status: 500 });
  }
}
