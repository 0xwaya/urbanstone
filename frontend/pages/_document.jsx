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

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <link rel="icon" type="image/svg+xml" href="/brand/urban-stone-favicon.svg?v=20260401e" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=20260401e" />
                <link rel="apple-touch-icon" href="/favicon.png?v=20260401e" />
                <meta name="application-name" content="Urban Stone Collective | countertops specialists" />
                <meta name="apple-mobile-web-app-title" content="Urban Stone Collective | countertops specialists" />
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
