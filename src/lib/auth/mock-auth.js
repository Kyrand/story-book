// Mock authentication for development when database is not available
import { createHash } from "crypto";

const users = new Map();
const sessions = new Map();

// Pre-seed test users
users.set("kyran@storybook.test", {
  id: "test-user-kyran-storybook",
  email: "kyran@storybook.test",
  name: "kyran",
  password: hashPassword("storybookector"),
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Story Book test user
users.set("kyran@storybook.test", {
  id: "test-user-kyran-storybook",
  email: "kyran@storybook.test",
  name: "kyran",
  password: hashPassword("storybook"),
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const mockAuth = {
  async signUp({ email, password, name }) {
    if (users.has(email)) {
      throw new Error("User already exists");
    }

    const userId = `user-${Date.now()}`;
    const user = {
      id: userId,
      email,
      name,
      password: hashPassword(password),
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.set(email, user);

    // Create session
    const sessionId = generateSessionId();
    const session = {
      id: sessionId,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    sessions.set(sessionId, session);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      session: { id: sessionId, expiresAt: session.expiresAt },
    };
  },

  async signIn({ email, password }) {
    const user = users.get(email);
    if (!user || user.password !== hashPassword(password)) {
      throw new Error("Invalid credentials");
    }

    // Create session
    const sessionId = generateSessionId();
    const session = {
      id: sessionId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    sessions.set(sessionId, session);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      session: { id: sessionId, expiresAt: session.expiresAt },
    };
  },

  async getSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      sessions.delete(sessionId);
      return null;
    }

    const user = Array.from(users.values()).find(
      (u) => u.id === session.userId,
    );
    if (!user) return null;

    return {
      user: { id: user.id, email: user.email, name: user.name },
      session: { id: sessionId, expiresAt: session.expiresAt },
    };
  },

  async signOut(sessionId) {
    sessions.delete(sessionId);
  },
};
