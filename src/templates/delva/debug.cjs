const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('B-CONSOLE:', msg.text()));
    page.on('pageerror', error => console.error('B-PAGEERROR:', error.message));

    await page.goto('http://localhost:5174');
    await page.waitForTimeout(2000); // wait for load

    console.log("Screenshot taken.");
    await browser.close();
})();
