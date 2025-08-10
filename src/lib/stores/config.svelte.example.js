import { browser } from "$app/environment";

// Default configuration for immediate use
const defaultConfig = {
  featureTable: {
    pageSize: 30,
    compactMode: true,
    showDistance: true,
    showType: true,
    showDescription: true,
  },
  map: {
    defaultCenter: { lat: 54.5, lng: -2.5 },
    defaultZoom: 6,
    maxZoom: 19,
    minZoom: 3,
  },
  search: {
    defaultRadius: 1000,
    availableRadii: [500, 1000, 2000, 5000],
    maxFeatures: 1000,
  },
  ui: {
    animation: {
      enabled: true,
      duration: 200,
    },
    colors: {
      primary: "#3b82f6",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
    },
  },
  featureColors: {
    highway: "#10b981",
    waterway: "#3b82f6",
    building: "#6b7280",
    amenity: "#f59e0b",
    natural: "#059669",
    landuse: "#ea580c",
    railway: "#7c3aed",
    default: "#64748b",
  },
};

class ConfigStore {
  #config = $state(defaultConfig);
  #loaded = $state(false);
  #loading = $state(false);
  #osMapsApiKey = $state(null);

  get config() {
    return this.#config;
  }

  get loaded() {
    return this.#loaded;
  }

  get loading() {
    return this.#loading;
  }

  get osMapsApiKey() {
    return this.#osMapsApiKey;
  }

  async load() {
    if (!browser || this.#loaded || this.#loading) return;

    this.#loading = true;
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const serverConfig = await response.json();

        // Extract OS Maps API key if present
        if (serverConfig.osMapsApiKey) {
          this.#osMapsApiKey = serverConfig.osMapsApiKey;
          delete serverConfig.osMapsApiKey; // Remove from config object
        }

        this.#config = { ...defaultConfig, ...serverConfig };
        console.log("✅ Configuration loaded from server");
      } else {
        console.warn("⚠️ Failed to load server config, using defaults");
      }
    } catch (error) {
      console.warn("⚠️ Error loading config, using defaults:", error);
    } finally {
      this.#loaded = true;
      this.#loading = false;
    }
  }

  /**
   * Get a configuration value using dot notation
   * @param {string} path - The configuration path (e.g., 'featureTable.pageSize')
   * @param {*} defaultValue - Default value if path not found
   * @returns {*} The configuration value
   */
  get(path, defaultValue = null) {
    const keys = path.split(".");
    let value = this.#config;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }
}

// Export singleton instance
export const config = new ConfigStore();
