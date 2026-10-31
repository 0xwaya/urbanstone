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
import { buildBreadcrumbSchema } from '../../lib/seo';

/** Full project gallery (/projects and /es/projects), grouped by job. */
export default function ProjectsPage({ language = 'en' }) {
    const es = language === 'es';
    const copy = projectsContent[language] || projectsContent.en;
    const groups = getProjectsByJob(language);
    const [lightbox, openLightbox] = useProjectLightbox(copy.lightbox);
    const path = es ? '/es/projects' : '/projects';
    const home = es ? '/es' : '/';
    const canonicalUrl = getCanonicalUrl(path);
    const ogImageUrl = `${getSiteUrl()}/api/og-image`;
    const title = es ? 'Proyectos | Urban Stone Collective, Cincinnati' : 'Projects | Urban Stone Collective, Cincinnati';
    const description = es
        ? 'Fotos reales de proyectos de Urban Stone Collective en el área de Cincinnati: baños a medida, encimeras de cocina y trabajos en piedra.'
        : 'Real photos of Urban Stone Collective projects around Greater Cincinnati: custom bathrooms, kitchen countertops and stonework.';
    const breadcrumbSchema = buildBreadcrumbSchema([
        { name: es ? 'Inicio' : 'Home', url: getCanonicalUrl(home) },
        { name: copy.pageTitle, url: canonicalUrl },
    ]);

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
                <meta property="og:image" content={ogImageUrl} />
                <meta name="twitter:card" content="summary_large_image" />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
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
