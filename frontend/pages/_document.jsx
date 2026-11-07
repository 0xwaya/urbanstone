import { Head, Html, Main, NextScript } from 'next/document';

const themeInitScript = `(function () {
    try {
        var savedTheme = window.localStorage.getItem('urban-stone-theme');
        var theme = savedTheme || 'dark';
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
    } catch (error) {
        document.documentElement.dataset.theme = 'dark';
        document.documentElement.style.colorScheme = 'dark';
    }
})();`;

export default function Document(props) {
    const page = props?.__NEXT_DATA__?.page || '';
    const lang = page === '/es' || page.startsWith('/es/') ? 'es-US' : 'en-US';

    return (
        <Html lang={lang}>
            <Head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link rel="icon" type="image/svg+xml" href="/brand/urban-stone-favicon.svg?v=20260401e" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=20260401e" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20261107d" sizes="180x180" />
                <link rel="manifest" href="/manifest.webmanifest" />
                <meta name="application-name" content="Urban Stone" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-title" content="Urban Stone" />
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
