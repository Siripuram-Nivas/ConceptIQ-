import puppeteer from 'puppeteer';
import fs from 'fs';

async function runTest(pdfPath, pageCount) {
  console.log(`\n=====================================================================`);
  console.log(`TESTING ${pageCount}-PAGE PDF: ${pdfPath}`);
  console.log(`=====================================================================`);
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  let firstFailingBoundary = null;
  let apiErrors = [];
  let schedulerLogs = [];
  let parserLogs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Scheduler]')) schedulerLogs.push(text);
    if (text.includes('pdfjs')) parserLogs.push(text);
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${text}`);
      if (!firstFailingBoundary) firstFailingBoundary = 'Browser Console Error';
    }
  });

  page.on('requestfailed', request => {
    if (request.url().includes('/api/ai')) {
      console.log(`[NETWORK FAIL] ${request.url()} - ${request.failure().errorText}`);
      if (!firstFailingBoundary) firstFailingBoundary = 'Network Request Failed';
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/ai')) {
      const status = response.status();
      if (status !== 200) {
        try {
          const body = await response.json();
          console.log(`[API ERROR] ${status}:`, body);
          apiErrors.push({ status, body });
          if (status === 429) {
            if (!firstFailingBoundary) firstFailingBoundary = 'AI Provider RATE_LIMITED';
          } else {
            if (!firstFailingBoundary) firstFailingBoundary = `API Error ${status}`;
          }
        } catch (e) {
          console.log(`[API ERROR] ${status}`);
        }
      }
    }
  });

  await page.goto('http://localhost:5173/add-material', { waitUntil: 'networkidle0' });
  
  // Wait for the file input to be available
  const fileInput = await page.$('input[type="file"]');
  if (!fileInput) {
    console.error('File input not found');
    await browser.close();
    return { status: 'FAIL', reason: 'No file input' };
  }
  
  await fileInput.uploadFile(pdfPath);
  
  // Wait for processing to start or fail
  console.log('File uploaded, waiting for processing...');
  
  try {
    // wait for either processing to finish, or fail
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('Processing failed') || text.includes('Ready') || text.includes('AI Provider Rate Limited') || text.includes('Processing Paused');
    }, { timeout: 30000 });
  } catch (e) {
    console.log('Timeout waiting for UI state change');
    firstFailingBoundary = firstFailingBoundary || 'Timeout';
  }

  const text = await page.evaluate(() => document.body.innerText);
  let finalStatus = 'UNKNOWN';
  if (text.includes('Processing failed')) finalStatus = 'FAIL';
  else if (text.includes('Ready')) finalStatus = 'PASS';
  else if (text.includes('AI Provider Rate Limited')) finalStatus = 'RATE_LIMITED';
  else if (text.includes('Processing Paused')) finalStatus = 'PAUSED';
  
  console.log(`Final UI Status: ${finalStatus}`);
  console.log(`First Failing Boundary: ${firstFailingBoundary || 'None'}`);
  
  // dump IndexedDB
  const idbData = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const request = indexedDB.open('keyval-store');
      request.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('keyval')) return resolve({});
        const tx = db.transaction('keyval', 'readonly');
        const store = tx.objectStore('keyval');
        const all = store.getAll();
        const keys = store.getAllKeys();
        all.onsuccess = () => {
          keys.onsuccess = () => {
            const result = {};
            keys.result.forEach((k, i) => result[k] = all.result[i]);
            resolve(result);
          };
        };
      };
      request.onerror = () => resolve({ error: 'failed' });
    });
  });
  
  console.log('IndexedDB dump:', Object.keys(idbData));
  
  await browser.close();
  return { status: finalStatus, boundary: firstFailingBoundary, apiErrors, idbData };
}

async function main() {
  await runTest('./1-page-real.pdf', 1);
  await runTest('./8-page-real.pdf', 8);
}

main().catch(console.error);
