// ─────────────────────────────────────────────────────────────────────────────
// PROJECT GALLERY DATA: the single source for the homepage carousel and /projects.
//
// To add a project:
//   1. From frontend/: `npm run projects:add -- <job-id> path/to/*.jpg`
//      (resizes, strips EXIF/GPS, writes public/projects/<job-id>/ and prints a starter entry).
//   2. If it's a new job, add it to `jobs` below (location stays city-level unless the
//      owner approves more; `listing` is optional and only for links the owner gave us).
//   3. Paste the printed entry into `projects` below and fill the TODOs. `photos[0]` is the cover. Give every photo
//      an English and Spanish alt text that describes what is visible.
//   4. `featured: true` puts it in the homepage rotation (first MAX_FEATURED featured entries,
//      in file order, so put new work at the top). Every project is on /projects.
//   `npx vitest run tests/projects-data.test.js` checks that files exist and fields are filled.
//
// Rules: no client names, no addresses beyond what the owner approved, no brands, specs or prices.
// ─────────────────────────────────────────────────────────────────────────────

export const jobs = {
    'real-job-01': {
        title: { en: 'Over-the-Rhine loft', es: 'Loft en Over-the-Rhine' },
        location: 'Over-the-Rhine, Cincinnati',
        // Edward 2026-10-31: no rental/listing link on the site (Zillow has no affiliate program).
    },
};

export const projects = [
    {
        id: 'otr-bathroom-marble',
        job: 'real-job-01',
        featured: true,
        category: 'bathroom',
        title: { en: 'Custom bathroom', es: 'Baño a medida' },
        text: {
            en: 'Marble-look walls, a curbless walk-in shower and a wood vanity with a dark stone top.',
            es: 'Paredes estilo mármol, ducha a ras de piso y mueble de madera con cubierta de piedra oscura.',
        },
        photos: [
            {
                file: 'bathroom-marble-vanity.jpg',
                alt: {
                    en: 'Custom bathroom with large marble-look wall panels, a wood vanity with a dark stone top, a white vessel sink and matte black fixtures',
                    es: 'Baño a medida con grandes paneles de pared estilo mármol, mueble de madera con cubierta de piedra oscura, lavabo blanco sobre cubierta y grifería negra mate',
                },
            },
            {
                file: 'bathroom-marble-shower.jpg',
                alt: {
                    en: 'Curbless walk-in shower with large marble-look wall panels, a linear drain and matte black body sprays',
                    es: 'Ducha a ras de piso con grandes paneles estilo mármol, desagüe lineal y rociadores negros mate',
                },
            },
            {
                file: 'bathroom-marble-wide.jpg',
                alt: {
                    en: 'Wide view of the custom bathroom: vessel sink on a dark stone vanity top and the open walk-in shower beyond',
                    es: 'Vista amplia del baño a medida: lavabo sobre cubierta de piedra oscura y la ducha abierta al fondo',
                },
            },
        ],
    },
    {
        id: 'otr-kitchen-galley',
        job: 'real-job-01',
        featured: true,
        category: 'kitchen',
        title: { en: 'Galley kitchen countertops', es: 'Encimeras para cocina tipo galera' },
        text: {
            en: 'Dark stone countertops along both runs of a loft galley kitchen.',
            es: 'Encimeras de piedra oscura a lo largo de ambos lados de una cocina tipo galera en un loft.',
        },
        photos: [
            {
                file: 'kitchen-galley.jpg',
                alt: {
                    en: 'Loft galley kitchen with dark stone countertops, warm wood cabinets and a stacked-stone backsplash under industrial pendant lights',
                    es: 'Cocina tipo galera en un loft con encimeras de piedra oscura, gabinetes de madera y salpicadero de piedra apilada bajo lámparas industriales',
                },
            },
            {
                file: 'kitchen-galley-view.jpg',
                alt: {
                    en: 'View down the loft galley kitchen: dark stone countertops on both runs of wood cabinets toward tall windows',
                    es: 'Vista a lo largo de la cocina tipo galera: encimeras de piedra oscura en ambos lados hacia ventanales altos',
                },
            },
        ],
    },
    {
        id: 'otr-kitchen-island-ledger',
        job: 'real-job-01',
        featured: true,
        category: 'kitchen',
        title: { en: 'Ledger stone kitchen island', es: 'Isla con muro de piedra apilada' },
        text: {
            en: 'A stacked ledger stone wall wraps the island, finished with a dark stone top.',
            es: 'Un muro de piedra apilada (ledger stone) envuelve la isla, con cubierta de piedra oscura.',
        },
        photos: [
            {
                file: 'kitchen-island-ledger-stone.jpg',
                alt: {
                    en: 'Loft kitchen island wrapped in a stacked ledger stone wall with a dark stone top and bar stools',
                    es: 'Isla de cocina en un loft revestida con muro de piedra apilada (ledger stone), cubierta de piedra oscura y bancos altos',
                },
            },
            {
                file: 'kitchen-island-ledger-stone-wide.jpg',
                alt: {
                    en: 'Wide view of the loft kitchen: ledger stone island, wood cabinets and stacked-stone backsplash',
                    es: 'Vista amplia de la cocina del loft: isla de piedra apilada, gabinetes de madera y salpicadero de piedra',
                },
            },
        ],
    },
    {
        id: 'otr-bathroom-fluted',
        job: 'real-job-01',
        featured: true,
        category: 'bathroom',
        title: { en: 'Custom bathroom', es: 'Baño a medida' },
        text: {
            en: 'A fluted wood floating vanity, a clean white top and a backlit mirror.',
            es: 'Mueble flotante de madera acanalada, cubierta blanca y espejo retroiluminado.',
        },
        photos: [
            {
                file: 'bathroom-fluted-vanity.jpg',
                alt: {
                    en: 'Custom bathroom with grey textured tile, a fluted wood floating vanity with a white top, a backlit round mirror and a glass shower',
                    es: 'Baño a medida con azulejo gris texturizado, mueble flotante de madera acanalada con cubierta blanca, espejo redondo retroiluminado y ducha de vidrio',
                },
            },
        ],
    },
];

// Default photo size (all current photos are 3:2). Set width/height on a photo if it differs.
const DEFAULT_SIZE = { width: 1681, height: 1118 };

export const categoryLabels = {
    kitchen: { en: 'Kitchen', es: 'Cocina' },
    bathroom: { en: 'Bathroom', es: 'Baño' },
    outdoor: { en: 'Outdoor', es: 'Exterior' },
    stonework: { en: 'Stonework', es: 'Piedra' },
    remodel: { en: 'Remodel', es: 'Remodelación' },
};

const pick = (value, lang) => (value && typeof value === 'object' ? value[lang] ?? value.en : value);

/** Projects resolved to one language, with job info and image URLs attached. */
export function getProjects(lang = 'en', { featuredOnly = false } = {}) {
    return projects
        .filter((p) => !featuredOnly || p.featured)
        .map((p) => {
            const job = jobs[p.job] || {};
            return {
                id: p.id,
                jobId: p.job,
                category: p.category,
                tag: pick(categoryLabels[p.category], lang) || '',
                title: pick(p.title, lang),
                text: pick(p.text, lang),
                location: job.location || 'Cincinnati',
                jobTitle: pick(job.title, lang) || '',
                listing: job.listing
                    ? { url: job.listing.url, text: pick(job.listing.text, lang), linkText: pick(job.listing.linkText, lang) }
                    : null,
                photos: p.photos.map((ph) => ({
                    src: `/projects/${p.job}/${ph.file}`,
                    width: ph.width || DEFAULT_SIZE.width,
                    height: ph.height || DEFAULT_SIZE.height,
                    alt: pick(ph.alt, lang),
                })),
            };
        });
}

// Homepage rotation shows at most this many featured projects; /projects shows everything.
export const MAX_FEATURED = 8;

export function getFeaturedProjects(lang = 'en', max = MAX_FEATURED) {
    return getProjects(lang, { featuredOnly: true }).slice(0, max);
}

/** Projects grouped by job (in first-appearance order) for the /projects page. */
export function getProjectsByJob(lang = 'en') {
    const groups = [];
    const byId = new Map();
    for (const p of getProjects(lang)) {
        if (!byId.has(p.jobId)) {
            const g = { id: p.jobId, title: p.jobTitle, location: p.location, listing: p.listing, projects: [] };
            byId.set(p.jobId, g);
            groups.push(g);
        }
        byId.get(p.jobId).projects.push(p);
    }
    return groups;
}
