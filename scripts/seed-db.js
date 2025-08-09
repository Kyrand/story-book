// Database seeding script
import { ensureDatabase } from '../src/lib/db/init.js';
import { getAuth } from '../src/lib/auth/config.js';

async function seedTestUser() {
	// Ensure database is ready
	ensureDatabase();
	
	const auth = getAuth();
	if (!auth) {
		console.error('❌ Auth service not available');
		return;
	}
	
	try {
		// Create test user using better-auth
		const result = await auth.api.signUpEmail({
			body: {
				email: 'kyran@geoproj.test',
				password: 'geoprojector',
				name: 'kyran'
			}
		});
		
		if (result) {
			console.log('✅ Test user created successfully');
		}
	} catch (error) {
		if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
			console.log('ℹ️ Test user already exists');
		} else {
			console.error('❌ Error creating test user:', error);
		}
	}
}

// Run the seeding
seedTestUser().catch(console.error);