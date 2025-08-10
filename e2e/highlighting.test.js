import { test, expect } from '@playwright/test';

// Use the running development server
test.use({ baseURL: 'http://localhost:5173' });

test.describe('Text Highlighting System', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Navigate to a reading session - using a test session
    await page.goto('http://localhost:5173/library');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Look for any reading session link and click it
    const readingLink = page.locator('a[href*="/read/"]').first();
    if (await readingLink.count() > 0) {
      await readingLink.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    } else {
      // Skip if no reading sessions available
      test.skip('No reading sessions available for testing');
    }
  });

  test('should render spans with highlighting classes', async () => {
    // Wait for content to load
    await page.waitForSelector('p:has(span)', { timeout: 10000 });
    
    // Check that sentences are being rendered with span elements
    const paragraphsWithSpans = await page.locator('p:has(span)').count();
    expect(paragraphsWithSpans).toBeGreaterThan(0);
    
    // Check for our highlighting classes in spans
    const spans = await page.locator('span.inline.transition-all').count();
    expect(spans).toBeGreaterThan(0);
    
    console.log(`Found ${spans} spans with highlighting classes`);
  });

  test('should activate test highlighting mode', async () => {
    // Find and click the test highlighting button
    const testButton = page.locator('button:has-text("🧪 Test")');
    await expect(testButton).toBeVisible();
    
    await testButton.click();
    
    // Wait a moment for the test mode to activate
    await page.waitForTimeout(1000);
    
    // Check if button shows as active
    await expect(testButton).toHaveClass(/bg-red-100/);
    
    // Wait for several cycles and check for highlighting changes
    await page.waitForTimeout(3000);
    
    // Look for highlighted words (spans with yellow background)
    const highlightedSpans = await page.locator('span.bg-yellow-300').count();
    expect(highlightedSpans).toBeGreaterThan(0);
    
    console.log(`Found ${highlightedSpans} highlighted spans in test mode`);
  });

  test('should change highlighting over time in test mode', async () => {
    // Activate test mode
    const testButton = page.locator('button:has-text("🧪 Test")');
    await testButton.click();
    await page.waitForTimeout(500);
    
    // Capture initial highlighting state
    const initialHighlighted = await page.locator('span.bg-yellow-300').allTextContents();
    
    // Wait for highlighting to change (test cycles every 1 second)
    await page.waitForTimeout(2000);
    
    // Capture new highlighting state
    const laterHighlighted = await page.locator('span.bg-yellow-300').allTextContents();
    
    // They should be different (highlighting should have moved)
    expect(initialHighlighted).not.toEqual(laterHighlighted);
    
    console.log('Initial highlighted words:', initialHighlighted);
    console.log('Later highlighted words:', laterHighlighted);
  });

  test('should play audio and show highlighting during playback', async () => {
    // Find and click the audio play button
    const audioButton = page.locator('button:has-text("▶️")').first();
    await expect(audioButton).toBeVisible();
    
    await audioButton.click();
    
    // Wait for audio to start (isPlaying should be true)
    await page.waitForTimeout(1000);
    
    // Check if the button changed to pause state
    await expect(page.locator('button:has-text("⏸️")').first()).toBeVisible();
    
    // Wait for audio progress and check for highlighting
    await page.waitForTimeout(3000);
    
    // Look for any highlighted words during audio playback
    const highlightedSpansCount = await page.locator('span.bg-yellow-300, span.bg-yellow-100').count();
    
    console.log(`Found ${highlightedSpansCount} highlighted spans during audio playback`);
    
    // Also check console logs for debug information
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('🎵') || msg.text().includes('📝') || msg.text().includes('⏰')) {
        logs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    console.log('Audio debug logs:', logs);
    
    // We expect to see some highlighting or at least debug logs
    expect(highlightedSpansCount > 0 || logs.length > 0).toBeTruthy();
  });

  test('should show sentence progress indicators', async () => {
    // Start test mode first to ensure we have highlighting
    const testButton = page.locator('button:has-text("🧪 Test")');
    await testButton.click();
    await page.waitForTimeout(1000);
    
    // Look for progress bars
    const progressBars = await page.locator('div.bg-yellow-400').count();
    
    console.log(`Found ${progressBars} progress indicators`);
    
    // We should have at least some progress indicators when highlighting is active
    expect(progressBars).toBeGreaterThan(0);
  });

  test('should render HTML content correctly', async () => {
    // Get a paragraph with spans and check its HTML structure
    const firstParagraph = page.locator('p:has(span)').first();
    const innerHTML = await firstParagraph.innerHTML();
    
    console.log('First paragraph HTML:', innerHTML);
    
    // Should contain span elements with our classes
    expect(innerHTML).toContain('<span class=');
    expect(innerHTML).toContain('transition-all');
    
    // Should not contain raw HTML as text (common issue with {@html} directive)
    const textContent = await firstParagraph.textContent();
    expect(textContent).not.toContain('<span');
    expect(textContent).not.toContain('class=');
  });
});