const GEO_REGION_BY_STATE = {
    OH: 'US-OH',
    KY: 'US-KY',
};

export function getGeoRegion(state) {
    return GEO_REGION_BY_STATE[state] || 'US-OH';
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