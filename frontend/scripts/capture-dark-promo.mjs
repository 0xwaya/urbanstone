import { chromium, devices } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.PROMO_BASE_URL || 'http://localhost:3001';
const outDir = path.resolve(process.cwd(), 'test-artifacts/promo-shots-dark-2026-04-03');

async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}

async function forceDarkTheme(page) {
    await page.addInitScript(() => {
        localStorage.setItem('urban-stone-theme', 'dark');
    });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
        document.documentElement.dataset.theme = 'dark';
        document.documentElement.style.colorScheme = 'dark';
    });
    await page.waitForTimeout(800);
}

async function captureDesktop(browser) {
    const context = await browser.newContext({ viewport: { width: 1728, height: 1117 }, colorScheme: 'dark' });
    const page = await context.newPage();
    await forceDarkTheme(page);

    await page.screenshot({ path: path.join(outDir, '01-dark-desktop-hero.png') });

    await page.locator('#suppliers').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '02-dark-desktop-suppliers.png') });

    await page.locator('button:has-text("View Curated Slabs")').first().click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(outDir, '03-dark-desktop-slabs-open.png') });

    await page.locator('#quote').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '04-dark-desktop-estimate.png') });

    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '05-dark-desktop-footer.png') });

    await context.close();
}

async function captureMobile(browser) {
    const context = await browser.newContext({ ...devices['iPhone 14 Pro'], colorScheme: 'dark' });
    const page = await context.newPage();
    await forceDarkTheme(page);

    await page.screenshot({ path: path.join(outDir, '06-dark-mobile-hero.png') });

    await page.locator('button[aria-label="Open navigation menu"]').click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '07-dark-mobile-menu-open.png') });

    await page.locator('a[href="#suppliers"]:visible').first().click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(outDir, '08-dark-mobile-suppliers.png') });

    await page.locator('button:has-text("View Slabs")').first().click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(outDir, '09-dark-mobile-slabs-open.png') });

    await page.locator('a[href="#quote"]:visible').first().click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(outDir, '10-dark-mobile-estimate.png') });

    await context.close();
}

async function main() {
    await ensureDir(outDir);
    const browser = await chromium.launch({ headless: true });

    try {
        await captureDesktop(browser);
        await captureMobile(browser);
    } finally {
        await browser.close();
    }

    const files = await fs.readdir(outDir);
    console.log(`Saved ${files.length} dark-mode promo snapshots to ${outDir}`);
    for (const file of files.sort()) {
        console.log(` - ${file}`);
    }
}

main().catch((error) => {
    console.error('Dark promo capture failed:', error);
    process.exitCode = 1;
});
