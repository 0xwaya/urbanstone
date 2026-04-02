export default function LogoMark({ className = 'h-12 w-12' }) {
  return (
    <div className={`${className} flex items-center justify-center overflow-hidden`}>
      <svg viewBox="0 0 64 64" role="img" aria-label="Urban Stone Collective brand icon" className="h-full w-full">
        <defs>
          <linearGradient id="uscGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DDCDA5" />
            <stop offset="60%" stopColor="#B8B8B4" />
            <stop offset="100%" stopColor="#8B7B57" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="52" height="52" rx="12" fill="rgba(8, 12, 24, 0.6)" />
        <g transform="translate(0.4 0.4)">
          <path d="M14 37.2L21 39.8L34.7 45.1L34.8 45.2L34.8 45.4L27.2 48.5L26.4 48.9L25.7 49.1L25.5 49.1L23.8 48.2L14.1 43.7L14 43.6Z" fill="url(#uscGold)" />
          <path d="M28.4 41.1L30.2 40.4L49.6 33.2L49.9 33.2L50 33.3L50 38.6L49.6 38.9L44.3 41.2L39.7 43.3L36.8 44.5L36.4 44.5L32.7 43.1L28.4 41.3Z" fill="url(#uscGold)" />
          <path d="M27.3 49.9L27.7 49.7L29.6 48.9L48.8 40.4L49.6 40.1L49.9 40.1L50 40.2L49.9 42.9L49.7 43.1L32.7 52.4L32.5 52.5L31.9 52.3L31.3 52L27.3 50.1Z" fill="url(#uscGold)" />
          <g transform="translate(-2.9 0)">
            <path d="M23.7 35.6L24 35.4V26.1L31.1 20.6V40.2" fill="none" stroke="url(#uscGold)" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter" />
            <path d="M31.8 39.9L32.1 39.7V16.3L39.2 10.9V34.8" fill="none" stroke="url(#uscGold)" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter" />
            <path d="M41.1 35.5V25.8L47.3 21.2V32.7" fill="none" stroke="url(#uscGold)" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter" />
          </g>
        </g>
      </svg>
    </div>
  );
}
