import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jimpModule = require('jimp');
const Jimp = jimpModule.Jimp || jimpModule.default || jimpModule;
import jsQR from 'jsqr';

export async function readQRCodeFromBuffer(buffer) {
  try {
    const original = await Jimp.read(buffer);

    // helper to convert a Jimp instance to jsQR-friendly ImageData
    function toImageData(img) {
      return {
        data: new Uint8ClampedArray(img.bitmap.data),
        width: img.bitmap.width,
        height: img.bitmap.height,
      };
    }

    // Ensure image has at least minDim in width or height (scale up if too small)
    function ensureMinSize(img, minDim = 300) {
      const w = img.bitmap.width;
      const h = img.bitmap.height;
      const scale = Math.max(1, minDim / Math.min(w, h));
      if (scale > 1) {
        return img.clone().scale(scale, Jimp.RESIZE_LANCZOS);
      }
      return img.clone();
    }

    // Global Otsu threshold
    function otsuThreshold(img) {
      const w = img.bitmap.width;
      const h = img.bitmap.height;
      const data = img.bitmap.data;
      const hist = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        // assume grayscale or compute luminance
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        hist[lum]++;
      }
      const total = w * h;
      let sum = 0;
      for (let t = 0; t < 256; t++) sum += t * hist[t];
      let sumB = 0;
      let wB = 0;
      let wF = 0;
      let varMax = 0;
      let threshold = 0;
      for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (wB === 0) continue;
        wF = total - wB;
        if (wF === 0) break;
        sumB += t * hist[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const varBetween = wB * wF * (mB - mF) * (mB - mF);
        if (varBetween > varMax) {
          varMax = varBetween;
          threshold = t;
        }
      }

      const out = img.clone();
      const outData = out.bitmap.data;
      for (let i = 0; i < outData.length; i += 4) {
        const r = outData[i];
        const g = outData[i + 1];
        const b = outData[i + 2];
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        const v = lum > threshold ? 255 : 0;
        outData[i] = outData[i + 1] = outData[i + 2] = v;
      }
      return out;
    }

    // Adaptive mean threshold using integral image for speed
    function adaptiveThreshold(img, blockSize = 15, C = 7) {
      const w = img.bitmap.width;
      const h = img.bitmap.height;
      const data = img.bitmap.data;

      // build integral image of grayscale values
      const integral = new Uint32Array((w + 1) * (h + 1));
      for (let y = 1; y <= h; y++) {
        let rowSum = 0;
        for (let x = 1; x <= w; x++) {
          const idx = ((y - 1) * w + (x - 1)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          rowSum += lum;
          integral[y * (w + 1) + x] = integral[(y - 1) * (w + 1) + x] + rowSum;
        }
      }

      const half = Math.floor(blockSize / 2);
      const out = img.clone();
      const outData = out.bitmap.data;
      for (let y = 0; y < h; y++) {
        const y1 = Math.max(0, y - half);
        const y2 = Math.min(h - 1, y + half);
        for (let x = 0; x < w; x++) {
          const x1 = Math.max(0, x - half);
          const x2 = Math.min(w - 1, x + half);
          const count = (x2 - x1 + 1) * (y2 - y1 + 1);
          const A = integral[y1 * (w + 1) + x1];
          const B = integral[y1 * (w + 1) + (x2 + 1)];
          const Cc = integral[(y2 + 1) * (w + 1) + x1];
          const D = integral[(y2 + 1) * (w + 1) + (x2 + 1)];
          const sum = D - B - Cc + A;
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          const mean = Math.round(sum / count);
          const v = lum < mean - C ? 0 : 255;
          outData[idx] = outData[idx + 1] = outData[idx + 2] = v;
        }
      }
      return out;
    }

    // Try a single image with jsQR
    function tryDecode(img) {
      const imageData = toImageData(img);
      try {
        const qr = jsQR(imageData.data, imageData.width, imageData.height);
        if (qr) return qr.data;
      } catch (e) {
        // ignore and return null
      }
      return null;
    }

    // Series of preprocessing variants to try (from cheap -> more involved)
    const variants = [];

    // 0 - original (maybe already good)
    variants.push(async () => original.clone());

    // 1 - ensure size + slight sharpening
    variants.push(async () => ensureMinSize(original).clone().greyscale().contrast(0.1));

    // 2 - grayscale + small gaussian blur (reduce moire) then try
    variants.push(async () => ensureMinSize(original).clone().greyscale().blur(1));

    // 3 - grayscale + Otsu
    variants.push(async () => otsuThreshold(ensureMinSize(original).clone().greyscale()));

    // 4 - grayscale + adaptive threshold
    variants.push(async () => adaptiveThreshold(ensureMinSize(original).clone().greyscale(), 15, 7));

    // 5 - slightly blurred then adaptive (good for screens with moire)
    variants.push(async () => adaptiveThreshold(ensureMinSize(original).clone().greyscale().blur(1), 15, 7));

    // Try each variant and also try simple rotations (0,90,180,270)
    for (const getImg of variants) {
      const img = await getImg();
      const rotations = [0, 90, 180, 270];
      for (const deg of rotations) {
        const attempt = deg === 0 ? img : img.clone().rotate(deg);
        const res = tryDecode(attempt);
        if (res) return res;
      }
    }

    // If nothing worked, return null
    return null;
  } catch (error) {
    console.error('Error reading QR code from image:', error);
    return null;
  }
}
