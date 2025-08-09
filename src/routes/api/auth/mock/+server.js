// Mock authentication endpoint for development
import { json } from '@sveltejs/kit';
import { mockAuth } from '$lib/auth/mock-auth.js';

export async function POST({ request, cookies }) {
	const { action, ...data } = await request.json();
	
	try {
		let result;
		
		switch (action) {
			case 'signUp':
				result = await mockAuth.signUp(data);
				cookies.set('session', result.session.id, {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 7 // 7 days
				});
				break;
				
			case 'signIn':
				result = await mockAuth.signIn(data);
				cookies.set('session', result.session.id, {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 7 // 7 days
				});
				break;
				
			case 'signOut':
				const sessionId = cookies.get('session');
				if (sessionId) {
					await mockAuth.signOut(sessionId);
					cookies.delete('session', { path: '/' });
				}
				result = { success: true };
				break;
				
			case 'getSession':
				const sid = cookies.get('session');
				if (!sid) {
					return json({ data: null });
				}
				const session = await mockAuth.getSession(sid);
				result = { data: session };
				break;
				
			default:
				throw new Error('Invalid action');
		}
		
		return json(result);
	} catch (error) {
		return json({ error: error.message }, { status: 400 });
	}
}