const GEO_REGION_BY_STATE = {
    OH: 'US-OH',
    KY: 'US-KY',
};

export function getGeoRegion(state) {
    return GEO_REGION_BY_STATE[state] || 'US-OH';
}

// Approximate service-hub coordinates (downtown Cincinnati). Used only for the
// service radius signal in structured data, not as a public storefront address.
const SERVICE_HUB_GEO = { latitude: 39.1031, longitude: -84.512 };
const SERVICE_RADIUS_METERS = 80000; // roughly 50 miles

export function getServiceHubGeo() {
    return SERVICE_HUB_GEO;
}

export function buildServiceAreaGeoCircle() {
    return {
        '@type': 'GeoCircle',
        geoMidpoint: {
            '@type': 'GeoCoordinates',
            ...SERVICE_HUB_GEO,
        },
        geoRadius: SERVICE_RADIUS_METERS,
    };
}

const COUNTERTOP_SERVICES = [
    { name: 'Quartz Countertop Fabrication & Installation', material: 'Quartz' },
    { name: 'Granite Countertop Fabrication & Installation', material: 'Granite' },
    { name: 'Quartzite Countertop Fabrication & Installation', material: 'Quartzite' },
];

export function buildCountertopOfferCatalog({ url, areaServed, focusMaterial }) {
    const services = focusMaterial
        ? COUNTERTOP_SERVICES.filter((service) => service.material.toLowerCase() === String(focusMaterial).toLowerCase())
        : COUNTERTOP_SERVICES;

    return {
        '@type': 'OfferCatalog',
        name: 'Countertop Fabrication & Installation Services',
        itemListElement: services.map((service) => ({
            '@type': 'Offer',
            itemOffered: {
                '@type': 'Service',
                name: service.name,
                serviceType: `${service.material} countertops`,
                url,
                areaServed: dedupeAreas(areaServed),
            },
        })),
    };
}

// Broader services beyond countertops, listed on the canonical business node.
const PROJECT_SERVICES = [
    { name: 'Vanity Top Fabrication & Installation', serviceType: 'Vanity tops' },
    { name: 'Cabinet Installation', serviceType: 'Cabinet installation' },
    { name: 'Kitchen & Bathroom Remodeling', serviceType: 'Remodeling' },
    { name: 'High-End Custom Bathrooms', serviceType: 'Bathroom remodeling' },
    { name: 'Full Home Remodels & Flips', serviceType: 'Home renovation' },
    { name: 'Interior Renovation & Redesign', serviceType: 'Interior renovation' },
    { name: 'Project & Job-Site Management', serviceType: 'Construction project management' },
    { name: 'Contractor & Subcontractor Coordination', serviceType: 'Construction coordination' },
    { name: 'Roofing, Framing, Painting & Flooring Crews', serviceType: 'General construction trades' },
];

export function buildBusinessOfferCatalog({ url, areaServed }) {
    const countertopCatalog = buildCountertopOfferCatalog({ url, areaServed });
    return {
        '@type': 'OfferCatalog',
        name: 'Countertop, Remodeling & Project Management Services',
        itemListElement: [
            ...countertopCatalog.itemListElement,
            ...PROJECT_SERVICES.map((service) => ({
                '@type': 'Offer',
                itemOffered: {
                    '@type': 'Service',
                    name: service.name,
                    serviceType: service.serviceType,
                    url,
                    areaServed: dedupeAreas(areaServed),
                },
            })),
        ],
    };
}

export const BUSINESS_TELEPHONE = '+1-513-307-5840';
export const BUSINESS_EMAIL = 'sales@urbanstone.co';

// Canonical list of cities served, used by the single business node.
const BUSINESS_AREA_SERVED = [
    'Cincinnati, Ohio',
    'Covington, Kentucky',
    'Newport, Kentucky',
    'Florence, Kentucky',
    'Erlanger, Kentucky',
    'Mason, Ohio',
    'West Chester, Ohio',
    'Liberty Township, Ohio',
    'Fairfield, Ohio',
    'Hamilton, Ohio',
    'Blue Ash, Ohio',
    'Loveland, Ohio',
    'Milford, Ohio',
    'Anderson Township, Ohio',
];

export function dedupeAreas(areas = []) {
    const seen = new Set();
    return areas.filter((area) => {
        const key = String(area).trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function getBusinessId(siteUrl) {
    return `${siteUrl}/#business`;
}

// One canonical service-area business node, identical on every page.
// No street address or opening hours are published on purpose.
export function buildBusinessSchema({ siteUrl, image, sameAs = [] }) {
    return {
        '@context': 'https://schema.org',
        '@type': 'HomeAndConstructionBusiness',
        '@id': getBusinessId(siteUrl),
        name: 'Urban Stone Collective',
        legalName: 'Amazon Granite LLC',
        url: siteUrl,
        image,
        logo: image,
        telephone: BUSINESS_TELEPHONE,
        email: BUSINESS_EMAIL,
        priceRange: '$$',
        areaServed: [...BUSINESS_AREA_SERVED, buildServiceAreaGeoCircle()],
        knowsLanguage: ['en', 'es'],
        hasOfferCatalog: buildBusinessOfferCatalog({ url: siteUrl, areaServed: BUSINESS_AREA_SERVED }),
        sameAs,
        description: 'Urban Stone Collective fabricates and installs quartz, granite, and quartzite countertops and vanity tops, installs cabinets, and manages full remodels, flips, and high-end custom bathrooms with its own crews across the Cincinnati metro and Northern Kentucky.',
    };
}

// Page-level Service node that points at the canonical business via provider/@id.
export function buildServiceSchema({ siteUrl, url, name, areaServed, description, focusMaterial }) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Service',
        '@id': `${url}#service`,
        name,
        url,
        serviceType: focusMaterial
            ? `${String(focusMaterial).charAt(0).toUpperCase()}${String(focusMaterial).slice(1)} countertop fabrication and installation`
            : 'Countertop fabrication and installation',
        provider: { '@id': getBusinessId(siteUrl) },
        areaServed: dedupeAreas(areaServed),
        description,
    };
}

export function buildBreadcrumbSchema(items) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}