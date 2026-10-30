// Render the lead notification email for a fake lead (no network, no email):
//   node scripts/render-sample-lead-email.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { COUNTY_SOURCES, buildCountyPermitLead } from '../src/permits-accela.js';
import { buildLeadNotification } from '../src/lead-email.js';

const outDir = process.argv[2] || 'runs/sample-lead-email';
const payload = buildCountyPermitLead(COUNTY_SOURCES['hamilton-county'], {
    permitNumber: 'BLD2026-012345',
    recordType: 'Residential Alteration',
    date: '10/29/2026',
    status: 'Issued',
    address: '1234 SAMPLE HILL RD, ANDERSON TOWNSHIP OH 45230',
    description: 'First floor remodel: kitchen, primary bath and powder room. New cabinets, countertops and two vanities.',
    cost: 190000,
    link: 'https://eztrak.cagis.org/CitizenAccess/',
    contractor: 'Sample Homes LLC',
    contactRole: 'Contractor',
    licenseType: 'General Contractor',
    contractorPhone: '(513) 555-0142',
    contractorEmail: 'office@samplehomes.example',
}, null, { score: 80, band: 'high', anchored: true });
const { subject, html, text } = buildLeadNotification(payload);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'lead-email-sample.html'), html);
fs.writeFileSync(path.join(outDir, 'lead-email-sample.txt'), `Subject: ${subject}\n\n${text}\n`);
console.log(`[render-sample-lead-email] ${subject}`);
console.log(`[render-sample-lead-email] wrote ${outDir}/lead-email-sample.html and .txt`);
