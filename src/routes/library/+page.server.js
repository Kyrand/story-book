import { getDatabase } from "$lib/db/schema.js";
import {
  getAllBooksFromDB,
  getUserReadingSessions,
} from "$lib/services/books.js";
import { mockBooks, getUserMockSessions } from "$lib/mock-data.js";
import { redirect } from "@sveltejs/kit";

export async function load({ locals }) {
  // Check if user is authenticated
  const session = await locals.auth?.getSession();

  if (!session?.user) {
    throw redirect(303, "/");
  }

  const db = getDatabase();
  let books = [];
  let sessions = [];

  if (db) {
    // Use database if available
    books = await getAllBooksFromDB(db);
    sessions = await getUserReadingSessions(db, session.user.id);
  } else {
    // Use mock data when database is not available
    console.log("Using mock data - database not available");
    books = mockBooks;
    sessions = getUserMockSessions(session.user.id);
  }

  return {
    books,
    sessions,
    user: session.user,
  };
}
