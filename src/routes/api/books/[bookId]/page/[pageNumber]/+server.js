import { json } from "@sveltejs/kit";
import { getDatabase } from "$lib/db/schema.js";
import { getBookFromDB, getBookPage } from "$lib/services/books.js";

export async function GET({ params, locals }) {
  const session = await locals.auth?.getSession();

  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId, pageNumber } = params;

  try {
    const db = getDatabase();
    const book = await getBookFromDB(db, bookId);

    if (!book) {
      return json({ error: "Book not found" }, { status: 404 });
    }

    const pageContent = getBookPage(book.file_path, parseInt(pageNumber));

    return json(pageContent);
  } catch (error) {
    console.error("Error fetching book page:", error);
    return json({ error: "Failed to fetch page" }, { status: 500 });
  }
}
