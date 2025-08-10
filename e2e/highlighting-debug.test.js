import { test, expect } from '@playwright/test';

test.describe('Highlighting Debug', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Login with correct credentials
    await page.fill('input[type="email"]', 'kyran@storybook.test');
    await page.fill('input[type="password"]', 'storybook');
    await page.click('button:has-text("Sign In")');
    
    // Wait for redirect to library
    await page.waitForURL('/library');
  });

  test('debug highlighting system step by step', async ({ page }) => {
    console.log('=== Starting highlighting debug test ===');
    
    // Listen for network requests to debug API calls
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(`${request.method()} ${request.url()}`);
        console.log('API Request:', request.method(), request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log('API Response:', response.status(), response.url());
      }
    });
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Error:', msg.text());
      }
    });
    
    // Check if we have books
    const availableBooksHeader = page.locator('h2:has-text("Available Books")');
    await expect(availableBooksHeader).toBeVisible();
    console.log('✓ Library page loaded with available books');
    
    // Look for Pride and Prejudice book
    const prideBook = page.locator('button:has-text("Pride and Prejudice")');
    await expect(prideBook).toBeVisible();
    console.log('✓ Found Pride and Prejudice book');
    
    // Click on the book to open language selection or go to reading session
    await prideBook.click();
    await page.waitForTimeout(1000);
    
    // Check if we have a modal (any modal) 
    const modal = page.locator('div.fixed.inset-0');
    if (await modal.count() > 0) {
      console.log('✓ Modal detected after clicking book');
      
      // Look for any language selection elements in the modal
      const languageButtons = page.locator('div.fixed.inset-0 button');
      const buttonCount = await languageButtons.count();
      console.log(`Found ${buttonCount} buttons in modal`);
      
      if (buttonCount > 0) {
        // Get text of buttons to understand what we have
        const buttonTexts = await languageButtons.allTextContents();
        console.log('Modal button texts:', buttonTexts);
        
        // Click the "Start Reading" button if available
        const startReadingButton = page.locator('button:has-text("Start Reading")');
        if (await startReadingButton.count() > 0) {
          await startReadingButton.click();
          console.log('✓ Clicked Start Reading button');
        } else {
          // Fallback to last button (usually the action button)
          const lastButton = languageButtons.last();
          await lastButton.click();
          console.log('✓ Clicked last modal button');
        }
        
        // Wait for redirect to reading session
        await page.waitForURL(/\/read\/[a-f0-9-]+/, { timeout: 10000 });
        console.log('✓ Redirected to reading session');
      } else {
        // Maybe it's a different kind of modal - close it and try again
        const closeButton = page.locator('button:has-text("Close"), button:has-text("×"), button[aria-label="Close"]');
        if (await closeButton.count() > 0) {
          await closeButton.first().click();
          console.log('Closed modal');
        } else {
          console.log('Could not find way to handle modal');
        }
      }
      
    } else if (page.url().includes('/read/')) {
      console.log('✓ Went directly to reading session (no modal)');
    } else {
      console.log('⚠️ Unexpected state after clicking book. Current URL:', page.url());
      
      // Try to find any reading session links that might exist on the page
      const readingLinks = await page.locator('a[href*="/read/"]').count();
      console.log(`Found ${readingLinks} reading session links on page`);
      
      if (readingLinks > 0) {
        // Force click without waiting for modal to clear
        const firstReadingLink = page.locator('a[href*="/read/"]').first();
        await firstReadingLink.click({ force: true });
        console.log('✓ Force-clicked first reading session link');
        
        // Wait for navigation
        await page.waitForURL(/\/read\/[a-f0-9-]+/, { timeout: 10000 });
      } else {
        throw new Error('Could not find a way to access reading session');
      }
    }
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Debug: Check what's on the page
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Look for content paragraphs
    const paragraphs = await page.locator('p').count();
    console.log(`Found ${paragraphs} paragraphs on page`);
    
    // Look for span elements
    const allSpans = await page.locator('span').count();
    console.log(`Found ${allSpans} span elements total`);
    
    // Look for our specific highlighting spans
    const highlightingSpans = await page.locator('span.inline.transition-all').count();
    console.log(`Found ${highlightingSpans} spans with highlighting classes`);
    
    if (highlightingSpans > 0) {
      console.log('✓ Highlighting spans are present!');
      
      // Get sample span content
      const firstSpan = page.locator('span.inline.transition-all').first();
      const spanText = await firstSpan.textContent();
      const spanClasses = await firstSpan.getAttribute('class');
      console.log(`First span text: "${spanText}"`);
      console.log(`First span classes: "${spanClasses}"`);
      
      // Check if we have the test button
      const testButton = page.locator('button:has-text("🧪 Test")');
      if (await testButton.count() > 0) {
        console.log('✓ Test button found! Clicking to activate test mode...');
        
        await testButton.click();
        await page.waitForTimeout(1000);
        
        // Check for highlighted words
        const highlightedWords = await page.locator('span.bg-yellow-300').count();
        console.log(`Found ${highlightedWords} highlighted words in test mode`);
        
        if (highlightedWords > 0) {
          const highlightedTexts = await page.locator('span.bg-yellow-300').allTextContents();
          console.log('✓ HIGHLIGHTING IS WORKING! Currently highlighted words:', highlightedTexts);
        } else {
          console.log('❌ No highlighted words found - test mode not working');
        }
        
        // Wait for animation cycles
        await page.waitForTimeout(3000);
        
        const laterHighlightedWords = await page.locator('span.bg-yellow-300').count();
        const laterHighlightedTexts = await page.locator('span.bg-yellow-300').allTextContents();
        console.log(`After 3 seconds: ${laterHighlightedWords} highlighted words:`, laterHighlightedTexts);
        
      } else {
        console.log('❌ Test button not found');
      }
      
      // Try audio button
      const audioButton = page.locator('button:has-text("▶️")');
      if (await audioButton.count() > 0) {
        console.log('✓ Audio button found! Testing audio highlighting...');
        
        // Set up console log listener for audio debug
        const audioLogs = [];
        page.on('console', msg => {
          if (msg.text().includes('🎵') || msg.text().includes('📝') || msg.text().includes('⏰')) {
            audioLogs.push(msg.text());
            console.log('Audio debug log:', msg.text());
          }
        });
        
        await audioButton.click();
        console.log('Clicked audio button');
        
        // Wait for audio to potentially start
        await page.waitForTimeout(5000);
        
        const audioHighlightedWords = await page.locator('span.bg-yellow-300').count();
        console.log(`Audio mode: ${audioHighlightedWords} highlighted words`);
        
        if (audioLogs.length > 0) {
          console.log('✓ Audio debug logs detected:', audioLogs.length, 'entries');
        } else {
          console.log('❌ No audio debug logs found');
        }
      } else {
        console.log('❌ Audio button not found');
      }
      
    } else {
      console.log('❌ No highlighting spans found - system not working');
      
      // Debug: Show what we do have
      const sampleParagraph = page.locator('p').first();
      if (await sampleParagraph.count() > 0) {
        const sampleHTML = await sampleParagraph.innerHTML();
        console.log('Sample paragraph HTML:', sampleHTML.slice(0, 200) + '...');
      } else {
        console.log('No paragraphs found - checking page content');
        
        // Check what spans we do have
        const allSpansContent = await page.locator('span').allTextContents();
        console.log('All span contents:', allSpansContent.slice(0, 10)); // First 10 spans
        
        // Check what the main content area looks like
        const mainContent = page.locator('main');
        if (await mainContent.count() > 0) {
          const mainHTML = await mainContent.innerHTML();
          console.log('Main content HTML (first 500 chars):', mainHTML.slice(0, 500) + '...');
        }
        
        // Check for loading states
        const loadingIndicator = page.locator('text="Loading"');
        if (await loadingIndicator.count() > 0) {
          console.log('⚠️ Page is still loading - waiting longer...');
          await page.waitForTimeout(5000);
          
          // Re-check after waiting
          const paragraphsAfterWait = await page.locator('p').count();
          console.log(`After waiting: Found ${paragraphsAfterWait} paragraphs`);
        }
        
        // Check for error messages
        const errorMessages = page.locator('text="Error", text="Failed"');
        if (await errorMessages.count() > 0) {
          const errorTexts = await errorMessages.allTextContents();
          console.log('⚠️ Found error messages:', errorTexts);
        }
      }
    }
    
    console.log('=== End of highlighting debug test ===');
  });
});