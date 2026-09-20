import Head from 'next/head';
import LogoMark from '../../components/LogoMark';
import { useEffect, useState } from 'react';
import { getContractorAdminEmails, normalizeEmail } from '../../lib/contractor-access';
import { getSmsHref } from '../../lib/contact';

const MODE = { REGISTER: 'register', LOGIN: 'login' };

const COPY = {
    en: {
        htmlLang: 'en-US',
        title: 'Contractor Program — Urban Stone',
        eyebrow: 'Contractor Program',
        heroTitle: 'Contractor pricing and project tools.',
        heroIntro: 'Request access for commercial and multi-unit countertop work.',
        heroNote: 'Get contractor pricing, rollout planning, and commercial estimate support.',
        requestTab: 'Request Access',
        registeredTab: 'Already Registered',
        requestTitle: 'Request access',
        requestIntro: "Share your company details and we'll follow up by email.",
        loginTitle: 'Get your access link',
        loginIntro: 'Enter your approved business email.',
        email: 'Business Email',
        company: 'Company Name',
        website: 'Website or Social Profile',
        emailPlaceholder: 'you@yourcompany.com',
        companyPlaceholder: 'Apex Builders LLC',
        websitePlaceholder: 'https://yourcompany.com',
        submit: 'Submit Application',
        submitting: 'Submitting...',
        sendLink: 'Send Magic Link',
        sending: 'Sending...',
        registrationSuccess: 'Application submitted.',
        registrationError: 'Something went wrong. Please try again.',
        networkError: 'Network error. Please try again.',
        loginSuccess: 'Check your email for a magic link.',
        loginError: 'Magic link request failed. Please try again.',
        adminError: 'Admin login failed.',
    },
    es: {
        htmlLang: 'es',
        title: 'Programa para contratistas — Urban Stone',
        eyebrow: 'Programa para contratistas',
        heroTitle: 'Precios y herramientas para contratistas.',
        heroIntro: 'Solicita acceso para proyectos comerciales y de varias unidades.',
        heroNote: 'Obtén precios para contratistas, planificación de obra y apoyo para presupuestos comerciales.',
        requestTab: 'Solicitar acceso',
        registeredTab: 'Ya estoy registrado',
        requestTitle: 'Solicitar acceso',
        requestIntro: 'Comparte los datos de tu empresa y te responderemos por correo.',
        loginTitle: 'Obtener enlace de acceso',
        loginIntro: 'Ingresa el correo empresarial aprobado.',
        email: 'Correo empresarial',
        company: 'Nombre de la empresa',
        website: 'Sitio web o perfil social',
        emailPlaceholder: 'tu@empresa.com',
        companyPlaceholder: 'Constructora Apex LLC',
        websitePlaceholder: 'https://tuempresa.com',
        submit: 'Enviar solicitud',
        submitting: 'Enviando...',
        sendLink: 'Enviar enlace de acceso',
        sending: 'Enviando...',
        registrationSuccess: 'Solicitud enviada.',
        registrationError: 'Ocurrió un problema. Inténtalo de nuevo.',
        networkError: 'Error de conexión. Inténtalo de nuevo.',
        loginSuccess: 'Revisa tu correo para obtener el enlace de acceso.',
        loginError: 'No se pudo solicitar el enlace. Inténtalo de nuevo.',
        adminError: 'No se pudo iniciar la sesión de administrador.',
    },
};

export default function ContractorLogin() {
    const [mode, setMode] = useState(MODE.REGISTER);
    const [language, setLanguage] = useState('en');
    const copy = COPY[language];

    useEffect(() => {
        const savedLanguage = window.localStorage.getItem('urbanstone-contractor-language');
        if (savedLanguage === 'en' || savedLanguage === 'es') {
            setLanguage(savedLanguage);
        }
    }, []);

    useEffect(() => {
        document.documentElement.lang = copy.htmlLang;
        window.localStorage.setItem('urbanstone-contractor-language', language);
    }, [copy.htmlLang, language]);

    const handleLanguageChange = (nextLanguage) => {
        setLanguage(nextLanguage);
    };

    // Register state
    const [regEmail, setRegEmail] = useState('');
    const [regCompany, setRegCompany] = useState('');
    const [regWebsite, setRegWebsite] = useState('');
    const [regStatus, setRegStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [regMsg, setRegMsg] = useState('');

    // Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginStatus, setLoginStatus] = useState(null);
    const [loginMsg, setLoginMsg] = useState('');

    async function readApiResponse(res, fallbackMessage) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await res.json();
            return data?.message || data?.error || fallbackMessage;
        }

        const text = await res.text();
        return text || fallbackMessage;
    }

    async function handleRegister(e) {
        e.preventDefault();
        setRegStatus('loading');
        setRegMsg('');
        try {
            const res = await fetch('/api/contractor/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: regEmail, company_name: regCompany, website: regWebsite }),
            });
            if (res.ok) {
                const message = await readApiResponse(res, copy.registrationSuccess);
                setRegStatus('success');
                setRegMsg(message);
            } else {
                const message = await readApiResponse(res, copy.registrationError);
                setRegStatus('error');
                setRegMsg(message);
            }
        } catch {
            setRegStatus('error');
            setRegMsg(copy.networkError);
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        setLoginStatus('loading');
        setLoginMsg('');
        // Admin bypass: skip magic link for admin emails
        const adminEmails = getContractorAdminEmails();
        const normalized = normalizeEmail(loginEmail);
        if (adminEmails.has(normalized)) {
            // Set a session cookie and redirect to portal
            try {
                // Call a new API route to set the session directly
                const res = await fetch('/api/contractor/admin-bypass', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: loginEmail }),
                });
                if (res.ok) {
                    window.location.href = '/contractors';
                    return;
                } else {
                    const message = await readApiResponse(res, copy.adminError);
                    setLoginStatus('error');
                    setLoginMsg(message);
                    return;
                }
            } catch {
                setLoginStatus('error');
                setLoginMsg(copy.networkError);
                return;
            }
        }
        // Default: magic link flow for non-admins
        try {
            const res = await fetch('/api/contractor/request-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail }),
            });
            if (res.ok) {
                const message = await readApiResponse(res, copy.loginSuccess);
                setLoginStatus('success');
                setLoginMsg(message);
            } else {
                const message = await readApiResponse(res, copy.loginError);
                setLoginStatus('error');
                setLoginMsg(message);
            }
        } catch {
            setLoginStatus('error');
            setLoginMsg(copy.networkError);
        }
    }

    return (
        <>
            <Head>
                <title>{copy.title}</title>
                <meta name="robots" content="noindex,nofollow" />
            </Head>

            <div className="min-h-screen bg-bg px-4 py-12 text-text selection:bg-accent selection:text-white sm:px-6 sm:py-16">
                <div className="mx-auto w-full max-w-6xl">
                    <div className="mb-5 flex justify-end">
                        <div className="inline-flex items-center rounded-full border border-border bg-panel/80 p-1 shadow-soft" role="tablist" aria-label="Language">
                            {['en', 'es'].map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    role="tab"
                                    aria-selected={language === option}
                                    onClick={() => handleLanguageChange(option)}
                                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${language === option
                                        ? 'bg-accent text-white shadow-soft'
                                        : 'text-muted hover:text-text'}`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                    <div className="brand-section rounded-[2.3rem] p-6 sm:p-8">
                        <div className="flex items-center gap-3">
                            <LogoMark className="h-10 w-10" />
                            <p className="eyebrow mb-0">{copy.eyebrow}</p>
                        </div>
                        <h1 className="mt-6 text-3xl font-display font-semibold leading-tight text-text sm:text-[2.8rem]">
                            {copy.heroTitle}
                        </h1>
                        <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
                            {copy.heroIntro}
                        </p>
                        <div className="mt-6 border-l-2 border-accent/60 pl-4 text-sm leading-6 text-text">
                            {copy.heroNote}
                        </div>
                        <a
                            className="brand-button-secondary mt-6 inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold"
                            href={getSmsHref(language === 'es'
                                ? 'Hola Urban Stone, soy contratista y necesito información sobre el portal o precios para proyectos.'
                                : 'Hi Urban Stone, I am a contractor and would like portal or project pricing information.')}
                        >
                            {language === 'es' ? 'Escribir al equipo de ventas' : 'Text the sales desk'}
                        </a>
                    </div>

                    <div className="brand-section w-full overflow-hidden rounded-[2rem]">
                        {/* Tab switcher */}
                        <div className="flex border-b border-border">
                            <button
                                onClick={() => setMode(MODE.REGISTER)}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === MODE.REGISTER
                                    ? 'text-text bg-panel'
                                    : 'text-muted hover:text-text'
                                    }`}
                            >
                                {copy.requestTab}
                            </button>
                            <button
                                onClick={() => setMode(MODE.LOGIN)}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === MODE.LOGIN
                                    ? 'text-text bg-panel'
                                    : 'text-muted hover:text-text'
                                    }`}
                            >
                                {copy.registeredTab}
                            </button>
                        </div>

                        <div className="p-8">
                            {mode === MODE.REGISTER ? (
                                <>
                                    <h1 className="text-xl font-semibold text-text mb-1">{copy.requestTitle}</h1>
                                    <p className="text-sm text-muted mb-6">{copy.requestIntro}</p>

                                    {regStatus === 'success' ? (
                                        <div className="bg-accent/10 border border-accent/30 rounded-xl p-5 text-sm text-text">
                                            {regMsg}
                                        </div>
                                    ) : (
                                        <form onSubmit={handleRegister} className="flex flex-col gap-4">
                                            <div>
                                                <label className="block text-xs text-muted mb-1.5" htmlFor="reg-email">
                                                    {copy.email}
                                                </label>
                                                <input
                                                    id="reg-email"
                                                    type="email"
                                                    required
                                                    value={regEmail}
                                                    onChange={e => setRegEmail(e.target.value)}
                                                    placeholder={copy.emailPlaceholder}
                                                    className="form-input rounded-lg py-2.5 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-muted mb-1.5" htmlFor="reg-company">
                                                    {copy.company}
                                                </label>
                                                <input
                                                    id="reg-company"
                                                    type="text"
                                                    required
                                                    value={regCompany}
                                                    onChange={e => setRegCompany(e.target.value)}
                                                    placeholder={copy.companyPlaceholder}
                                                    className="form-input rounded-lg py-2.5 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-muted mb-1.5" htmlFor="reg-website">
                                                    {copy.website}
                                                </label>
                                                <input
                                                    id="reg-website"
                                                    type="url"
                                                    required
                                                    value={regWebsite}
                                                    onChange={e => setRegWebsite(e.target.value)}
                                                    placeholder={copy.websitePlaceholder}
                                                    className="form-input rounded-lg py-2.5 text-sm"
                                                />
                                            </div>
                                            {regStatus === 'error' && (
                                                <p className="text-sm text-red-400">{regMsg}</p>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={regStatus === 'loading'}
                                                className="brand-button-primary mt-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {regStatus === 'loading' ? copy.submitting : copy.submit}
                                            </button>
                                        </form>
                                    )}
                                </>
                            ) : (
                                <>
                                    <h1 className="text-xl font-semibold text-text mb-1">{copy.loginTitle}</h1>
                                    <p className="text-sm text-muted mb-6">{copy.loginIntro}</p>

                                    {loginStatus === 'success' ? (
                                        <div className="bg-accent/10 border border-accent/30 rounded-xl p-5 text-sm text-text">
                                            {loginMsg}
                                        </div>
                                    ) : (
                                        <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                            <div>
                                                <label className="block text-xs text-muted mb-1.5" htmlFor="login-email">
                                                    {copy.email}
                                                </label>
                                                <input
                                                    id="login-email"
                                                    type="email"
                                                    required
                                                    value={loginEmail}
                                                    onChange={e => setLoginEmail(e.target.value)}
                                                    placeholder={copy.emailPlaceholder}
                                                    className="form-input rounded-lg py-2.5 text-sm"
                                                />
                                            </div>
                                            {loginStatus === 'error' && (
                                                <p className="text-sm text-red-400">{loginMsg}</p>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={loginStatus === 'loading'}
                                                className="brand-button-primary mt-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {loginStatus === 'loading' ? copy.sending : copy.sendLink}
                                            </button>
                                        </form>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                </div>
                </div>
            </div>
        </>
    );
}
