import { json } from "@sveltejs/kit";
import { getDatabase } from "$lib/db/schema.js";
import { randomUUID } from "crypto";

export async function GET({ locals }) {
  try {
    const db = getDatabase();
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }

    if (!locals.user?.id) {
      return json({ error: "Authentication required" }, { status: 401 });
    }

    const projects = db
      .prepare(
        "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC",
      )
      .all(locals.user.id);

    return json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST({ request, locals }) {
  try {
    const db = getDatabase();
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }

    if (!locals.user?.id) {
      return json({ error: "Authentication required" }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name?.trim()) {
      return json({ error: "Project name is required" }, { status: 400 });
    }

    const projectId = randomUUID();
    const insertStmt = db.prepare(`
			INSERT INTO projects (id, name, description, user_id) 
			VALUES (?, ?, ?, ?)
		`);

    insertStmt.run(
      projectId,
      name.trim(),
      description?.trim() || "Add a description here...",
      locals.user.id,
    );

    const newProject = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(projectId);

    console.log(`✅ Project created: ${name}`);
    return json(newProject, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return json({ error: "Failed to create project" }, { status: 500 });
  }
}
