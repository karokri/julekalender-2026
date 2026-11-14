/** Images are stored inside doors.json, so they must stay small. */
export const MAX_IMAGE_BYTES = 150_000;
const MAX_WIDTH = 900;

/**
 * Reads an image as a data URI. SVGs are used as they are; photos and other raster
 * images are scaled down (max 900 px wide) and re-encoded if they are too large.
 */
export async function readImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Velg en bildefil (SVG, PNG, JPG, GIF eller WebP).');
  const dataUrl = await readAsDataUrl(file);
  if (file.type === 'image/svg+xml' || file.size <= MAX_IMAGE_BYTES) {
    if (dataUrl.length > MAX_IMAGE_BYTES * 1.4) throw new Error('Bildet er for stort – maks ca. 150 kB.');
    return dataUrl;
  }
  return shrink(dataUrl);
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Klarte ikke å lese bildet.'));
    reader.readAsDataURL(file);
  });
}

async function shrink(dataUrl: string): Promise<string> {
  const image = await loadImage(dataUrl);
  for (const width of [MAX_WIDTH, 700, 500, 360]) {
    const scale = Math.min(1, width / image.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) break;
    context.fillStyle = '#fffaf0';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      const result = canvas.toDataURL('image/jpeg', quality);
      if (result.length <= MAX_IMAGE_BYTES * 1.37) return result;
    }
  }
  throw new Error('Bildet er for stort, selv etter forminsking. Prøv et mindre bilde.');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Klarte ikke å lese bildet.'));
    image.src = src;
  });
}
