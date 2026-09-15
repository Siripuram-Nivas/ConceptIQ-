import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  console.log("Starting Puppeteer E2E Test...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Track network
  let tinyAiStatus = 'NOT RUN';
  let firstAiRequest = null;
  let providerLimitEncountered = false;
  let requests = [];
  let chunks = new Set();
  let pausedChunks = 0;
  
  page.on('request', request => {
    if (request.url().includes('/api/ai')) {
      const payload = JSON.parse(request.postData() || '{}');
      if (payload.method === 'extractChunkIntelligence') {
        if (!firstAiRequest) {
          firstAiRequest = {
            url: request.url(),
            method: payload.method,
            chunkId: payload.payload.chunkIndex
          };
        }
      }
    }
    request.continue();
  });

  await page.setRequestInterception(true);
  page.on('response', async response => {
    if (response.url().includes('/api/ai')) {
      const status = response.status();
      if (status === 429) {
        providerLimitEncountered = true;
      }
      console.log(`Response ${status} from ${response.url()}`);
      try {
        const text = await response.text();
        console.log(`Body: ${text.substring(0, 100)}`);
      } catch(e) {}
    }
  });

  try {
    // 1. Tiny AI check & Auth
    console.log("Navigating to signup...");
    await page.goto('http://localhost:5173/signup', { waitUntil: 'networkidle0' });
    
    // Fill out signup form
    console.log("Creating test account...");
    await page.type('input[name="name"]', 'Test User');
    await page.type('input[name="email"]', 'test' + Date.now() + '@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for client-side navigation
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Navigating to /add-material...");
    await page.goto('http://localhost:5173/add-material', { waitUntil: 'networkidle2' });
    
    // Upload the file
    console.log("Waiting for file input...");
    const fileInput = await page.waitForSelector('input[type=file]', { timeout: 10000 });
    const pdfPath = path.resolve('8-page-real.pdf');
    if (!fs.existsSync(pdfPath)) {
      console.error("PDF not found at " + pdfPath);
      process.exit(1);
    }
    
    console.log("Uploading PDF...");
    await fileInput.uploadFile(pdfPath);
    
    // Monitor UI
    console.log("Monitoring UI state...");
    let maxWait = 120000;
    let elapsed = 0;
    let finalVerdict = 'NOT READY';
    let errorMessage = '';
    
    while (elapsed < maxWait) {
      const bodyText = await page.evaluate(() => document.body.innerText);
      
      if (bodyText.includes('AI SERVICE RATE LIMITED')) {
        console.log("UI reported: AI SERVICE RATE LIMITED");
        finalVerdict = 'RATE_LIMITED_PRESERVED';
        break;
      }
      
      if (bodyText.includes("Couldn't process that file")) {
        console.log("UI reported general failure");
        errorMessage = bodyText;
        finalVerdict = 'FAILED';
        break;
      }
      
      if (bodyText.includes("Ready to learn")) {
        console.log("UI reported Success!");
        finalVerdict = 'SUCCESS';
        break;
      }
      
      await new Promise(r => setTimeout(r, 2000));
      elapsed += 2000;
    }
    
    console.log("=== RESULTS ===");
    console.log(`Final Verdict: ${finalVerdict}`);
    console.log(`Provider Limit 429 Encountered: ${providerLimitEncountered}`);
    console.log(`First AI Request: ${JSON.stringify(firstAiRequest)}`);
    console.log(`Error Message: ${errorMessage}`);
    
  } catch (e) {
    console.error("Test failed:", e);
  } finally {
    await browser.close();
  }
})();
