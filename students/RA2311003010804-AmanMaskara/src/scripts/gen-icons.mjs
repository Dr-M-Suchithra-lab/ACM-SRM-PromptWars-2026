// Generates the favicon, apple-touch icon and PWA icons from the logo geometry in
// src/components/brand-mark.tsx, with Node built-ins only (no image libraries).
// Shapes are signed-distance tests, 4×4 supersampled for smooth edges.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const PRIMARY = [15, 107, 90];
const WHITE = [255, 255, 255];
const MARIGOLD = [245, 165, 36];

// Same 24-unit geometry as LOGO in brand-mark.tsx.
const LOGO = {
  badgeRadius: 6,
  face: { cx: 12, cy: 12.4, r: 7.4, width: 1.6, alpha: 0.55 },
  pivot: { x: 11, y: 14.6 },
  hands: [
    { x: 7.6, y: 11.2 },
    { x: 16.8, y: 8 },
  ],
  handWidth: 2.2,
  dotRadius: 1.7,
};

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const segmentDistance = (px, py, a, b) => {
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
};

const roundedRectInside = (x, y, size, r) => {
  const qx = Math.abs(x - size / 2) - (size / 2 - r);
  const qy = Math.abs(y - size / 2) - (size / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r <= 0;
};

/** Colour (with alpha) of one point in logo units, or null when outside the badge. */
function sample(u, v, fullBleed) {
  if (!fullBleed && !roundedRectInside(u, v, 24, LOGO.badgeRadius)) return null;
  let color = PRIMARY;
  const { face, pivot } = LOGO;
  if (Math.abs(Math.hypot(u - face.cx, v - face.cy) - face.r) <= face.width / 2) {
    color = color.map((c, i) => Math.round(c * (1 - face.alpha) + WHITE[i] * face.alpha));
  }
  if (LOGO.hands.some((h) => segmentDistance(u, v, pivot, h) <= LOGO.handWidth / 2)) color = WHITE;
  if (Math.hypot(u - pivot.x, v - pivot.y) <= LOGO.dotRadius) color = MARIGOLD;
  return color;
}

/**
 * @param size output pixels
 * @param scale share of the canvas the 24-unit logo occupies (maskable icons need a safe zone)
 */
function render(size, { scale = 1, fullBleed = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 4;
  const unit = size / 24 / scale;
  const offset = (24 - 24 * scale) / 2 / scale;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / unit - offset;
          const v = (y + (sy + 0.5) / SS) / unit - offset;
          const inLogo = u >= 0 && u <= 24 && v >= 0 && v <= 24;
          const color = inLogo ? sample(u, v, fullBleed) : fullBleed ? PRIMARY : null;
          if (color) {
            acc[0] += color[0];
            acc[1] += color[1];
            acc[2] += color[2];
            acc[3] += 1;
          }
        }
      }
      const i = (y * size + x) * 4;
      if (acc[3] > 0) {
        rgba[i] = Math.round(acc[0] / acc[3]);
        rgba[i + 1] = Math.round(acc[1] / acc[3]);
        rgba[i + 2] = Math.round(acc[2] / acc[3]);
      }
      rgba[i + 3] = Math.round((acc[3] / (SS * SS)) * 255);
    }
  }
  return encodePng(size, rgba);
}

/** ICO container holding PNG images (supported by every modern browser). */
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const at = 6 + i * 16;
    header[at] = size >= 256 ? 0 : size;
    header[at + 1] = size >= 256 ? 0 : size;
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(png.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map((img) => img.png)]);
}

writeFileSync("public/icon-192.png", render(192));
writeFileSync("public/icon-512.png", render(512));
writeFileSync("public/icon-maskable-512.png", render(512, { scale: 0.72, fullBleed: true }));
writeFileSync("public/apple-touch-icon.png", render(180, { scale: 0.86, fullBleed: true }));
writeFileSync("src/app/favicon.ico", ico([16, 32, 48].map((size) => ({ size, png: render(size) }))));
console.log("Icons written: favicon.ico, apple-touch-icon, 192, 512, maskable 512");
