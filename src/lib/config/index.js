import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

let configCache = null;

/**
 * Load and parse the configuration file
 * @returns {Object} The configuration object
 */
export function loadConfig() {
	if (configCache) {
		return configCache;
	}

	try {
		const configPath = join(process.cwd(), 'config.yaml');
		const configFile = readFileSync(configPath, 'utf8');
		configCache = yaml.load(configFile);
		console.log('✅ Configuration loaded successfully');
		return configCache;
	} catch (error) {
		console.warn('⚠️ Could not load config.yaml, using defaults:', error.message);
		// Return default configuration if file doesn't exist
		return getDefaultConfig();
	}
}

/**
 * Get a specific configuration value with dot notation
 * @param {string} path - The configuration path (e.g., 'featureTable.pageSize')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} The configuration value
 */
export function getConfig(path, defaultValue = null) {
	const config = loadConfig();
	const keys = path.split('.');
	let value = config;

	for (const key of keys) {
		if (value && typeof value === 'object' && key in value) {
			value = value[key];
		} else {
			return defaultValue;
		}
	}

	return value;
}

/**
 * Default configuration fallback
 * @returns {Object} Default configuration object
 */
function getDefaultConfig() {
	return {
		featureTable: {
			pageSize: 30,
			compactMode: true,
			showDistance: true,
			showType: true,
			showDescription: true
		},
		map: {
			defaultCenter: { lat: 54.5, lng: -2.5 },
			defaultZoom: 6,
			maxZoom: 19,
			minZoom: 3
		},
		search: {
			defaultRadius: 1000,
			availableRadii: [500, 1000, 2000, 5000],
			maxFeatures: 1000
		},
		ui: {
			animation: {
				enabled: true,
				duration: 200
			},
			colors: {
				primary: '#3b82f6',
				success: '#10b981',
				warning: '#f59e0b',
				error: '#ef4444'
			}
		},
		featureColors: {
			highway: '#10b981',
			waterway: '#3b82f6',
			building: '#6b7280',
			amenity: '#f59e0b',
			natural: '#059669',
			landuse: '#ea580c',
			railway: '#7c3aed',
			default: '#64748b'
		}
	};
}