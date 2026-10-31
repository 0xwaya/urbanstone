import fs from 'node:fs';
import path from 'node:path';
import { categoryLabels, getProjects, getProjectsByJob, jobs, projects } from '../data/projects';

const publicDir = path.join(__dirname, '..', 'public');

describe('project gallery data', () => {
    it('every project is complete and its photos exist', () => {
        const ids = new Set();
        for (const p of projects) {
            expect(ids.has(p.id), `duplicate id ${p.id}`).toBe(false);
            ids.add(p.id);
            expect(jobs[p.job], `${p.id}: unknown job ${p.job}`).toBeTruthy();
            expect(categoryLabels[p.category], `${p.id}: unknown category ${p.category}`).toBeTruthy();
            for (const lang of ['en', 'es']) {
                expect(p.title[lang], `${p.id} title.${lang}`).toBeTruthy();
                expect(p.text[lang], `${p.id} text.${lang}`).toBeTruthy();
            }
            expect(JSON.stringify(p), `${p.id} still has TODO placeholders`).not.toMatch(/TODO/);
            expect(p.photos.length).toBeGreaterThan(0);
            for (const ph of p.photos) {
                const file = path.join(publicDir, 'projects', p.job, ph.file);
                expect(fs.existsSync(file), `missing ${file}`).toBe(true);
                expect(ph.alt.en.length, `${ph.file} alt.en`).toBeGreaterThan(20);
                expect(ph.alt.es.length, `${ph.file} alt.es`).toBeGreaterThan(20);
            }
        }
    });

    it('resolves language, image URLs and job info', () => {
        const [first] = getProjects('es');
        expect(first.photos[0].src).toMatch(/^\/projects\/[\w-]+\/[\w.-]+\.(jpe?g|png|webp)$/);
        expect(first.location).toBeTruthy();
        expect(getProjects('en', { featuredOnly: true }).length).toBeGreaterThan(0);
        expect(getProjectsByJob('en').flatMap((g) => g.projects)).toHaveLength(projects.length);
    });

    it('the Over-the-Rhine loft is a rental listing, never for sale', () => {
        const job = jobs['real-job-01'];
        expect(job.location).toBe('Over-the-Rhine, Cincinnati');
        expect(job.listing.url).toBe('https://www.zillow.com/homedetails/214-E-14th-St-Unit-2A-Cincinnati-OH-45202/2058257360_zpid/');
        expect(JSON.stringify(job)).not.toMatch(/for sale|en venta|utm_/i);
        expect(job.listing.text.en).toMatch(/available for rent/i);
    });
});
