import { test, expect } from '@playwright/test';

// Simple test that inspects the current state of highlighting
test.describe('Simple Highlighting Inspection', () => {
  
  test('inspect highlighting system directly on dev server', async ({ page }) => {
    // Navigate to the development server
    await page.goto('http://localhost:5173/');
    
    console.log('Page title:', await page.title());
    
    // Try to find any reading session or go to library
    try {
      await page.goto('http://localhost:5173/library', { timeout: 5000 });
      console.log('Library page loaded');
      
      // Look for reading sessions
      const readingLinks = await page.locator('a[href*="/read/"]');
      const linkCount = await readingLinks.count();
      console.log(`Found ${linkCount} reading session links`);
      
      if (linkCount > 0) {
        const firstLink = readingLinks.first();
        const href = await firstLink.getAttribute('href');
        console.log('First reading session URL:', href);
        
        // Navigate to the reading session
        await page.goto(`http://localhost:5173${href}`, { timeout: 10000 });
        console.log('Reading session page loaded');
        
        // Wait a bit for content to render
        await page.waitForTimeout(2000);
        
        // Check for paragraphs
        const paragraphs = await page.locator('p').count();
        console.log(`Found ${paragraphs} paragraphs`);
        
        // Check for spans (our highlighting elements)
        const spans = await page.locator('span').count();
        console.log(`Found ${spans} span elements`);
        
        // Check for specific highlighting classes
        const highlightSpans = await page.locator('span.inline.transition-all').count();
        console.log(`Found ${highlightSpans} spans with highlighting classes`);
        
        // Get some sample span HTML
        if (highlightSpans > 0) {
          const firstSpan = page.locator('span.inline.transition-all').first();
          const spanHTML = await firstSpan.innerHTML();
          const spanClasses = await firstSpan.getAttribute('class');
          console.log('First span HTML:', spanHTML);
          console.log('First span classes:', spanClasses);
        }
        
        // Check if test button exists
        const testButton = page.locator('button:has-text("🧪 Test")');
        if (await testButton.count() > 0) {
          console.log('Test button found - clicking it');
          
          await testButton.click();
          await page.waitForTimeout(1000);
          
          // Check if highlighting changed after clicking test button
          const highlightedWords = await page.locator('span.bg-yellow-300').count();
          console.log(`Found ${highlightedWords} highlighted words after test mode activation`);
          
          // Wait for animation and check again
          await page.waitForTimeout(2000);
          const highlightedWords2 = await page.locator('span.bg-yellow-300').count();
          console.log(`Found ${highlightedWords2} highlighted words after 2 seconds`);
          
          // Get the actual highlighted text
          const highlightedTexts = await page.locator('span.bg-yellow-300').allTextContents();
          console.log('Currently highlighted words:', highlightedTexts);
          
        } else {
          console.log('Test button not found');
        }
        
        // Check for audio button
        const audioButton = page.locator('button:has-text("▶️")');
        if (await audioButton.count() > 0) {
          console.log('Audio button found');
          // We could test audio highlighting here too
        } else {
          console.log('Audio button not found');
        }
        
      } else {
        console.log('No reading sessions found - checking page content');
        const bodyText = await page.textContent('body');
        console.log('Page content:', bodyText.slice(0, 200) + '...');
      }
      
    } catch (error) {
      console.log('Error navigating to library:', error.message);
    }
    
    // This test always passes - it's just for inspection
    expect(true).toBe(true);
  });
});