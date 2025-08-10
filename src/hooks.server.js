import { getAuth } from "$lib/auth/config.js";

export async function handle({ event, resolve }) {
  const auth = getAuth();

  if (auth) {
    // Attach auth to the event
    event.locals.auth = {
      getSession: async () => {
        // Get session from cookies
        const sessionToken = event.cookies.get("better-auth.session_token");

        if (!sessionToken) {
          return null;
        }

        try {
          // Verify session with better-auth
          const session = await auth.api.getSession({
            headers: event.request.headers,
          });

          return session;
        } catch (error) {
          console.error("Error getting session:", error);
          return null;
        }
      },
    };
  } else {
    // Mock auth for development
    event.locals.auth = {
      getSession: async () => {
        // Check for mock session
        const mockSession = event.cookies.get("mock-session");
        if (mockSession) {
          try {
            return JSON.parse(mockSession);
          } catch {
            return null;
          }
        }
        return null;
      },
    };
  }

  const response = await resolve(event);
  return response;
}
