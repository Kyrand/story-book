import { json } from '@sveltejs/kit';
import { getDatabase } from '$lib/db/schema.js';

export async function GET({ params, locals }) {
	try {
		const db = getDatabase();
		if (!db) {
			return json({ error: 'Database not available' }, { status: 500 });
		}

		const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
			.get(params.id, locals.user?.id);

		if (!project) {
			return json({ error: 'Project not found' }, { status: 404 });
		}

		return json(project);
	} catch (error) {
		console.error('Error fetching project:', error);
		return json({ error: 'Failed to fetch project' }, { status: 500 });
	}
}

export async function PUT({ params, request, locals }) {
	try {
		const db = getDatabase();
		if (!db) {
			return json({ error: 'Database not available' }, { status: 500 });
		}

		if (!locals.user?.id) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		const { name, description } = await request.json();

		if (!name?.trim()) {
			return json({ error: 'Project name is required' }, { status: 400 });
		}

		const updateStmt = db.prepare(`
			UPDATE projects 
			SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
			WHERE id = ? AND user_id = ?
		`);

		const result = updateStmt.run(
			name.trim(),
			description?.trim() || 'Add a description here...',
			params.id,
			locals.user.id
		);

		if (result.changes === 0) {
			return json({ error: 'Project not found or unauthorized' }, { status: 404 });
		}

		const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?')
			.get(params.id);

		console.log(`✅ Project updated: ${name}`);
		return json(updatedProject);
	} catch (error) {
		console.error('Error updating project:', error);
		return json({ error: 'Failed to update project' }, { status: 500 });
	}
}

export async function DELETE({ params, locals }) {
	try {
		const db = getDatabase();
		if (!db) {
			return json({ error: 'Database not available' }, { status: 500 });
		}

		if (!locals.user?.id) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		const deleteStmt = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?');
		const result = deleteStmt.run(params.id, locals.user.id);

		if (result.changes === 0) {
			return json({ error: 'Project not found or unauthorized' }, { status: 404 });
		}

		console.log(`✅ Project deleted: ${params.id}`);
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting project:', error);
		return json({ error: 'Failed to delete project' }, { status: 500 });
	}
}