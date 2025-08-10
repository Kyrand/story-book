// Better-Auth configuration
import { betterAuth } from "better-auth";
import { getDatabase } from "../db/schema.js";

let authInstance = null;

export function getAuth() {
  if (!authInstance) {
    const db = getDatabase();
    if (db) {
      authInstance = betterAuth({
        database: db,
        emailAndPassword: {
          enabled: true,
          requireEmailVerification: false,
        },
        session: {
          expiresIn: 60 * 60 * 24 * 7, // 7 days
          updateAge: 60 * 60 * 24, // 1 day
        },
        user: {
          additionalFields: {
            name: {
              type: "string",
              required: false,
            },
          },
        },
        trustedOrigins: ["http://localhost:5173", "http://localhost:4173"],
      });
    }
  }
  return authInstance;
}

// Backward compatibility
export const auth = getAuth();
