/**
 * PlantUML URL Encoding
 *
 * Uses deflate compression + custom Base64 encoding to create
 * PlantUML server URLs.
 */

import { deflateSync } from "zlib";

function encode6bit(b: number): string {
  if (b < 10) return String.fromCharCode(48 + b);
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b);
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b);
  b -= 26;
  if (b === 0) return "-";
  if (b === 1) return "_";
  return "?";
}

function encode3bytes(b1: number, b2: number, b3: number): string {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
}

/**
 * Encode PlantUML source for use in PlantUML server URLs.
 * Uses deflate compression followed by custom Base64 encoding.
 */
export function encodePlantUML(uml: string): string {
  const compressed = deflateSync(Buffer.from(uml, "utf-8"), { level: 9 });
  let encoded = "";
  for (let i = 0; i < compressed.length; i += 3) {
    const b1 = compressed[i];
    const b2 = i + 1 < compressed.length ? compressed[i + 1] : 0;
    const b3 = i + 2 < compressed.length ? compressed[i + 2] : 0;
    encoded += encode3bytes(b1, b2, b3);
  }
  return "~1" + encoded;
}
