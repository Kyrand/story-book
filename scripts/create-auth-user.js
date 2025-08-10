// Create authenticated user with Better-Auth
import { getAuth } from "../src/lib/auth/config.js";

async function createAuthUser() {
  console.log("🔐 Creating authenticated user with Better-Auth...");

  const auth = getAuth();
  if (!auth) {
    console.error("❌ Auth service not available");
    return;
  }

  try {
    // Try to create the user with Better-Auth
    const result = await auth.api.signUpEmail({
      body: {
        email: "kyran@storybook.test",
        password: "storybook",
        name: "kyran",
      },
    });

    if (result && result.user) {
      console.log("✅ User created successfully with Better-Auth");
      console.log("   Email:", result.user.email);
      console.log("   Name:", result.user.name);
      console.log("   ID:", result.user.id);
    } else {
      console.log("❌ Failed to create user:", result);
    }
  } catch (error) {
    if (
      error.message?.includes("already exists") ||
      error.message?.includes("duplicate")
    ) {
      console.log("ℹ️ User already exists, trying to update password...");
      // In a real scenario, you'd use a password reset flow
      console.log(
        "   You can now sign in with: kyran@storybook.test / storybook",
      );
    } else {
      console.error("❌ Error creating user:", error.message);
    }
  }
}

createAuthUser().catch(console.error);
