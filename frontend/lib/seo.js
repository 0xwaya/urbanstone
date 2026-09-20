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

export function buildCountertopOfferCatalog({ url, areaServed }) {
    return {
        '@type': 'OfferCatalog',
        name: 'Countertop Fabrication & Installation Services',
        itemListElement: COUNTERTOP_SERVICES.map((service) => ({
            '@type': 'Offer',
            itemOffered: {
                '@type': 'Service',
                name: service.name,
                serviceType: `${service.material} countertops`,
                url,
                areaServed,
            },
        })),
    };
}

export function buildLocalBusinessSchema({
    id,
    url,
    image,
    telephone,
    email,
    areaServed,
    description,
    sameAs = [],
    priceRange = '$$',
}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'HomeAndConstructionBusiness',
        '@id': id,
        name: 'Urban Stone Collective',
        url,
        image,
        telephone,
        email,
        priceRange,
        geo: {
            '@type': 'GeoCoordinates',
            ...SERVICE_HUB_GEO,
        },
        areaServed,
        serviceArea: buildServiceAreaGeoCircle(),
        serviceType: ['Granite countertops', 'Quartz countertops', 'Quartzite countertops', 'Countertop fabrication', 'Countertop installation'],
        hasOfferCatalog: buildCountertopOfferCatalog({ url, areaServed }),
        sameAs,
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