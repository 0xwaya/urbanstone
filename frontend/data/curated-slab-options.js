export const curatedSlabOptions = [
    {
        group: 'Quartz',
        options: [
            { value: 'msi-calacatta-laza', label: 'Calacatta Laza', supplier: 'MSI Surfaces' },
            { value: 'msi-calacatta-miraggio', label: 'Calacatta Miraggio', supplier: 'MSI Surfaces' },
            { value: 'msi-ivori-taj', label: 'Ivori Taj', supplier: 'MSI Surfaces' },
            { value: 'daltile-kodiak', label: 'Kodiak', supplier: 'Daltile Stone Center' },
            { value: 'quartz-america-calacatta-dolce', label: 'Calacatta Dolce', supplier: 'Quartz America' },
            { value: 'quartz-america-calacatta-nile', label: 'Calacatta Nile', supplier: 'Quartz America' },
            { value: 'quartz-america-carrara-classique', label: 'Carrara Classique', supplier: 'Quartz America' },
            { value: 'avani-calacatta-aurus-5035', label: 'Calacatta Aurus (5035)', supplier: 'Avani' },
            { value: 'avani-calacatta-andromeda-5040', label: 'Calacatta Andromeda (5040)', supplier: 'Avani' },
            { value: 'avani-calacatta-gelato-5520', label: 'Calacatta Gelato (5520)', supplier: 'Avani' },
            { value: 'citi-quartz-8023-calacatta-royale', label: '8023 Calacatta Royale', supplier: 'Citi Quartz' },
            { value: 'citi-quartz-9023-calacatta-nova', label: '9023 Calacatta Nova', supplier: 'Citi Quartz' },
            { value: 'citi-quartz-pt34-taj-mahal', label: 'PT34 Taj Mahal', supplier: 'Citi Quartz' },
        ],
    },
    {
        group: 'Granite',
        options: [
            { value: 'daltile-absolute-black', label: 'Absolute Black', supplier: 'Daltile Stone Center' },
        ],
    },
    {
        group: 'Marble',
        options: [
            { value: 'daltile-fantasy-brown', label: 'Fantasy Brown', supplier: 'Daltile Stone Center' },
        ],
    },
];

export const curatedSlabOptionValues = new Set(
    curatedSlabOptions.flatMap((group) => group.options.map((option) => option.value))
);