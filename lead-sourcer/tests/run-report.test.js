import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    buildRunReportText, buildRunReportHtml, buildSourceRows, resolveEnabledSources, summarizeLeadForReport, rankTopLeads,
} from '../src/run-report.js';
import { assessRunHealth } from '../src/run-health.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
// Fixture is a legacy summary that still carries retired Reddit/Craigslist/Apify data.
const load = () => JSON.parse(fs.readFileSync(path.join(dir, 'fixtures', 'run-report', 'summary-live.json'), 'utf8'));

const RETIRED = /reddit|craigslist|apify|facebook|marketplace|nextdoor/i;

describe('run report', () => {
    test('retired sources never appear, even when an old summary still has them enabled (text and HTML)', () => {
        const summary = load();
        summary.enabledSources.reddit = true;
        summary.enabledSources.craigslist = true;
        summary.sourceStatuses.reddit = 'ok';
        summary.verdicts.reddit = { status: 'ok', fetched: 40, matches: 0, relayed: 0 };
        for (const out of [buildRunReportText(summary), buildRunReportHtml(summary)]) {
            expect(out).not.toMatch(RETIRED);
        }
    });

    test('live permit sources only, Hamilton County first', () => {
        const rows = buildSourceRows(load());
        expect(rows.map((r) => r.label)).toEqual(['Hamilton County permits', 'Cincinnati permits', 'Butler County permits']);
        expect(rows.find((r) => r.key === 'permits-butler')).toMatchObject({ status: 'degraded', fetched: 12, matched: 1, emailed: 1 });
        const text = buildRunReportText(load());
        expect(text).toContain('Hamilton County permits | ok | 31 | 2 | 2');
        expect(text).toContain('Totals: fetched=101, matched=5, emailed=5');
        // Source table comes before the lead list so live sources sit at the top.
        expect(text.indexOf('Hamilton County permits | ok')).toBeLessThan(text.indexOf('Top leads:'));
        const html = buildRunReportHtml(load());
        expect(html.indexOf('Hamilton County permits')).toBeLessThan(html.indexOf('Cincinnati permits'));
        expect(html.indexOf('Live sources')).toBeLessThan(html.indexOf('Top leads'));
    });

    test('top leads list uses the source labels, is ranked, and drops retired-source leads', () => {
        const text = buildRunReportText(load());
        expect(text).toMatch(/1\. \[Hamilton County permits\] Example Builders LLC/);
        expect(text).not.toContain('ISO quartz countertop installer');
        expect(rankTopLeads([{ source: 'fb-marketplace', score: 99 }, { source: 'permits', score: 1 }])).toEqual([{ source: 'permits', score: 1 }]);
    });

    test('a disabled permit source is omitted and reappears when switched back on', () => {
        const summary = load();
        summary.enabledSources['permits-butler'] = false;
        expect(buildRunReportText(summary)).not.toContain('Butler County permits');
        summary.enabledSources['permits-butler'] = true;
        expect(buildRunReportText(summary)).toContain('Butler County permits |');
    });

    test('errors mark a row as error; older summaries without enabledSources infer from statuses', () => {
        const summary = load();
        summary.errors = [{ source: 'permits', message: 'socrata timeout' }];
        expect(buildSourceRows(summary).find((r) => r.key === 'permits').status).toBe('error');
        expect(buildRunReportText(summary)).toContain('note: socrata timeout');
        delete summary.enabledSources;
        expect(resolveEnabledSources(summary)).toEqual({ 'permits-hamilton': true, permits: true, 'permits-butler': true });
    });

    test('brand styling: navy header, gold accent, serif headings with fallbacks', () => {
        const html = buildRunReportHtml(load());
        expect(html).toContain('#0B1220');
        expect(html).toContain('#C4A35A');
        expect(html).toContain("'Cormorant Garamond',Georgia");
        expect(html).toContain('Manrope,');
    });

    test('lead summaries never carry contact details and HTML is escaped', () => {
        const payload = {
            score: 80,
            lead: { name: 'Acme <Remodel>', email: 'owner@example.invalid', phone: '513-555-0100', projectDetails: 'Contractor phone: 513-555-0100' },
            metadata: { city: 'Mason', estimatedCost: 50000, workSummary: 'Kitchen remodel' },
        };
        const summary = summarizeLeadForReport(payload, 'permits');
        expect(JSON.stringify(summary)).not.toMatch(/example\.invalid|555-0100/);
        const report = load();
        report.topLeads = rankTopLeads([summary]);
        const html = buildRunReportHtml(report);
        expect(html).toContain('Acme &lt;Remodel&gt; — Kitchen remodel');
        expect(html).not.toMatch(/example\.invalid|555-0100/);
    });
});

describe('run health', () => {
    test('only enabled permit sources are assessed', () => {
        const summary = load();
        summary.errors = [{ source: 'reddit', message: 'stale' }];
        const health = assessRunHealth(summary, summary.enabledSources);
        expect(health.unhealthySources).toEqual(['permits-butler']);
    });
});
