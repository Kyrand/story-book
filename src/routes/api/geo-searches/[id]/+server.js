import { json } from "@sveltejs/kit";
import { getDatabase } from "$lib/db/schema.js";

export async function GET({ params, locals }) {
  try {
    const db = getDatabase();
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }

    if (!locals.user?.id) {
      return json({ error: "Authentication required" }, { status: 401 });
    }

    // Get geo search with its features
    const geoSearch = db
      .prepare(
        `
			SELECT gs.* 
			FROM geo_searches gs
			JOIN projects p ON gs.project_id = p.id
			WHERE gs.id = ? AND p.user_id = ?
		`,
      )
      .get(params.id, locals.user.id);

    if (!geoSearch) {
      return json({ error: "Geo search not found" }, { status: 404 });
    }

    // Get associated features
    const features = db
      .prepare(
        `
			SELECT * FROM geo_features 
			WHERE geo_search_id = ? 
			ORDER BY distance ASC
		`,
      )
      .all(params.id);

    // Parse stored JSON data
    const result = {
      ...geoSearch,
      polygon_data: JSON.parse(geoSearch.polygon_data),
      features: features.map((feature) => ({
        ...feature,
        geometry_data: JSON.parse(feature.geometry_data || "{}"),
      })),
    };

    return json(result);
  } catch (error) {
    console.error("Error fetching geo search:", error);
    return json({ error: "Failed to fetch geo search" }, { status: 500 });
  }
}

export async function DELETE({ params, locals }) {
  try {
    const db = getDatabase();
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }

    if (!locals.user?.id) {
      return json({ error: "Authentication required" }, { status: 401 });
    }

    // Verify ownership and delete
    const deleteStmt = db.prepare(`
			DELETE FROM geo_searches 
			WHERE id = ? AND project_id IN (
				SELECT id FROM projects WHERE user_id = ?
			)
		`);

    const result = deleteStmt.run(params.id, locals.user.id);

    if (result.changes === 0) {
      return json(
        { error: "Geo search not found or unauthorized" },
        { status: 404 },
      );
    }

    console.log(`✅ Geo search deleted: ${params.id}`);
    return json({ success: true });
  } catch (error) {
    console.error("Error deleting geo search:", error);
    return json({ error: "Failed to delete geo search" }, { status: 500 });
  }
}
