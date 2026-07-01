/** Resize an image file client-side and return JPEG base64 (+ data URL for
 *  preview). Keeps upload payloads small to save bandwidth and AI tokens. */
export function fileToResizedBase64(
  file: File,
  maxDim = 1024,
  quality = 0.8,
): Promise<{ base64: string; mime: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas'));
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({ base64: dataUrl.split(',')[1] ?? '', mime: 'image/jpeg', dataUrl });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    img.src = url;
  });
}
