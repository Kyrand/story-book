import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Disable webServer for now - use existing dev server
  // webServer: {
  //   command: "npm run build && npm run preview",
  //   port: 4173,
  // },
  testDir: "e2e",
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
