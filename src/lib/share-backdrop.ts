import sharp from "sharp";
import { palette } from "./palette";

export const SHARE_IMAGE = { width: 1080, height: 1350 };

const { width: WIDTH, height: HEIGHT } = SHARE_IMAGE;
const { background, foreground, accent } = palette.dark;

const ORBIT = { x: WIDTH / 2, y: 104 };
const rings = [
  { radius: 150, dashed: false },
  { radius: 250, dashed: true },
  { radius: 370, dashed: false },
  { radius: 510, dashed: true },
  { radius: 670, dashed: false },
  { radius: 860, dashed: true },
];
const planets = [
  { ring: 1, angle: 200, size: 7 },
  { ring: 2, angle: 18, size: 9 },
  { ring: 3, angle: 162, size: 6 },
];

function orbitPoint(radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: ORBIT.x + radius * Math.cos(radians), y: ORBIT.y + radius * Math.sin(radians) };
}

const patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <radialGradient id="glow" cx="${ORBIT.x}" cy="${ORBIT.y}" r="640" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.24"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="${foreground}" fill-opacity="0.07"/>
    </pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0.3"/>
    </linearGradient>
    <mask id="dotsFade"><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#fade)"/></mask>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${background}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#dots)" mask="url(#dotsFade)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  ${rings
    .map(
      ({ radius, dashed }) =>
        `<circle cx="${ORBIT.x}" cy="${ORBIT.y}" r="${radius}" fill="none" stroke="${foreground}" stroke-opacity="0.07" stroke-width="2"${dashed ? ' stroke-dasharray="3 12" stroke-linecap="round"' : ""}/>`,
    )
    .join("")}
  ${planets
    .map(({ ring, angle, size }) => {
      const { x, y } = orbitPoint(rings[ring].radius, angle);
      return `<circle cx="${x}" cy="${y}" r="${size}" fill="${accent}" fill-opacity="0.55"/>`;
    })
    .join("")}
</svg>`;

let pattern: Promise<string> | null = null;

export function shareBackdrop() {
  pattern ??= sharp(Buffer.from(patternSvg))
    .png()
    .toBuffer()
    .then((png) => `data:image/png;base64,${png.toString("base64")}`);
  return pattern;
}

