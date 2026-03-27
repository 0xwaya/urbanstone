import { Head, Html, Main, NextScript } from 'next/document';

const themeInitScript = `(function () {
    try {
        var savedTheme = window.localStorage.getItem('amazon-granite-theme');
        var supportsMatchMedia = typeof window.matchMedia === 'function';
        var preferredTheme = supportsMatchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        var theme = savedTheme || preferredTheme;
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
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}