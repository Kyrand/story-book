import * as turf from '@turf/turf';
import { queryNearbyOSFeatures } from './osUtils.js';
import { config } from '$lib/stores/config.svelte.example.js';

/**
 * Query for geographical features near a polygon using the appropriate provider
 * @param {Array<Array<number>>} coordinates - Polygon coordinates [lng, lat]
 * @param {number} radiusMeters - Search radius in meters
 * @param {string} mapProvider - Map provider ('osm' or 'os')
 * @returns {Promise<any[]>} Array of geographical features
 */
export async function queryNearbyFeatures(coordinates, radiusMeters = 1000, mapProvider = 'osm') {
	if (mapProvider === 'os') {
		// Use OS Features API for Ordnance Survey data
		const apiKey = config.osMapsApiKey;
		if (!apiKey) {
			console.warn('OS Maps API key not available, falling back to OSM');
			return await queryNearbyOSMFeatures(coordinates, radiusMeters);
		}
		return await queryNearbyOSFeatures(coordinates, radiusMeters, apiKey);
	} else {
		// Use Overpass API for OpenStreetMap data
		return await queryNearbyOSMFeatures(coordinates, radiusMeters);
	}
}

/**
 * Query Overpass API for OpenStreetMap features near a polygon
 * @param {Array<Array<number>>} coordinates - Polygon coordinates [lng, lat]
 * @param {number} radiusMeters - Search radius in meters
 * @returns {Promise<any[]>} Array of geographical features
 */
export async function queryNearbyOSMFeatures(coordinates, radiusMeters = 1000) {
	if (!coordinates || coordinates.length < 3) {
		return [];
	}

	try {
		// Ensure the coordinates form a valid polygon (closed ring with 4+ positions)
		let polygonCoords = [...coordinates];

		// If the polygon is not closed, close it
		const first = polygonCoords[0];
		const last = polygonCoords[polygonCoords.length - 1];
		if (first[0] !== last[0] || first[1] !== last[1]) {
			polygonCoords.push([first[0], first[1]]);
		}

		// Ensure we have at least 4 positions (minimum for a valid polygon)
		if (polygonCoords.length < 4) {
			console.warn('Polygon must have at least 4 positions, skipping query');
			return [];
		}

		// Create a polygon from coordinates
		const polygon = turf.polygon([polygonCoords]);
		const center = turf.centroid(polygon);
		const [lng, lat] = center.geometry.coordinates;

		// Build Overpass query
		const query = buildOverpassQuery(lat, lng, radiusMeters);

		// Query Overpass API
		const response = await fetch('https://overpass-api.de/api/interpreter', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
			},
			body: `data=${encodeURIComponent(query)}`
		});

		if (!response.ok) {
			throw new Error(`Overpass API error: ${response.status}`);
		}

		const data = await response.json();

		// Process and calculate distances
		const features = processOverpassData(data, polygon);

		// Sort by distance
		return features.sort((a, b) => a.distance - b.distance);
	} catch (error) {
		console.error('Error querying geographical features:', error);
		return [];
	}
}

/**
 * Build Overpass QL query for geographical features
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Search radius in meters
 * @returns {string} Overpass QL query
 */
function buildOverpassQuery(lat, lng, radius) {
	return `
[out:json][timeout:25];
(
  // Roads and paths
  way["highway"~"^(primary|secondary|tertiary|residential|footway|cycleway|bridleway|path|track)$"](around:${radius},${lat},${lng});

  // Waterways
  way["waterway"~"^(river|stream|canal|ditch|drain)$"](around:${radius},${lat},${lng});

  // Buildings
  way["building"](around:${radius},${lat},${lng});
  relation["building"](around:${radius},${lat},${lng});

  // Natural features
  way["natural"~"^(water|wood|forest|grassland|heath|moor|fell|cliff|peak)$"](around:${radius},${lat},${lng});

  // Amenities
  way["amenity"](around:${radius},${lat},${lng});
  node["amenity"](around:${radius},${lat},${lng});

  // Railways
  way["railway"~"^(rail|subway|tram|light_rail)$"](around:${radius},${lat},${lng});

  // Land use
  way["landuse"~"^(forest|farmland|residential|commercial|industrial|recreation_ground)$"](around:${radius},${lat},${lng});
);
out geom;
`;
}

/**
 * Process Overpass API response data
 * @param {any} data - Overpass API response
 * @param {any} polygon - Turf polygon for distance calculation
 * @returns {any[]} Processed features with distance information
 */
function processOverpassData(data, polygon) {
	const features = [];

	if (!data.elements) {
		return features;
	}

	data.elements.forEach((element) => {
		try {
			const feature = processElement(element, polygon);
			if (feature) {
				features.push(feature);
			}
		} catch (error) {
			console.warn('Error processing element:', element.id, error);
		}
	});

	return features;
}

/**
 * Process individual OSM element
 * @param {any} element - OSM element from Overpass API
 * @param {any} polygon - Turf polygon for distance calculation
 * @returns {any|null} Processed feature or null
 */
function processElement(element, polygon) {
	if (!element.tags) {
		return null;
	}

	// Determine feature type and subtype
	const { type, subtype } = determineFeatureType(element.tags);

	// Get geometry for distance calculation
	const geometry = getElementGeometry(element);
	if (!geometry) {
		return null;
	}

	// Calculate distance to polygon
	let distance;
	try {
		// Use polygon centroid for distance calculation to avoid coordinate issues
		const polygonCenter = turf.centroid(polygon);

		if (geometry.type === 'Point') {
			distance = turf.distance(polygonCenter, geometry, { units: 'meters' });
		} else if (geometry.type === 'LineString') {
			// For lines, calculate distance to the centroid of the line
			const lineCenter = turf.centroid(geometry);
			distance = turf.distance(polygonCenter, lineCenter, { units: 'meters' });
		} else if (geometry.type === 'Polygon') {
			// For polygons, calculate distance between centroids
			const geomCenter = turf.centroid(geometry);
			distance = turf.distance(polygonCenter, geomCenter, { units: 'meters' });
		} else {
			// Fallback: try to get centroid of any geometry
			const geomCenter = turf.centroid(geometry);
			distance = turf.distance(polygonCenter, geomCenter, { units: 'meters' });
		}
	} catch (distanceError) {
		console.warn('Error calculating distance for element:', element.id, distanceError);
		distance = 9999; // Default large distance for failed calculations
	}

	return {
		id: element.id,
		type,
		subtype,
		tags: element.tags,
		distance: Math.round(distance),
		geometry: geometry.geometry || geometry
	};
}

/**
 * Determine feature type and subtype from OSM tags
 * @param {any} tags - OSM tags
 * @returns {any} Object with type and subtype
 */
function determineFeatureType(tags) {
	// Highway (roads, paths, etc.)
	if (tags.highway) {
		return {
			type: 'highway',
			subtype: formatFeatureType(tags.highway)
		};
	}

	// Waterway
	if (tags.waterway) {
		return {
			type: 'waterway',
			subtype: formatFeatureType(tags.waterway)
		};
	}

	// Building
	if (tags.building) {
		return {
			type: 'building',
			subtype: tags.building === 'yes' ? 'Building' : formatFeatureType(tags.building)
		};
	}

	// Natural features
	if (tags.natural) {
		return {
			type: 'natural',
			subtype: formatFeatureType(tags.natural)
		};
	}

	// Amenities
	if (tags.amenity) {
		return {
			type: 'amenity',
			subtype: formatFeatureType(tags.amenity)
		};
	}

	// Railway
	if (tags.railway) {
		return {
			type: 'railway',
			subtype: formatFeatureType(tags.railway)
		};
	}

	// Land use
	if (tags.landuse) {
		return {
			type: 'landuse',
			subtype: formatFeatureType(tags.landuse)
		};
	}

	return {
		type: 'unknown',
		subtype: 'Unknown'
	};
}

/**
 * Format feature type for display
 * @param {string} type - Raw OSM type
 * @returns {string} Formatted type
 */
function formatFeatureType(type) {
	return type
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/**
 * Extract geometry from OSM element
 * @param {any} element - OSM element
 * @returns {any|null} Turf geometry or null
 */
function getElementGeometry(element) {
	if (element.type === 'node') {
		return turf.point([element.lon, element.lat]);
	}

	if (element.type === 'way' && element.geometry) {
		const coordinates = element.geometry.map((node) => [node.lon, node.lat]);

		if (coordinates.length < 2) {
			return null;
		}

		// Check if it's a closed way (polygon)
		const first = coordinates[0];
		const last = coordinates[coordinates.length - 1];

		if (first[0] === last[0] && first[1] === last[1] && coordinates.length > 3) {
			return turf.polygon([coordinates]);
		} else {
			return turf.lineString(coordinates);
		}
	}

	if (element.type === 'relation' && element.members) {
		// For relations, try to use the first way member as representative geometry
		const wayMember = element.members.find((member) => member.type === 'way' && member.geometry);
		if (wayMember && wayMember.geometry) {
			const coordinates = wayMember.geometry.map((node) => [node.lon, node.lat]);
			if (coordinates.length >= 2) {
				return turf.lineString(coordinates);
			}
		}
	}

	return null;
}
