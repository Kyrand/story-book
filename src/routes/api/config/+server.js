import { json } from '@sveltejs/kit';
import { loadConfig } from '$lib/config/index.js';

export function GET() {
	try {
		const config = loadConfig();
		
		// Only send client-safe configuration (exclude sensitive server settings)
		const clientConfig = {
			featureTable: config.featureTable,
			map: config.map,
			search: config.search,
			ui: config.ui,
			featureColors: config.featureColors
		};
		
		// Add OS Maps API key if available (from environment variable)
		if (process.env.OS_MAPS_API_KEY) {
			clientConfig.osMapsApiKey = process.env.OS_MAPS_API_KEY;
		}

		return json(clientConfig);
	} catch (error) {
		console.error('Error loading configuration:', error);
		return json({ error: 'Failed to load configuration' }, { status: 500 });
	}
}