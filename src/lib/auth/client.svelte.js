// Better-Auth client utilities
import { createAuthClient } from 'better-auth/client';
import { browser } from '$app/environment';

// Only create auth client on the browser side
export const authClient = browser ? createAuthClient({
	baseURL: `${window.location.origin}/api/auth`,
}) : null;

// Mock auth client for development fallback
const mockAuthClient = browser ? {
	signIn: {
		email: async ({ email, password }) => {
			const response = await fetch('/api/auth/mock', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'signIn', email, password })
			});
			return response.json();
		}
	},
	
	signUp: {
		email: async ({ email, password, name }) => {
			const response = await fetch('/api/auth/mock', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'signUp', email, password, name })
			});
			return response.json();
		}
	},
	
	getSession: async () => {
		const response = await fetch('/api/auth/mock', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'getSession' })
		});
		return response.json();
	},
	
	signOut: async () => {
		const response = await fetch('/api/auth/mock', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'signOut' })
		});
		return response.json();
	}
} : null;

// Use mock auth if better-auth is not available
const activeAuthClient = authClient || mockAuthClient;

// Log which auth client is being used
if (browser) {
	console.log('🔐 Auth client initialization:', {
		usingBetterAuth: !!authClient,
		usingMockAuth: !!mockAuthClient && !authClient,
		hasActiveClient: !!activeAuthClient
	});
}

// Simple auth functions - no runes outside Svelte
export const authAPI = {
	async signIn(email, password) {
		console.log('🔐 AuthAPI: Attempting sign in for:', email);
		
		if (!activeAuthClient) {
			console.error('🔐 AuthAPI: No active auth client available');
			return { success: false, error: 'Auth client not available' };
		}
		
		try {
			console.log('🔐 AuthAPI: Calling activeAuthClient.signIn.email');
			const result = await activeAuthClient.signIn.email({
				email,
				password,
			});
			
			console.log('🔐 AuthAPI: Sign in result:', { 
				hasUser: !!(result.user || result.data?.user), 
				hasSession: !!(result.session || result.data?.session),
				hasError: !!result.error 
			});
			
			if (result.user || result.data) {
				console.log('🔐 AuthAPI: Sign in successful');
				return { 
					success: true, 
					user: result.user || result.data.user,
					session: result.session || result.data.session
				};
			} else {
				const errorMsg = result.error?.message || result.error || 'Sign in failed';
				console.error('🔐 AuthAPI: Sign in failed:', errorMsg);
				return { success: false, error: errorMsg };
			}
		} catch (error) {
			console.error('🔐 AuthAPI: Sign in error:', error);
			return { success: false, error: error.message || 'Authentication error' };
		}
	},
	
	async signUp(email, password, name) {
		console.log('🔐 AuthAPI: Attempting sign up for:', email, 'with name:', name);
		
		if (!activeAuthClient) {
			console.error('🔐 AuthAPI: No active auth client available for sign up');
			return { success: false, error: 'Auth client not available' };
		}
		
		try {
			console.log('🔐 AuthAPI: Calling activeAuthClient.signUp.email');
			const result = await activeAuthClient.signUp.email({
				email,
				password,
				name,
			});
			
			console.log('🔐 AuthAPI: Sign up result:', { 
				hasUser: !!(result.user || result.data?.user), 
				hasSession: !!(result.session || result.data?.session),
				hasError: !!result.error 
			});
			
			if (result.user || result.data) {
				console.log('🔐 AuthAPI: Sign up successful');
				return { 
					success: true, 
					user: result.user || result.data.user,
					session: result.session || result.data.session
				};
			} else {
				const errorMsg = result.error?.message || result.error || 'Sign up failed';
				console.error('🔐 AuthAPI: Sign up failed:', errorMsg);
				return { success: false, error: errorMsg };
			}
		} catch (error) {
			console.error('🔐 AuthAPI: Sign up error:', error);
			return { success: false, error: error.message || 'Registration error' };
		}
	},
	
	async getSession() {
		console.log('🔐 AuthAPI: Getting current session');
		
		if (!activeAuthClient) {
			console.error('🔐 AuthAPI: No active auth client available for getSession');
			return { success: false, error: 'Auth client not available' };
		}
		
		try {
			console.log('🔐 AuthAPI: Calling activeAuthClient.getSession');
			const sessionData = await activeAuthClient.getSession();
			
			console.log('🔐 AuthAPI: Session data received:', { 
				hasData: !!sessionData.data,
				hasUser: !!sessionData.data?.user,
				hasSession: !!sessionData.data?.session 
			});
			
			if (sessionData.data) {
				console.log('🔐 AuthAPI: Session found');
				return { 
					success: true, 
					user: sessionData.data.user,
					session: sessionData.data.session
				};
			}
			console.log('🔐 AuthAPI: No session found');
			return { success: true, user: null, session: null };
		} catch (error) {
			console.error('🔐 AuthAPI: Get session error:', error);
			return { success: false, error: error.message || 'Session retrieval error' };
		}
	},
	
	async signOut() {
		console.log('🔐 AuthAPI: Attempting sign out');
		
		if (!activeAuthClient) {
			console.error('🔐 AuthAPI: No active auth client available for signOut');
			return { success: false, error: 'Auth client not available' };
		}
		
		try {
			console.log('🔐 AuthAPI: Calling activeAuthClient.signOut');
			await activeAuthClient.signOut();
			console.log('🔐 AuthAPI: Sign out successful');
			return { success: true };
		} catch (error) {
			console.error('🔐 AuthAPI: Sign out error:', error);
			return { success: false, error: error.message || 'Sign out error' };
		}
	}
};

// Svelte component specific auth store (uses runes properly)
export function createAuthStore() {
	let user = $state(null);
	let session = $state(null);
	let loading = $state(true);

	return {
		get user() { return user; },
		get session() { return session; },
		get loading() { return loading; },
		get isAuthenticated() { return !!user; },
		
		async init() {
			loading = true;
			const result = await authAPI.getSession();
			if (result.success) {
				user = result.user;
				session = result.session;
			}
			loading = false;
		},
		
		async signIn(email, password) {
			const result = await authAPI.signIn(email, password);
			if (result.success) {
				user = result.user;
				session = result.session;
			}
			return result;
		},
		
		async signUp(email, password, name) {
			const result = await authAPI.signUp(email, password, name);
			if (result.success) {
				user = result.user;
				session = result.session;
			}
			return result;
		},
		
		async signOut() {
			const result = await authAPI.signOut();
			if (result.success) {
				user = null;
				session = null;
			}
			return result;
		}
	};
}