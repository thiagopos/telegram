import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jimpModule = require('jimp');
const Jimp = jimpModule.Jimp || jimpModule.default || jimpModule;
import jsQR from 'jsqr';

export async function readQRCodeFromBuffer(buffer) {
  try {
  const image = await Jimp.read(buffer);

    const imageData = {
      data: new Uint8ClampedArray(image.bitmap.data),
      width: image.bitmap.width,
      height: image.bitmap.height,
    };

    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

    if (qrCode) {
      return qrCode.data;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error reading QR code from image:', error);
    return null;
  }
}
