const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE_ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST_FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
