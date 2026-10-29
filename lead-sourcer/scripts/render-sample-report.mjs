// Render the run report from a fixture summary (no network, no email): node scripts/render-sample-report.mjs [summary.json] [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { buildRunReportText, buildRunReportHtml } from '../src/run-report.js';

const input = process.argv[2] || new URL('../tests/fixtures/run-report/summary-live.json', import.meta.url).pathname;
const outDir = process.argv[3] || 'runs/sample-report';
const summary = JSON.parse(fs.readFileSync(input, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'run-report.html'), buildRunReportHtml(summary));
fs.writeFileSync(path.join(outDir, 'run-report.txt'), `${buildRunReportText(summary)}\n`);
console.log(`[render-sample-report] wrote ${outDir}/run-report.html and run-report.txt`);
