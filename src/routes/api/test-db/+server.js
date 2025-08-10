import { json } from "@sveltejs/kit";
import { ensureDatabase } from "$lib/db/init.js";

export async function GET() {
  try {
    const db = await ensureDatabase();

    // Test query
    const result = db.prepare("SELECT 1 as test").get();

    return json({
      success: true,
      message: "Database is working",
      test: result,
    });
  } catch (error) {
    console.error("Database test error:", error);
    return json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
