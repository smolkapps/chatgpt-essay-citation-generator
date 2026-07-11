// Regenerates the committed raster assets in public/ (PNG icons, favicon.ico,
// and the Open Graph image) from HTML/SVG templates, using a headless Chromium
// as the rasterizer. The outputs are committed, so this only needs to run when
// the icon artwork or the OG card design changes:
//
//   CHROMIUM_BIN=/path/to/chrome node scripts/generate-assets.mjs
//
// If CHROMIUM_BIN is unset, common Chromium/Chrome locations are tried.
// No npm dependencies are required.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const PUBLIC = resolve(import.meta.dirname, "..", "public");

const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_BIN,
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const chromium = CHROMIUM_CANDIDATES.find((p) => existsSync(p));
if (!chromium) {
  console.error(
    "No Chromium found. Set CHROMIUM_BIN to a Chrome/Chromium binary and re-run.",
  );
  process.exit(1);
}

const BLUE = "#1f6feb";

/** The icon artwork: a document with text lines. `inset` shrinks it (0..1). */
function artwork(size, inset = 0) {
  const s = size * (1 - inset * 2);
  const o = size * inset;
  return `<g transform="translate(${o} ${o}) scale(${s / 64})">
    <path d="M20 16h18a6 6 0 0 1 6 6v26a4 4 0 0 0-4-4H20z" fill="#fff" opacity="0.95"/>
    <path d="M24 26h14M24 32h14M24 38h10" stroke="${BLUE}" stroke-width="2.6"
      stroke-linecap="round" fill="none"/>
  </g>`;
}

/** Rounded-corner app icon (transparent outside the corners). */
function roundedIconSVG(size) {
  const rx = Math.round((12 / 64) * size);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${rx}" fill="${BLUE}"/>
    ${artwork(size)}
  </svg>`;
}

/** Full-bleed square icon (iOS and maskable icons round it themselves). */
function squareIconSVG(size, inset) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${BLUE}"/>
    ${artwork(size, inset)}
  </svg>`;
}

function ogHTML() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin: 0; box-sizing: border-box; }
    body {
      width: 1200px; height: 630px; overflow: hidden;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #0a3d91 0%, #1f6feb 60%, #3b8bff 100%);
      color: #fff; padding: 64px 72px; display: flex; flex-direction: column;
      justify-content: space-between;
    }
    .brand { display: flex; align-items: center; gap: 28px; }
    .brand svg { border-radius: 24px; box-shadow: 0 8px 32px rgba(4, 24, 66, 0.45); }
    h1 { font-size: 62px; line-height: 1.12; letter-spacing: -0.5px; max-width: 21ch; }
    .styles { font-size: 30px; font-weight: 600; opacity: 0.92; margin-top: 18px; }
    .card {
      background: #fff; color: #1c2128; border-radius: 16px; padding: 30px 36px;
      font-size: 27px; line-height: 1.45; box-shadow: 0 10px 40px rgba(4, 24, 66, 0.4);
      position: relative;
    }
    .card .entry { padding-left: 1.6em; text-indent: -1.6em; font-family: Georgia, serif; }
    .card .badge {
      position: absolute; top: -18px; right: 28px; background: #0a3d91; color: #fff;
      font-size: 20px; font-weight: 700; padding: 6px 16px; border-radius: 999px;
      letter-spacing: 1px;
    }
    .card .intext { margin-top: 10px; color: #57606a; font-size: 23px; }
    .card .intext code {
      font-family: ui-monospace, Menlo, Consolas, monospace; background: #eef1f4;
      padding: 2px 10px; border-radius: 6px; color: #1c2128;
    }
    .foot { font-size: 26px; opacity: 0.92; font-weight: 500; }
  </style></head><body>
    <div class="brand">
      ${roundedIconSVG(110)}
      <div>
        <h1>Citation &amp; Bibliography Generator</h1>
        <div class="styles">MLA 9 &nbsp;·&nbsp; APA 7 &nbsp;·&nbsp; Chicago 17 &nbsp;·&nbsp; IEEE</div>
      </div>
    </div>
    <div class="card">
      <span class="badge">MLA</span>
      <div class="entry">Carson, Rachel. <em>Silent Spring</em>. Houghton Mifflin, 1962.</div>
      <div class="intext">In-text: <code>(Carson)</code></div>
    </div>
    <div class="foot">Free · No account · Everything stays in your browser</div>
  </body></html>`;
}

const work = mkdtempSync(join(tmpdir(), "citegen-assets-"));

function shoot(html, outPng, width, height, { transparent = false } = {}) {
  const page = join(work, `page-${width}x${height}-${Math.round(Math.random() * 1e9)}.html`);
  writeFileSync(page, html);
  const args = [
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${width},${height}`,
    `--screenshot=${outPng}`,
  ];
  if (transparent) args.splice(1, 0, "--default-background-color=00000000");
  execFileSync(chromium, [...args, `file://${page}`], { stdio: "pipe" });
  console.log("wrote", outPng);
}

function svgPage(svg) {
  return `<!doctype html><html><head><style>*{margin:0}</style></head><body>${svg}</body></html>`;
}

// Browser-tab and PWA icons keep the rounded shape on a transparent canvas.
for (const size of [32, 192, 512]) {
  const name = size === 32 ? "favicon-32.png" : `icon-${size}.png`;
  shoot(svgPage(roundedIconSVG(size)), join(PUBLIC, name), size, size, { transparent: true });
}
// iOS home-screen icon: full-bleed square (iOS applies its own corner mask).
shoot(svgPage(squareIconSVG(180, 0)), join(PUBLIC, "apple-touch-icon.png"), 180, 180);
// Maskable PWA icon: artwork inset to the ~80% safe zone.
shoot(svgPage(squareIconSVG(512, 0.1)), join(PUBLIC, "icon-maskable-512.png"), 512, 512);
// Social-preview card.
shoot(ogHTML(), join(PUBLIC, "og.png"), 1200, 630);

// favicon.ico: a single-image ICO container wrapping the 32×32 PNG
// (PNG-in-ICO is supported by every current browser and crawler).
const png = readFileSync(join(PUBLIC, "favicon-32.png"));
const header = Buffer.alloc(6 + 16);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // palette
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // color planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(png.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
writeFileSync(join(PUBLIC, "favicon.ico"), Buffer.concat([header, png]));
console.log("wrote", join(PUBLIC, "favicon.ico"));

rmSync(work, { recursive: true, force: true });
