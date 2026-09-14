const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const inputPath = "C:/Users/jude/.gemini/antigravity-ide/brain/b959ac65-60ab-4c04-9d2b-a743fc15c581/.user_uploaded/media_1789377097186.jpg";
const outputDir = path.join(__dirname, "../public/logo");
const publicDir = path.join(__dirname, "../public");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateAssets() {
  console.log("Generating ProcInvoice logo assets...");

  // Circle coordinates from analysis: cx: 527, cy: 280, radius: 228
  const cx = 527;
  const cy = 280;
  const radius = 227;
  const size = radius * 2;
  const left = cx - radius;
  const top = cy - radius;

  // 1. Full circular logo with transparent background outside circle
  // Create anti-aliased circular mask SVG
  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}">
       <circle cx="${radius}" cy="${radius}" r="${radius}" fill="white" />
     </svg>`
  );

  const croppedCircle = await sharp(inputPath)
    .extract({ left, top, width: size, height: size })
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  // Save primary full circular logo (multiple sizes)
  await sharp(croppedCircle)
    .toFile(path.join(outputDir, "procinvoice-logo.png"));
  console.log("✓ Saved procinvoice-logo.png (full size)");

  await sharp(croppedCircle)
    .resize(256, 256)
    .toFile(path.join(outputDir, "procinvoice-logo-256.png"));
  await sharp(croppedCircle)
    .resize(128, 128)
    .toFile(path.join(outputDir, "procinvoice-logo-128.png"));
  await sharp(croppedCircle)
    .resize(64, 64)
    .toFile(path.join(outputDir, "procinvoice-logo-64.png"));

  // 2. Extract Document Checkmark Icon (from around x: 480, y: 135, w: 100, h: 105)
  // Let's sample and make background transparent
  const iconCrop = await sharp(inputPath)
    .extract({ left: 480, top: 132, width: 100, height: 105 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: iconData, info: iconInfo } = iconCrop;
  const rgbaData = Buffer.alloc(iconInfo.width * iconInfo.height * 4);

  for (let i = 0; i < iconInfo.width * iconInfo.height; i++) {
    const srcIdx = i * iconInfo.channels;
    const dstIdx = i * 4;
    const r = iconData[srcIdx];
    const g = iconData[srcIdx + 1];
    const b = iconData[srcIdx + 2];

    rgbaData[dstIdx] = r;
    rgbaData[dstIdx + 1] = g;
    rgbaData[dstIdx + 2] = b;

    // Background is off-white (R, G, B > 215)
    // Bronze icon is R ~ 160-200, G ~ 120-150, B ~ 80-110
    const brightness = (r + g + b) / 3;
    if (brightness > 220) {
      rgbaData[dstIdx + 3] = 0; // transparent
    } else if (brightness > 200) {
      // Smooth anti-aliased edge
      const alpha = Math.round((1 - (brightness - 200) / 20) * 255);
      rgbaData[dstIdx + 3] = alpha;
    } else {
      rgbaData[dstIdx + 3] = 255;
    }
  }

  const iconBuffer = await sharp(rgbaData, {
    raw: {
      width: iconInfo.width,
      height: iconInfo.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  // Save isolated icon
  await sharp(iconBuffer).toFile(path.join(outputDir, "procinvoice-icon-raw.png"));

  // Create a clean, high-contrast icon badge on a subtle premium rounded badge
  // Suitable for dark UI (sidebar collapsed) and favicons!
  const iconBadgeSvg = (w, h, cornerRadius = 8) => Buffer.from(
    `<svg width="${w}" height="${h}">
       <rect width="${w}" height="${h}" rx="${cornerRadius}" fill="#1e293b" />
       <rect width="${w}" height="${h}" rx="${cornerRadius}" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-opacity="0.4" />
     </svg>`
  );

  // Favicon 16x16, 32x32, 48x48
  // For small favicons (16 and 32), an SVG/sharp rendering with high contrast checkmark is clearest
  const faviconSvg = (s) => Buffer.from(`
    <svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="#0f172a"/>
      <rect x="0.5" y="0.5" width="31" height="31" rx="6.5" stroke="#38bdf8" stroke-opacity="0.6"/>
      <!-- Document outline -->
      <path d="M9 7C9 5.89543 9.89543 5 11 5H18L23 10V25C23 26.1046 22.1046 27 21 27H11C9.89543 27 9 26.1046 9 25V7Z" stroke="#38bdf8" stroke-width="2" fill="#1e293b"/>
      <path d="M17 5V10H22" stroke="#38bdf8" stroke-width="1.5"/>
      <!-- Checkmark -->
      <path d="M12 17.5L15 20.5L20.5 14" stroke="#c084fc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `);

  // Let's create favicon files:
  await sharp(faviconSvg(16)).png().toFile(path.join(publicDir, "favicon-16x16.png"));
  await sharp(faviconSvg(32)).png().toFile(path.join(publicDir, "favicon-32x32.png"));
  await sharp(faviconSvg(48)).png().toFile(path.join(publicDir, "favicon-48x48.png"));
  await sharp(faviconSvg(180)).png().toFile(path.join(publicDir, "apple-touch-icon.png"));
  await sharp(faviconSvg(192)).png().toFile(path.join(publicDir, "android-chrome-192x192.png"));
  await sharp(faviconSvg(512)).png().toFile(path.join(publicDir, "android-chrome-512x512.png"));

  // Also write favicon.ico (32x32 PNG is valid ico in modern browsers or we can save it)
  await sharp(faviconSvg(32)).png().toFile(path.join(publicDir, "favicon.ico"));
  console.log("✓ Saved favicon set in /public");

  // Icon badge for collapsed sidebar:
  const sidebarIcon = await sharp(faviconSvg(64))
    .png()
    .toFile(path.join(outputDir, "procinvoice-icon.png"));
  console.log("✓ Saved procinvoice-icon.png");

  // 3. Horizontal Lockup (Circular Badge on left + crisp ProcInvoice text on right)
  const horizontalSvg = Buffer.from(`
    <svg width="240" height="48" viewBox="0 0 240 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#cbd5e1"/>
        </linearGradient>
        <linearGradient id="subGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#818cf8"/>
        </linearGradient>
      </defs>
      <text x="56" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="20" fill="url(#textGrad)" letter-spacing="-0.02em">ProcInvoice</text>
      <text x="56" y="40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="9" fill="url(#subGrad)" letter-spacing="0.1em">SMART OCR &amp; COMPLIANCE</text>
    </svg>
  `);

  const smallCircle = await sharp(croppedCircle).resize(42, 42).png().toBuffer();
  await sharp(horizontalSvg)
    .composite([{ input: smallCircle, top: 3, left: 4 }])
    .png()
    .toFile(path.join(outputDir, "procinvoice-horizontal.png"));
  console.log("✓ Saved procinvoice-horizontal.png");

  // 4. OpenGraph image (1200x630) for link previews and social meta tags
  const ogSvg = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#090d16"/>
          <stop offset="50%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e1b4b"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bgGrad)"/>
      <circle cx="600" cy="240" r="300" fill="url(#glow)"/>
      <text x="600" y="450" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="48" fill="#ffffff" letter-spacing="-0.02em">ProcInvoice</text>
      <text x="600" y="495" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="500" font-size="22" fill="#94a3b8">Automated Invoice Recognition, Dutch Compliance &amp; UBL 2.1 Export</text>
    </svg>
  `);

  const largeCircle = await sharp(croppedCircle).resize(260, 260).png().toBuffer();
  await sharp(ogSvg)
    .composite([{ input: largeCircle, top: 110, left: 470 }])
    .png()
    .toFile(path.join(publicDir, "og-image.png"));
  console.log("✓ Saved og-image.png (1200x630)");

  console.log("All logo assets generated successfully!");
}

generateAssets().catch(console.error);
