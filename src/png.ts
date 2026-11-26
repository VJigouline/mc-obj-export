// Encodes texture images as PNG: browser images through a canvas, and raw RGBA pixels (as in
// DataTextures) directly, so textures can be written in Node too.

import { zlibSync } from 'three/examples/jsm/libs/fflate.module.js';

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Encodes 8-bit RGBA pixels, top row first, as a PNG. */
export function encodePng(width: number, height: number, rgba: Uint8Array | Uint8ClampedArray): Uint8Array {
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const v = new DataView(out.buffer);
    v.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const hv = new DataView(ihdr.buffer);
  hv.setUint32(0, width);
  hv.setUint32(4, height);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlibSync(raw)), chunk('IEND', new Uint8Array())];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

type Drawable = CanvasImageSource & { width: number; height: number };

/** A texture's image as PNG bytes, or undefined if it can't be read here. */
export async function imageToPng(image: unknown, flipY = false): Promise<Uint8Array | undefined> {
  if (!image) return undefined;
  const data = image as { data?: ArrayLike<number>; width?: number; height?: number };
  if (data.data && data.width && data.height && (data.data instanceof Uint8Array || data.data instanceof Uint8ClampedArray) && data.data.length === data.width * data.height * 4) {
    // Raw pixels, as in a DataTexture, are stored bottom row first unless flipped.
    const rows = new Uint8Array(data.data.length);
    const stride = data.width * 4;
    for (let y = 0; y < data.height; y++) rows.set((data.data as Uint8Array).subarray(y * stride, (y + 1) * stride), (flipY ? y : data.height - 1 - y) * stride);
    return encodePng(data.width, data.height, rows);
  }
  const drawable = image as Drawable;
  if (!drawable.width || !drawable.height) return undefined;
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(drawable.width, drawable.height) : typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: drawable.width, height: drawable.height }) : undefined;
  const context = canvas?.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined;
  if (!canvas || !context) return undefined;
  try {
    context.drawImage(drawable, 0, 0);
    const pixels = context.getImageData(0, 0, drawable.width, drawable.height);
    return encodePng(pixels.width, pixels.height, pixels.data);
  } catch {
    // A cross-origin image taints the canvas and can't be read.
    return undefined;
  }
}
