#!/usr/bin/env node
// Prepare job photos for the project gallery.
//   npm run projects:add -- <job-id> <photo> [<photo> ...]
// Writes web-ready JPGs (max 2000px wide, EXIF/GPS stripped, auto-rotated) to
// public/projects/<job-id>/ and prints a starter entry to paste into data/projects.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [job, ...inputs] = process.argv.slice(2);
if (!job || !/^[a-z0-9-]+$/.test(job) || inputs.length === 0) {
    console.error('usage: npm run projects:add -- <job-id (lowercase-dashes)> <photo> [<photo> ...]');
    process.exit(1);
}
const outDir = path.join(root, 'public', 'projects', job);
fs.mkdirSync(outDir, { recursive: true });

const slug = (name) => path.basename(name, path.extname(name)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const photos = [];
for (const input of inputs) {
    const file = `${slug(input)}.jpg`;
    const info = await sharp(input)
        .rotate()
        .resize({ width: 2000, withoutEnlargement: true })
        .jpeg({ quality: 86, progressive: true, mozjpeg: true })
        .toFile(path.join(outDir, file)); // sharp drops EXIF/GPS unless .withMetadata() is used
    photos.push({ file, width: info.width, height: info.height });
    console.error(`✓ public/projects/${job}/${file} (${info.width}x${info.height})`);
}

const photoLines = photos
    .map((p) => `            { file: '${p.file}', width: ${p.width}, height: ${p.height}, alt: { en: 'TODO describe what is visible', es: 'TODO describir lo que se ve' } },`)
    .join('\n');
console.log(`
    // paste into \`projects\` in data/projects.js (top = newest). Add '${job}' to \`jobs\` if new.
    {
        id: '${job}-TODO',
        job: '${job}',
        featured: true,
        category: 'kitchen', // kitchen | bathroom | outdoor | stonework | remodel
        title: { en: 'TODO', es: 'TODO' },
        text: { en: 'TODO one line', es: 'TODO una línea' },
        photos: [
${photoLines}
        ],
    },`);
