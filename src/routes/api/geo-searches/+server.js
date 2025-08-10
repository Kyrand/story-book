import { json } from "@sveltejs/kit";
import { getDatabase } from "$lib/db/schema.js";
import { randomUUID } from "crypto";

export async function POST({ request, locals }) {
  try {
    const db = getDatabase();
    if (!db) {
      return json({ error: "Database not available" }, { status: 500 });
    }

    if (!locals.user?.id) {
      return json({ error: "Authentication required" }, { status: 401 });
    }

    const { projectId, description, polygonData, features, proximityLimit } =
      await request.json();

    if (!projectId || !description || !polygonData) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the project belongs to the user
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, locals.user.id);

    if (!project) {
      return json(
        { error: "Project not found or unauthorized" },
        { status: 404 },
      );
    }

    const searchId = randomUUID();

    // Start transaction
    const transaction = db.transaction(
      (
        searchId,
        projectId,
        description,
        polygonData,
        proximityLimit,
        features,
      ) => {
        // Insert geo search
        const insertSearchStmt = db.prepare(`
				INSERT INTO geo_searches (id, project_id, description, polygon_data, proximity_limit) 
				VALUES (?, ?, ?, ?, ?)
			`);

        insertSearchStmt.run(
          searchId,
          projectId,
          description,
          JSON.stringify(polygonData),
          proximityLimit || 1000,
        );

        // Insert features if provided
        if (features && features.length > 0) {
          const insertFeatureStmt = db.prepare(`
					INSERT INTO geo_features (id, geo_search_id, feature_type, description, distance, geometry_data) 
					VALUES (?, ?, ?, ?, ?, ?)
				`);

          for (const feature of features) {
            insertFeatureStmt.run(
              randomUUID(),
              searchId,
              feature.type || "unknown",
              feature.description || "",
              feature.distance || 0,
              JSON.stringify(feature.geometry || {}),
            );
          }
        }
      },
    );

    transaction(
      searchId,
      projectId,
      description,
      polygonData,
      proximityLimit,
      features,
    );

    // Get the created search
    const newSearch = db
      .prepare(
        `
			SELECT gs.*, COUNT(gf.id) as feature_count
			FROM geo_searches gs
			LEFT JOIN geo_features gf ON gs.id = gf.geo_search_id
			WHERE gs.id = ?
			GROUP BY gs.id
		`,
      )
      .get(searchId);

    console.log(
      `✅ Geo search saved: ${description} (${features?.length || 0} features)`,
    );
    return json(newSearch, { status: 201 });
  } catch (error) {
    console.error("Error saving geo search:", error);
    return json({ error: "Failed to save geo search" }, { status: 500 });
  }
}
