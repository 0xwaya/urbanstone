import { chromium, devices } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const outputDir = path.resolve(process.cwd(), 'test-artifacts/snapshots');

const targets = [
  { path: '/', file: 'homepage-mobile.png' },
  { path: '/service-areas/mason-oh', file: 'service-area-mason-mobile.png' },
  { path: '/materials/mason-quartz-countertops', file: 'material-mason-quartz-mobile.png' },
];

async function run() {
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();

  for (const target of targets) {
    const url = new URL(target.path, baseURL).toString();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(outputDir, target.file),
      fullPage: true,
    });
  }

  await context.close();
  await browser.close();

  console.log('Snapshot pass complete. Files written to test-artifacts/snapshots');
}

run().catch((error) => {
  console.error('Snapshot pass failed:', error);
  process.exitCode = 1;
});
