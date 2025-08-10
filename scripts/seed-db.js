// Database seeding script
import { ensureDatabase } from "../src/lib/db/init.js";
import { getAuth } from "../src/lib/auth/config.js";
import { seedDatabase } from "../src/lib/db/schema.js";

async function seedTestUser() {
  // Ensure database is ready
  await ensureDatabase();

  const auth = getAuth();
  if (!auth) {
    console.error("❌ Auth service not available");
    return;
  }

  try {
    // Create test user using better-auth with Story Book credentials
    const result = await auth.api.signUpEmail({
      body: {
        email: "kyran@storybook.test",
        password: "storybook",
        name: "kyran",
      },
    });

    if (result) {
      console.log(
        "✅ Test user created successfully: kyran@storybook.test / storybook",
      );
    }
  } catch (error) {
    if (
      error.message?.includes("already exists") ||
      error.message?.includes("duplicate")
    ) {
      console.log("ℹ️ Test user already exists");
    } else {
      console.error("❌ Error creating test user:", error);
    }
  }
}

// Run the seeding
async function run() {
  // Seed the database with books and other data
  await seedDatabase();

  // Create test user
  await seedTestUser();

  console.log("✅ Database seeding complete");
}

run().catch(console.error);
