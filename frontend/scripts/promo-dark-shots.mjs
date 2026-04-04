import path from 'node:path';
import { chromium, devices } from '@playwright/test';

const outDir = path.resolve('test-artifacts/promo-shots-2026-04-03-dark');

async function prepDark(page) {
    await page.addInitScript(() => {
        window.localStorage.setItem('urban-stone-theme', 'dark');
    });

    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
        document.documentElement.dataset.theme = 'dark';
        document.documentElement.style.colorScheme = 'dark';
    });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(900);
}

async function main() {
    const browser = await chromium.launch({ headless: true });

    const desktop = await browser.newContext({ viewport: { width: 1728, height: 1117 } });
    const page = await desktop.newPage();
    await prepDark(page);

    await page.screenshot({ path: path.join(outDir, '01-dark-desktop-hero.png') });
    await page.locator('#suppliers').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, '02-dark-desktop-suppliers.png') });

    await page.locator('button:has-text("View Curated Slabs")').first().click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '03-dark-desktop-slabs-open.png') });

    await page.locator('#quote').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, '04-dark-desktop-estimate.png') });

    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, '05-dark-desktop-footer.png') });
    await desktop.close();

    const mobile = await browser.newContext({ ...devices['iPhone 14 Pro'] });
    const m = await mobile.newPage();
    await prepDark(m);

    await m.screenshot({ path: path.join(outDir, '06-dark-mobile-hero.png') });

    await m.locator('button[aria-label="Open navigation menu"]').click();
    await m.waitForTimeout(500);
    await m.screenshot({ path: path.join(outDir, '07-dark-mobile-hamburger.png') });

    await m.locator('a[href="#suppliers"]').first().click();
    await m.waitForTimeout(700);
    await m.screenshot({ path: path.join(outDir, '08-dark-mobile-suppliers.png') });

    await m.locator('button:has-text("View Slabs")').first().click();
    await m.waitForTimeout(700);
    await m.screenshot({ path: path.join(outDir, '09-dark-mobile-slabs-open.png') });

    await m.locator('a[href="#quote"]').first().click();
    await m.waitForTimeout(700);
    await m.screenshot({ path: path.join(outDir, '10-dark-mobile-estimate.png') });

    await mobile.close();
    await browser.close();

    console.log(outDir);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
