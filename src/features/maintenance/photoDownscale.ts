const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.7;

/**
 * Downscale an image File to a base64 JPEG that's at most MAX_DIMENSION on its
 * longer side. Returns the data URL string (suitable for an <img src>) and
 * suitable for direct localStorage write. Throws if the input is not an image.
 */
export async function downscaleToBase64Jpeg(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('not_an_image');
  }
  const bitmap = await readBitmap(file);
  const { width, height } = fitDimensions(bitmap.width, bitmap.height, MAX_DIMENSION);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function fitDimensions(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w >= h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function readBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image_load_failed'));
    };
    img.src = url;
  });
}
