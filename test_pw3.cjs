const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.route('/log-error*', (route, request) => {
    console.log('LOG ERROR CAUGHT:', request.url());
    route.fulfill({ status: 200 });
  });

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  await browser.close();
})();
