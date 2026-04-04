import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const brandDir = path.join(root, 'public', 'brand');
const outDir = path.join(brandDir, 'social');

const logoOut = path.join(outDir, 'urban-stone-social-logo-1080.png');
const bannerOut = path.join(outDir, 'urban-stone-social-banner-1500x500.png');

const logoIconSvgPath = path.join(brandDir, 'urban-stone-favicon.svg');
const ogSvgPath = path.join(brandDir, 'urban-stone-og.svg');

const platformTargets = [
    { filename: 'facebook-post-1200x1200.png', width: 1200, height: 1200, source: 'logo' },
    { filename: 'facebook-cover-1640x624.png', width: 1640, height: 624, source: 'banner' },
    { filename: 'instagram-feed-square-1080x1080.png', width: 1080, height: 1080, source: 'logo' },
    { filename: 'instagram-feed-portrait-1080x1350.png', width: 1080, height: 1350, source: 'logo' },
    { filename: 'instagram-story-1080x1920.png', width: 1080, height: 1920, source: 'logo' },
    { filename: 'tiktok-cover-1080x1920.png', width: 1080, height: 1920, source: 'logo' },
    { filename: 'x-post-1600x900.png', width: 1600, height: 900, source: 'banner' },
    { filename: 'x-header-1500x500.png', width: 1500, height: 500, source: 'banner' },
    { filename: 'linkedin-post-1200x627.png', width: 1200, height: 627, source: 'banner' },
    { filename: 'linkedin-company-cover-1584x396.png', width: 1584, height: 396, source: 'banner' },
];

function squareOverlaySvg() {
    return `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="64" y1="44" x2="1020" y2="1040" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0A1220"/>
      <stop offset="0.6" stop-color="#101C30"/>
      <stop offset="1" stop-color="#141F33"/>
    </linearGradient>
    <radialGradient id="glowCool" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(924 180) rotate(131) scale(312 468)">
      <stop stop-color="#4A90E2" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#4A90E2" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowWarm" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(208 120) rotate(64) scale(420 560)">
      <stop stop-color="#DDCDA5" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#DDCDA5" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1080" height="1080" rx="68" fill="url(#bg)"/>
  <rect width="1080" height="1080" rx="68" fill="url(#glowCool)"/>
  <rect width="1080" height="1080" rx="68" fill="url(#glowWarm)"/>

  <text x="540" y="776" text-anchor="middle" fill="#E9E3D6" font-family="Georgia, 'Times New Roman', serif" font-size="112" font-weight="700" letter-spacing="1.2">Urban Stone</text>
  <text x="540" y="856" text-anchor="middle" fill="#B9B7AE" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" letter-spacing="14">COLLECTIVE</text>
</svg>`;
}

async function generateLogoSquare() {
    const icon = await sharp(logoIconSvgPath)
        .resize(360, 360, { fit: 'contain' })
        .png()
        .toBuffer();

    const base = await sharp(Buffer.from(squareOverlaySvg()))
        .composite([
            {
                input: icon,
                top: 330,
                left: 360,
            },
        ])
        .png({ compressionLevel: 9 })
        .toBuffer();

    await fs.writeFile(logoOut, base);
}

async function generateBanner() {
    await sharp(ogSvgPath)
        .resize(1500, 500, { fit: 'cover', position: 'center' })
        .png({ compressionLevel: 9 })
        .toFile(bannerOut);
}

async function generatePlatformExports() {
    for (const target of platformTargets) {
        const sourcePath = target.source === 'logo' ? logoOut : bannerOut;
        const outputPath = path.join(outDir, target.filename);

        await sharp(sourcePath)
            .resize(target.width, target.height, { fit: 'cover', position: 'center' })
            .png({ compressionLevel: 9 })
            .toFile(outputPath);
    }
}

async function main() {
    await fs.mkdir(outDir, { recursive: true });
    await generateLogoSquare();
    await generateBanner();
    await generatePlatformExports();

    console.log('Generated social assets:');
    console.log(` - ${logoOut}`);
    console.log(` - ${bannerOut}`);
    for (const target of platformTargets) {
        console.log(` - ${path.join(outDir, target.filename)}`);
    }
}

main().catch((error) => {
    console.error('Failed generating social assets:', error);
    process.exitCode = 1;
});
