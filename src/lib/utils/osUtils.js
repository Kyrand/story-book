import * as turf from "@turf/turf";
import proj4 from "proj4";

// Define coordinate system transformations
// EPSG:4326 = WGS84 (longitude, latitude)
// EPSG:27700 = British National Grid (easting, northing)
const wgs84 = "EPSG:4326";
const britishNationalGrid =
  "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs";

// Configure proj4 for British National Grid
proj4.defs("EPSG:27700", britishNationalGrid);

/**
 * Query OS Features API for geographical features near a polygon
 * @param {Array<Array<number>>} coordinates - Polygon coordinates [lng, lat]
 * @param {number} radiusMeters - Search radius in meters
 * @param {string} apiKey - OS Maps API key
 * @returns {Promise<any[]>} Array of geographical features
 */
export async function queryNearbyOSFeatures(
  coordinates,
  radiusMeters = 1000,
  apiKey,
) {
  if (!coordinates || coordinates.length < 3) {
    return [];
  }

  if (!apiKey) {
    console.warn("OS Maps API key not provided for features query");
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
      console.warn("Polygon must have at least 4 positions, skipping OS query");
      return [];
    }

    // Create a polygon from coordinates and get its center
    const polygon = turf.polygon([polygonCoords]);
    const center = turf.centroid(polygon);
    const [lng, lat] = center.geometry.coordinates;

    // Transform WGS84 coordinates to British National Grid
    const [easting, northing] = proj4(wgs84, "EPSG:27700", [lng, lat]);

    // Transform polygon coordinates to BNG for spatial query
    const bngPolygonCoords = polygonCoords.map(([lng, lat]) => {
      const [e, n] = proj4(wgs84, "EPSG:27700", [lng, lat]);
      return [e, n];
    });

    console.log(
      `🔍 Querying OS Features API near ${easting.toFixed(0)}, ${northing.toFixed(0)} (BNG)`,
    );

    // Query different feature types in parallel for better performance
    // Note: Water features are not available in NGD API
    const featureQueries = [
      queryOSFeatureType("Buildings", bngPolygonCoords, apiKey, polygon),
      queryOSFeatureType("Roads", bngPolygonCoords, apiKey, polygon),
      queryOSFeatureType("Railways", bngPolygonCoords, apiKey, polygon),
      queryOSFeatureType("Natural", bngPolygonCoords, apiKey, polygon),
    ];

    // Execute all queries in parallel
    const results = await Promise.allSettled(featureQueries);

    // Combine all successful results
    let allFeatures = [];
    results.forEach((result, index) => {
      const featureTypes = ["Buildings", "Roads", "Railways", "Natural"];
      if (result.status === "fulfilled") {
        allFeatures = allFeatures.concat(result.value);
        console.log(
          `✅ OS ${featureTypes[index]}: ${result.value.length} features`,
        );
      } else {
        console.warn(
          `❌ OS ${featureTypes[index]} query failed:`,
          result.reason,
        );
      }
    });

    // Process and calculate distances
    const processedFeatures = processOSData(allFeatures, polygon);

    // Sort by distance and limit results
    const sortedFeatures = processedFeatures.sort(
      (a, b) => a.distance - b.distance,
    );
    const limitedFeatures = sortedFeatures.slice(0, 500); // Increased limit to 500 features

    console.log(`✅ Found ${limitedFeatures.length} OS features total`);
    return limitedFeatures;
  } catch (error) {
    console.error("Error querying OS Features API:", error);
    return [];
  }
}

/**
 * Query OS Features API for a specific feature type
 * @param {string} featureType - Type of features to query
 * @param {Array<Array<number>>} polygonCoords - Polygon coordinates in BNG
 * @param {string} apiKey - OS Maps API key
 * @param {any} polygon - Turf polygon for distance calculation
 * @returns {Promise<any[]>} Array of features
 */
async function queryOSFeatureType(featureType, polygonCoords, apiKey, polygon) {
  const typeName = getOSFeatureTypeName(featureType);
  if (!typeName) {
    return [];
  }

  // Build NGD REST API URL
  const ngdUrl = buildOSWFSUrl(typeName, polygonCoords, apiKey);

  try {
    console.log(
      `🔗 NGD Features API URL: ${ngdUrl.replace(apiKey, "API_KEY_HIDDEN")}`,
    );

    // Query NGD Features API using GET request
    const response = await fetch(ngdUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ OS Features API error: ${response.status} ${response.statusText}`,
      );
      console.error(`Response body: ${errorText}`);
      throw new Error(
        `OS Features API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log(`📦 OS ${featureType} API response:`, {
      type: data.type,
      featureCount: data.features?.length || 0,
      crs: data.crs,
    });

    // Debug: Log some sample features to see their properties
    if (
      data.features &&
      data.features.length > 0 &&
      featureType === "Buildings"
    ) {
      console.log(
        `🏢 Sample OS building features:`,
        data.features.slice(0, 3).map((f) => ({
          id: f.id,
          descriptiveGroup: f.properties?.descriptiveGroup,
          descriptiveTerm: f.properties?.descriptiveTerm,
          properties: Object.keys(f.properties || {}),
        })),
      );
    }

    // Process the features and tag them with the query type
    const features = data.features || [];

    // Debug: Check CRS of returned data
    if (data.crs) {
      console.log(`📐 NGD ${featureType} response CRS:`, data.crs);
    }

    // Debug: Sample feature geometry
    if (features.length > 0 && features[0].geometry) {
      console.log(
        `📍 Sample ${featureType} coordinates:`,
        features[0].geometry.coordinates.slice(0, 2),
      );
    }

    return features.map((feature) => ({
      ...feature,
      _queryType: featureType, // Tag with the type we queried for
    }));
  } catch (error) {
    console.error(`❌ Error querying OS ${featureType}:`, error);
    return [];
  }
}

/**
 * Get OS Feature type name for WFS query
 * @param {string} featureType - Generic feature type
 * @returns {string|null} OS feature type name
 */
function getOSFeatureTypeName(featureType) {
  // NGD Features API uses these collection names (with version numbers)
  const typeMapping = {
    Buildings: "bld-fts-building-1", // NGD building collection v1
    Roads: "trn-fts-roadtrackorpath-1", // NGD road/track/path collection v1
    Railways: "trn-fts-rail-1", // NGD rail collection v1
    Water: null, // No water collections available in NGD
    Natural: "lnd-fts-landform-1", // NGD landform collection v1
  };

  return typeMapping[featureType] || null;
}

/**
 * Build WFS URL for OS Features API GET request
 * @param {string} typeName - OS feature type name
 * @param {Array<Array<number>>} polygonCoords - Polygon coordinates in BNG
 * @param {string} apiKey - OS Maps API key
 * @returns {string} WFS URL
 */
function buildOSWFSUrl(typeName, polygonCoords, apiKey) {
  // NGD API uses REST-style URLs, not WFS parameters
  console.log(`🔧 Building NGD URL for collection: ${typeName}`);
  const baseUrl = `https://api.os.uk/features/ngd/ofa/v1/collections/${typeName}/items`;

  // Convert BNG coordinates back to WGS84 for the bbox (NGD API expects WGS84 bbox)
  const wgs84Coords = polygonCoords.map(([e, n]) => {
    const [lng, lat] = proj4("EPSG:27700", wgs84, [e, n]);
    return [lng, lat];
  });

  // Create a bounding box from WGS84 coordinates
  const longitudes = wgs84Coords.map(([lng, lat]) => lng);
  const latitudes = wgs84Coords.map(([lng, lat]) => lat);

  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);

  // Add padding (convert 500m to degrees approximately)
  const paddingDegrees = 0.005; // roughly 500m at UK latitudes
  const bbox = `${minLng - paddingDegrees},${minLat - paddingDegrees},${maxLng + paddingDegrees},${maxLat + paddingDegrees}`;

  // NGD API uses REST parameters - use WGS84 CRS for compatibility
  const params = new URLSearchParams({
    bbox: bbox,
    crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
    limit: "200",
    key: apiKey,
  });

  const finalUrl = `${baseUrl}?${params.toString()}`;
  console.log(
    `🔧 Final NGD URL: ${finalUrl.replace(apiKey, "API_KEY_HIDDEN")}`,
  );
  return finalUrl;
}

/**
 * Process OS Features API response data
 * @param {any[]} features - OS Features API response features
 * @param {any} polygon - Turf polygon for distance calculation
 * @returns {any[]} Processed features with distance information
 */
function processOSData(features, polygon) {
  const processedFeatures = [];

  if (!features || features.length === 0) {
    return processedFeatures;
  }

  features.forEach((feature) => {
    try {
      const processed = processOSFeature(feature, polygon);
      if (processed) {
        processedFeatures.push(processed);
      }
    } catch (error) {
      console.warn("Error processing OS feature:", feature.id, error);
    }
  });

  return processedFeatures;
}

/**
 * Process individual OS feature
 * @param {any} feature - OS feature from Features API
 * @param {any} polygon - Turf polygon for distance calculation
 * @returns {any|null} Processed feature or null
 */
function processOSFeature(feature, polygon) {
  if (!feature.properties) {
    return null;
  }

  // Determine feature type and subtype from OS properties and query type
  const { type, subtype } = determineOSFeatureType(
    feature.properties,
    feature._queryType,
  );

  // Get geometry - OS Features API returns features in BNG, need to transform
  const geometry = transformOSGeometry(feature.geometry);
  if (!geometry) {
    return null;
  }

  // Calculate distance to polygon
  let distance;
  try {
    // Use polygon centroid for distance calculation
    const polygonCenter = turf.centroid(polygon);

    if (geometry.type === "Point") {
      distance = turf.distance(polygonCenter, geometry, { units: "meters" });
    } else if (geometry.type === "LineString") {
      const lineCenter = turf.centroid(geometry);
      distance = turf.distance(polygonCenter, lineCenter, { units: "meters" });
    } else if (geometry.type === "Polygon") {
      const geomCenter = turf.centroid(geometry);
      distance = turf.distance(polygonCenter, geomCenter, { units: "meters" });
    } else {
      // Fallback
      const geomCenter = turf.centroid(geometry);
      distance = turf.distance(polygonCenter, geomCenter, { units: "meters" });
    }
  } catch (distanceError) {
    console.warn(
      "Error calculating distance for OS feature:",
      feature.id,
      distanceError,
    );
    distance = 9999;
  }

  const result = {
    id: feature.id,
    type,
    subtype,
    tags: transformOSPropertiesToTags(feature.properties),
    distance: Math.round(distance),
    geometry: geometry.geometry || geometry,
    source: "ordnance-survey",
  };

  // Debug: Log the processed feature
  if (!type || type === "unknown") {
    console.log("🐛 OS Feature with unknown type:", {
      id: feature.id,
      queryType: feature._queryType,
      properties: feature.properties,
      processedType: type,
      processedSubtype: subtype,
    });
  }

  return result;
}

/**
 * Transform OS geometry if needed (NGD API returns in CRS84/WGS84)
 * @param {any} geometry - OS geometry (already in WGS84 from NGD API)
 * @returns {any|null} Geometry as Turf object
 */
function transformOSGeometry(geometry) {
  if (!geometry) return null;

  try {
    // NGD API with CRS84 returns coordinates in WGS84 (longitude, latitude)
    // No transformation needed, just create Turf objects
    if (geometry.type === "Point") {
      return turf.point(geometry.coordinates);
    } else if (geometry.type === "LineString") {
      return turf.lineString(geometry.coordinates);
    } else if (geometry.type === "Polygon") {
      return turf.polygon(geometry.coordinates);
    } else if (geometry.type === "MultiPolygon") {
      // For simplicity, use the first polygon
      return turf.polygon(geometry.coordinates[0]);
    }
  } catch (error) {
    console.warn("Error processing OS geometry:", error);
    return null;
  }

  return null;
}

/**
 * Determine feature type and subtype from OS properties
 * @param {any} properties - OS feature properties
 * @param {string} queryType - The type we queried for (Buildings, Roads, etc.)
 * @returns {any} Object with type and subtype
 */
function determineOSFeatureType(properties, queryType) {
  // First, use the query type to determine the primary type
  const typeMap = {
    Buildings: "building",
    Roads: "highway",
    Railways: "railway",
    Water: "waterway",
    Natural: "natural",
  };

  const primaryType = typeMap[queryType] || "unknown";

  // NGD uses different property names than the old MasterMap
  const descriptiveGroup =
    properties.descriptiveGroup || properties.theme || properties.function;
  const descriptiveTerm =
    properties.descriptiveTerm || properties.form || properties.class;

  // Use queryType as primary type determination for NGD
  let subtype = "Unknown";

  if (descriptiveTerm) {
    subtype = formatFeatureType(descriptiveTerm);
  } else if (descriptiveGroup) {
    subtype = formatFeatureType(descriptiveGroup);
  } else if (queryType) {
    // Fallback to query type
    subtype = queryType;
  }

  // For roads, use more specific info if available
  if (
    primaryType === "highway" &&
    (properties.roadClassification || properties.classification)
  ) {
    subtype = formatFeatureType(
      properties.roadClassification || properties.classification,
    );
  }

  // For buildings, use more specific info if available
  if (
    primaryType === "building" &&
    (properties.buildingFunction || properties.theme)
  ) {
    subtype = formatFeatureType(
      properties.buildingFunction || properties.theme,
    );
  }

  return {
    type: primaryType,
    subtype: subtype,
  };
}

/**
 * Transform OS properties to OSM-style tags for compatibility
 * @param {any} properties - OS properties
 * @returns {any} OSM-style tags
 */
function transformOSPropertiesToTags(properties) {
  const tags = {};

  // Map common OS properties to OSM tags
  if (properties.descriptiveGroup) {
    tags.feature_type = properties.descriptiveGroup;
  }

  if (properties.descriptiveTerm) {
    tags.feature_subtype = properties.descriptiveTerm;
  }

  if (properties.make) {
    tags.surface = properties.make;
  }

  if (properties.reasonForChange) {
    tags.change_reason = properties.reasonForChange;
  }

  // Add a name if available
  if (properties.name) {
    tags.name = properties.name;
  } else if (properties.descriptiveTerm) {
    tags.name = formatFeatureType(properties.descriptiveTerm);
  }

  return tags;
}

/**
 * Format feature type for display
 * @param {string} type - Raw OS type
 * @returns {string} Formatted type
 */
function formatFeatureType(type) {
  return type
    .split(/[_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
