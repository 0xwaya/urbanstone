import Head from 'next/head';
import Link from 'next/link';
import ChatWidget from '../ChatWidget';
import Footer from '../Footer';
import TopNav from '../TopNav';
import ProjectCard from './ProjectCard';
import { ListingLink, useProjectLightbox } from './ProjectLightbox';
import { projectsContent } from '../../data/projects-content';
import { getProjectsByJob } from '../../data/projects';
import { getCanonicalUrl, getSiteUrl } from '../../lib/site';
import { buildBreadcrumbSchema, getBusinessId } from '../../lib/seo';

/** Full project gallery (/projects and /es/projects), grouped by job. */
export default function ProjectsPage({ language = 'en' }) {
    const es = language === 'es';
    const copy = projectsContent[language] || projectsContent.en;
    const groups = getProjectsByJob(language);
    const [lightbox, openLightbox] = useProjectLightbox(copy.lightbox);
    const path = es ? '/es/projects' : '/projects';
    const home = es ? '/es' : '/';
    const canonicalUrl = getCanonicalUrl(path);
    const siteUrl = getSiteUrl();
    const allProjects = groups.flatMap((job) => job.projects);
    const coverPhoto = allProjects[0]?.photos[0];
    const ogImageUrl = coverPhoto ? `${siteUrl}${coverPhoto.src}` : `${siteUrl}/api/og-image`;
    const ogImageAlt = coverPhoto?.alt || 'Urban Stone Collective';
    const title = es ? 'Nuestros proyectos en Cincinnati: baños y cubiertas | Urban Stone' : 'Our Projects in Cincinnati: Bathrooms & Countertops | Urban Stone';
    const description = es
        ? 'Fotos reales de proyectos de Urban Stone Collective en el área de Cincinnati: baños a medida, cubiertas de cocina y trabajos en piedra, incluido un loft en Over-the-Rhine.'
        : 'Real photos of Urban Stone Collective projects around Greater Cincinnati: custom bathrooms, kitchen countertops and stonework, including an Over-the-Rhine loft.';
    const breadcrumbSchema = buildBreadcrumbSchema([
        { name: es ? 'Inicio' : 'Home', url: getCanonicalUrl(home) },
        { name: copy.pageTitle, url: canonicalUrl },
    ]);
    // CollectionPage + ImageGallery of real job photos, tied to the canonical business node.
    const gallerySchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        description,
        inLanguage: es ? 'es-US' : 'en-US',
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': getBusinessId(siteUrl) },
        primaryImageOfPage: coverPhoto ? `${siteUrl}${coverPhoto.src}` : undefined,
        mainEntity: {
            '@type': 'ImageGallery',
            name: copy.pageTitle,
            description: copy.pageIntro,
            numberOfItems: allProjects.reduce((n, p) => n + p.photos.length, 0),
            associatedMedia: allProjects.flatMap((project) =>
                project.photos.map((photo) => ({
                    '@type': 'ImageObject',
                    contentUrl: `${siteUrl}${photo.src}`,
                    url: `${siteUrl}${photo.src}`,
                    width: photo.width,
                    height: photo.height,
                    caption: `${project.title}, ${project.location}`,
                    description: photo.alt,
                    creator: { '@id': getBusinessId(siteUrl) },
                    copyrightHolder: { '@id': getBusinessId(siteUrl) },
                })),
            ),
        },
    };

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="canonical" href={canonicalUrl} />
                <link rel="alternate" hrefLang="en-US" href={getCanonicalUrl('/projects')} />
                <link rel="alternate" hrefLang="es-US" href={getCanonicalUrl('/es/projects')} />
                <link rel="alternate" hrefLang="x-default" href={getCanonicalUrl('/projects')} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:site_name" content="Urban Stone Collective" />
                <meta property="og:locale" content={es ? 'es_US' : 'en_US'} />
                <meta property="og:locale:alternate" content={es ? 'en_US' : 'es_US'} />
                <meta property="og:image" content={ogImageUrl} />
                <meta property="og:image:alt" content={ogImageAlt} />
                {coverPhoto ? <meta property="og:image:width" content={String(coverPhoto.width)} /> : null}
                {coverPhoto ? <meta property="og:image:height" content={String(coverPhoto.height)} /> : null}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content={ogImageUrl} />
                <meta name="twitter:image:alt" content={ogImageAlt} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gallerySchema) }} />
            </Head>
            <div id="top" className="min-h-screen bg-bg text-text selection:bg-accent selection:text-white">
                <div className="page-shell mx-auto max-w-7xl px-4 sm:px-8">
                    <TopNav language={language} anchorBase={es ? '/es' : '/'} altLanguageHref={es ? '/projects' : '/es/projects'} />
                    <main className="pb-6">
                        <section aria-labelledby="projects-page-heading" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                            <Link href={home} className="text-sm font-semibold text-muted hover:text-accent">← {copy.backHome}</Link>
                            <div className="eyebrow mt-4">{copy.eyebrow}</div>
                            <h1 id="projects-page-heading" className="mt-1 font-display text-4xl font-semibold leading-tight sm:text-5xl">{copy.pageTitle}</h1>
                            <p className="mt-3 max-w-3xl text-base leading-7 text-muted sm:text-lg">{copy.pageIntro}</p>

                            {groups.map((job) => (
                                <div key={job.id} className="mt-8">
                                    <div className="flex flex-col gap-2 rounded-[1.35rem] border border-border bg-panel/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h2 className="font-display text-2xl font-semibold text-text">{job.title || job.location}</h2>
                                            <p className="text-sm font-semibold text-muted">{job.location}</p>
                                        </div>
                                        <ListingLink listing={job.listing} className="sm:text-right" />
                                    </div>
                                    <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                                        {job.projects.map((project) => (
                                            <ProjectCard key={project.id} project={project} copy={copy} onOpen={openLightbox} />
                                        ))}
                                    </ul>
                                </div>
                            ))}

                            <div className="mt-8 flex justify-end border-t border-border/70 pt-5">
                                <Link className="brand-button-primary rounded-md px-5 py-3 text-center font-semibold" href={es ? '/es#quote' : '/#quote'}>{copy.cta}</Link>
                            </div>
                        </section>
                        <Footer language={language} />
                    </main>
                </div>
                <ChatWidget />
            </div>
            {lightbox}
        </>
    );
}
