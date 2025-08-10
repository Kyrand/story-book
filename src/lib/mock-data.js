// Mock data for when database is not available

export const mockBooks = [
  {
    id: "book-1",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    file_path: "pride_and_prejudice.txt",
    cover_image_path: "/covers/pride_and_prejudice.jpg",
    total_pages: 100,
  },
  {
    id: "book-2",
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    file_path: "alice_wonderland.txt",
    cover_image_path: "/covers/alice_wonderland.jpg",
    total_pages: 80,
  },
  {
    id: "book-3",
    title: "Frankenstein",
    author: "Mary Shelley",
    file_path: "frankenstein.txt",
    cover_image_path: "/covers/frankenstein.jpg",
    total_pages: 120,
  },
  {
    id: "book-4",
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    file_path: "sherlock_holmes.txt",
    cover_image_path: "/covers/sherlock_holmes.jpg",
    total_pages: 110,
  },
  {
    id: "book-5",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    file_path: "great_gatsby.txt",
    cover_image_path: "/covers/great_gatsby.jpg",
    total_pages: 90,
  },
];

export const mockReadingSessions = new Map();

export function createMockSession(userId, bookId, language) {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const book = mockBooks.find((b) => b.id === bookId);

  const session = {
    id: sessionId,
    user_id: userId,
    book_id: bookId,
    current_page: 1,
    language: language,
    title: book?.title || "Unknown Book",
    author: book?.author || "Unknown Author",
    file_path: book?.file_path || null,
    total_pages: book?.total_pages || 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockReadingSessions.set(sessionId, session);
  return session;
}

export function getMockSession(sessionId) {
  return mockReadingSessions.get(sessionId);
}

export function updateMockSessionProgress(sessionId, currentPage) {
  const session = mockReadingSessions.get(sessionId);
  if (session) {
    session.current_page = currentPage;
    session.updated_at = new Date().toISOString();
    mockReadingSessions.set(sessionId, session);
    return true;
  }
  return false;
}

export function getUserMockSessions(userId) {
  return Array.from(mockReadingSessions.values()).filter(
    (s) => s.user_id === userId,
  );
}
