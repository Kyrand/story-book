// Better-Auth API route handler
import { getAuth } from '$lib/auth/config.js';
import { ensureDatabase } from '$lib/db/init.js';

// Ensure database is initialized when auth routes are accessed
ensureDatabase();

export function GET(event) {
	const auth = getAuth();
	
	if (auth) {
		try {
			// Better-Auth expects a Request object, create one from SvelteKit event
			const request = new Request(event.url, {
				method: 'GET',
				headers: event.request.headers
			});
			return auth.handler(request);
		} catch (error) {
			console.error('Auth handler error:', error);
		}
	}
	
	return new Response(JSON.stringify({ error: 'Auth service unavailable' }), {
		status: 503,
		headers: { 'Content-Type': 'application/json' }
	});
}

export function POST(event) {
	const auth = getAuth();
	
	if (auth) {
		try {
			// Pass the request directly as Better-Auth expects a Request object
			return auth.handler(event.request);
		} catch (error) {
			console.error('Auth handler error:', error);
		}
	}
	
	return new Response(JSON.stringify({ error: 'Auth service unavailable' }), {
		status: 503,
		headers: { 'Content-Type': 'application/json' }
	});
}