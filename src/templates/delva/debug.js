const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('B-CONSOLE:', msg.text()));
    page.on('pageerror', error => console.error('B-PAGEERROR:', error.message));

    await page.goto('http://localhost:5175');
    await page.waitForTimeout(2000); // wait for load
    await page.screenshot({ path: 'test_screenshot.png' });

    console.log("Screenshot taken.");
    await browser.close();
})();
