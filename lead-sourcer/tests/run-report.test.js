import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    buildRunReportText, buildRunReportHtml, buildSourceRows, resolveEnabledSources, summarizeLeadForReport, rankTopLeads,
} from '../src/run-report.js';
import { assessRunHealth } from '../src/run-health.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const load = () => JSON.parse(fs.readFileSync(path.join(dir, 'fixtures', 'run-report', 'summary-live.json'), 'utf8'));

describe('run report', () => {
    test('disabled Reddit and Craigslist are omitted entirely (text and HTML)', () => {
        const summary = load();
        const text = buildRunReportText(summary);
        const html = buildRunReportHtml(summary);
        for (const out of [text, html]) {
            expect(out).not.toMatch(/reddit/i);
            expect(out).not.toMatch(/craigslist/i);
        }
    });

    test('one row per enabled source with fetched/matched/emailed and status', () => {
        const rows = buildSourceRows(load());
        expect(rows.map((r) => r.label)).toEqual([
            'Cincinnati permits', 'Hamilton County permits', 'Butler County permits', 'Facebook Marketplace (trial)',
        ]);
        expect(rows.find((r) => r.key === 'permits-butler')).toMatchObject({ status: 'degraded', fetched: 12, matched: 1, emailed: 1 });
        expect(rows.find((r) => r.key === 'fb-marketplace')).toMatchObject({ status: 'ok', fetched: 37, matched: 1, emailed: 1 });
        const text = buildRunReportText(load());
        expect(text).toContain('Sources: Cincinnati permits, Hamilton County permits, Butler County permits, Facebook Marketplace (trial)');
        expect(text).toContain('Hamilton County permits | ok | 31 | 2 | 2');
        expect(text).toContain('Totals: fetched=138, matched=6, emailed=6');
        expect(text).toContain('Apify spend: $0.092 (cap $0.550/run)');
    });

    test('top leads list uses the new source labels and is ranked', () => {
        const text = buildRunReportText(load());
        expect(text).toMatch(/1\. \[Hamilton County permits\] Example Builders LLC/);
        expect(text).toContain('[Facebook Marketplace (trial)] ISO quartz countertop installer');
        expect(buildRunReportHtml(load())).toContain('Top leads');
    });

    test('a source that is switched back on reappears automatically', () => {
        const summary = load();
        summary.enabledSources.reddit = true;
        summary.sourceStatuses.reddit = 'ok';
        summary.verdicts.reddit = { status: 'ok', fetched: 40, matches: 0, relayed: 0 };
        expect(buildRunReportText(summary)).toContain('Reddit | ok | 40 | 0 | 0');
        expect(buildRunReportText(summary)).not.toMatch(/craigslist/i);
    });

    test('FB row disappears when Apify or the Marketplace switch is off; canary failure shows degraded', () => {
        const off = load();
        off.enabledSources['fb-marketplace'] = false;
        expect(buildRunReportText(off)).not.toContain('Facebook Marketplace');
        const bad = load();
        bad.verdicts.apify.canary = { status: 'SUCCEEDED', items: 0, healthy: false };
        bad.verdicts.apify.unhealthyReasons = ['facebook-marketplace: canary returned 0 items'];
        const row = buildSourceRows(bad).find((r) => r.key === 'fb-marketplace');
        expect(row.status).toBe('degraded');
        expect(buildRunReportText(bad)).toContain('note: facebook-marketplace: canary returned 0 items');
    });

    test('errors mark a row as error; older summaries without enabledSources infer from statuses', () => {
        const summary = load();
        summary.errors = [{ source: 'permits', message: 'socrata timeout' }];
        expect(buildSourceRows(summary).find((r) => r.key === 'permits').status).toBe('error');
        delete summary.enabledSources;
        expect(resolveEnabledSources(summary)).toMatchObject({ reddit: false, craigslist: false, permits: true, 'fb-marketplace': true });
    });

    test('lead summaries never carry contact details and HTML is escaped', () => {
        const payload = {
            score: 80,
            lead: { name: 'Acme <Remodel>', email: 'owner@example.invalid', phone: '513-555-0100', projectDetails: 'Contractor phone: 513-555-0100' },
            metadata: { city: 'Mason', estimatedCost: 50000, workSummary: 'Kitchen remodel' },
        };
        const summary = summarizeLeadForReport(payload, 'permits');
        expect(JSON.stringify(summary)).not.toMatch(/example\.invalid|555-0100/);
        const post = summarizeLeadForReport({ title: 'ISO countertops', marketplace: { city: 'Mason', sellerName: 'Seller Name' } }, 'fb-marketplace');
        expect(JSON.stringify(post)).not.toContain('Seller Name');
        const report = load();
        report.topLeads = rankTopLeads([summary, post]);
        const html = buildRunReportHtml(report);
        expect(html).toContain('Acme &lt;Remodel&gt; — Kitchen remodel');
        expect(html).not.toMatch(/example\.invalid|555-0100/);
    });
});

describe('run health with Reddit/Craigslist disabled', () => {
    test('disabled sources are never reported unhealthy', () => {
        const summary = load();
        summary.errors = [{ source: 'reddit', message: 'stale' }];
        const health = assessRunHealth(summary, summary.enabledSources);
        expect(health.unhealthySources).toEqual(['permits-butler']);
        expect(health.unhealthySources).not.toContain('reddit');
        expect(health.unhealthySources).not.toContain('craigslist');
    });
});
