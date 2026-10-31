// Real job photos (Urban Stone Collective install, Cincinnati). Keep copy at the level the owner
// confirmed: custom bathrooms, kitchen countertops and ledger stone walls. No addresses, client
// names, brands, specs or prices.
const W = 1681;
const H = 1118;

const photo = (file, alt) => ({ src: `/projects/${file}.jpg`, width: W, height: H, alt });

const photos = {
    marbleVanity: {
        en: 'Custom bathroom with large marble-look wall panels, a wood vanity with a dark stone top, a white vessel sink and matte black fixtures',
        es: 'Baño a medida con grandes paneles de pared estilo mármol, mueble de madera con cubierta de piedra oscura, lavabo blanco sobre cubierta y grifería negra mate',
        file: 'bathroom-marble-vanity',
    },
    marbleShower: {
        en: 'Curbless walk-in shower with large marble-look wall panels, a linear drain and matte black body sprays',
        es: 'Ducha a ras de piso con grandes paneles estilo mármol, desagüe lineal y rociadores negros mate',
        file: 'bathroom-marble-shower',
    },
    marbleWide: {
        en: 'Wide view of the custom bathroom: vessel sink on a dark stone vanity top and the open walk-in shower beyond',
        es: 'Vista amplia del baño a medida: lavabo sobre cubierta de piedra oscura y la ducha abierta al fondo',
        file: 'bathroom-marble-wide',
    },
    galley: {
        en: 'Loft galley kitchen with dark stone countertops, warm wood cabinets and a stacked-stone backsplash under industrial pendant lights',
        es: 'Cocina tipo galera en un loft con encimeras de piedra oscura, gabinetes de madera y salpicadero de piedra apilada bajo lámparas industriales',
        file: 'kitchen-galley',
    },
    galleyView: {
        en: 'View down the loft galley kitchen: dark stone countertops on both runs of wood cabinets toward tall windows',
        es: 'Vista a lo largo de la cocina tipo galera: encimeras de piedra oscura en ambos lados hacia ventanales altos',
        file: 'kitchen-galley-view',
    },
    island: {
        en: 'Loft kitchen island wrapped in a stacked ledger stone wall with a dark stone top and bar stools',
        es: 'Isla de cocina en un loft revestida con muro de piedra apilada (ledger stone), cubierta de piedra oscura y bancos altos',
        file: 'kitchen-island-ledger-stone',
    },
    islandWide: {
        en: 'Wide view of the loft kitchen: ledger stone island, wood cabinets and stacked-stone backsplash',
        es: 'Vista amplia de la cocina del loft: isla de piedra apilada, gabinetes de madera y salpicadero de piedra',
        file: 'kitchen-island-ledger-stone-wide',
    },
    flutedVanity: {
        en: 'Custom bathroom with grey textured tile, a fluted wood floating vanity with a white top, a backlit round mirror and a glass shower',
        es: 'Baño a medida con azulejo gris texturizado, mueble flotante de madera acanalada con cubierta blanca, espejo redondo retroiluminado y ducha de vidrio',
        file: 'bathroom-fluted-vanity',
    },
};

const pick = (lang, ...keys) => keys.map((k) => photo(photos[k].file, photos[k][lang]));

export const projectsContent = {
    en: {
        eyebrow: 'Our work',
        title: 'Recent projects in Cincinnati',
        intro: 'Real photos from a recent Urban Stone job: custom bathrooms, kitchen countertops and ledger stone walls.',
        viewLabel: 'View photos',
        photoCount: (n) => (n === 1 ? '1 photo' : `${n} photos`),
        cta: 'Start your project',
        lightbox: { close: 'Close', prev: 'Previous photo', next: 'Next photo', of: 'of' },
        projects: [
            { id: 'bathroom-marble', title: 'Custom bathroom', tag: 'Bathroom', text: 'Marble-look walls, a curbless walk-in shower and a wood vanity with a dark stone top.', photos: pick('en', 'marbleVanity', 'marbleShower', 'marbleWide') },
            { id: 'kitchen-galley', title: 'Galley kitchen countertops', tag: 'Kitchen', text: 'Dark stone countertops along both runs of a loft galley kitchen.', photos: pick('en', 'galley', 'galleyView') },
            { id: 'kitchen-island-ledger', title: 'Ledger stone kitchen island', tag: 'Kitchen', text: 'A stacked ledger stone wall wraps the island, finished with a dark stone top.', photos: pick('en', 'island', 'islandWide') },
            { id: 'bathroom-fluted', title: 'Custom bathroom', tag: 'Bathroom', text: 'A fluted wood floating vanity, a clean white top and a backlit mirror.', photos: pick('en', 'flutedVanity') },
        ],
    },
    es: {
        eyebrow: 'Nuestro trabajo',
        title: 'Proyectos recientes en Cincinnati',
        intro: 'Fotos reales de un trabajo reciente de Urban Stone: baños a medida, encimeras de cocina y muros de piedra apilada (ledger stone).',
        viewLabel: 'Ver fotos',
        photoCount: (n) => (n === 1 ? '1 foto' : `${n} fotos`),
        cta: 'Empieza tu proyecto',
        lightbox: { close: 'Cerrar', prev: 'Foto anterior', next: 'Foto siguiente', of: 'de' },
        projects: [
            { id: 'bathroom-marble', title: 'Baño a medida', tag: 'Baño', text: 'Paredes estilo mármol, ducha a ras de piso y mueble de madera con cubierta de piedra oscura.', photos: pick('es', 'marbleVanity', 'marbleShower', 'marbleWide') },
            { id: 'kitchen-galley', title: 'Encimeras para cocina tipo galera', tag: 'Cocina', text: 'Encimeras de piedra oscura a lo largo de ambos lados de una cocina tipo galera en un loft.', photos: pick('es', 'galley', 'galleyView') },
            { id: 'kitchen-island-ledger', title: 'Isla con muro de piedra apilada', tag: 'Cocina', text: 'Un muro de piedra apilada (ledger stone) envuelve la isla, con cubierta de piedra oscura.', photos: pick('es', 'island', 'islandWide') },
            { id: 'bathroom-fluted', title: 'Baño a medida', tag: 'Baño', text: 'Mueble flotante de madera acanalada, cubierta blanca y espejo retroiluminado.', photos: pick('es', 'flutedVanity') },
        ],
    },
};
