import { expect, test } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should successfully login with test credentials", async ({ page }) => {
    // Navigate to home page
    await page.goto("/");

    // Check that we're on the login page
    await expect(page.locator("h1")).toContainText("Story Book");
    await expect(page.locator("h2")).toContainText("Sign in to your account");

    // Fill in login form with test credentials
    await page.fill("#email", "kyran@storybook.test");
    await page.fill("#password", "storybook");

    // Click sign in button
    await page.click('button[type="submit"]');

    // Wait for navigation to library page
    await page.waitForURL("/library");

    // Verify we're on the library page
    await expect(page.locator("h1")).toContainText("Story Book Library");

    // Check that user info is displayed
    await expect(page.locator("text=Welcome, kyran")).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/");

    // Fill in invalid credentials
    await page.fill("#email", "invalid@test.com");
    await page.fill("#password", "wrongpassword");

    // Click sign in button
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(page.locator(".bg-red-50")).toBeVisible();
  });

  test("should be able to register a new account", async ({ page }) => {
    await page.goto("/");

    // Click on register link
    await page.click("text=Don't have an account? Register");

    // Check that we're on the registration form
    await expect(page.locator("h2")).toContainText("Create your account");

    // Fill in registration form
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@storybook.test`;

    await page.fill("#name", "Test User");
    await page.fill("#email", testEmail);
    await page.fill("#password", "testpassword123");
    await page.fill("#confirm-password", "testpassword123");

    // Click create account button
    await page.click('button[type="submit"]');

    // Should redirect to library after successful registration
    await page.waitForURL("/library", { timeout: 10000 });

    // Verify we're logged in
    await expect(page.locator("text=Welcome, Test User")).toBeVisible();
  });

  test("should be able to sign out", async ({ page }) => {
    // First login
    await page.goto("/");
    await page.fill("#email", "kyran@storybook.test");
    await page.fill("#password", "storybook");
    await page.click('button[type="submit"]');

    // Wait for library page
    await page.waitForURL("/library");

    // Click sign out
    await page.click("text=Sign Out");

    // Should redirect back to login page
    await page.waitForURL("/");
    await expect(page.locator("h2")).toContainText("Sign in to your account");
  });

  test("should redirect to login when accessing protected route", async ({
    page,
  }) => {
    // Try to access library without being logged in
    await page.goto("/library");

    // Should redirect to login page
    await page.waitForURL("/");
    await expect(page.locator("h2")).toContainText("Sign in to your account");
  });
});

test.describe("Book Library", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/");
    await page.fill("#email", "kyran@storybook.test");
    await page.fill("#password", "storybook");
    await page.click('button[type="submit"]');
    await page.waitForURL("/library");
  });

  test("should display available books", async ({ page }) => {
    // Check that books are displayed
    await expect(page.locator('h2:has-text("Available Books")')).toBeVisible();

    // Should have at least one book (Pride and Prejudice from our seed)
    const bookCards = page.locator('button:has-text("Pride and Prejudice")');
    await expect(bookCards).toBeVisible();
  });

  test("should open language selection when clicking a book", async ({
    page,
  }) => {
    // Click on a book
    await page.click('button:has-text("Pride and Prejudice")');

    // Language modal should appear
    await expect(page.locator('h3:has-text("Select Language")')).toBeVisible();

    // Should show language options
    await expect(page.locator("text=French")).toBeVisible();
    await expect(page.locator("text=German")).toBeVisible();
    await expect(page.locator("text=Spanish")).toBeVisible();
    await expect(page.locator("text=Russian")).toBeVisible();
  });
});
