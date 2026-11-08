/**
 * Client-side high performance image compressor and resizer.
 * Prevents bloated multi-megabyte base64 payloads from choking Supabase / network bandwidth.
 */

export const compressImage = (fileOrDataUrl, options = {}) => {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.85,
    autoTrimTransparency = false
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();

    const processImage = () => {
      let origW = img.naturalWidth || img.width;
      let origH = img.naturalHeight || img.height;
      if (!origW || !origH) {
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
        return;
      }

      // If trimming transparency was requested (e.g. food transparent PNGs)
      let cropX = 0, cropY = 0, cropW = origW, cropH = origH;
      let didTrim = false;

      if (autoTrimTransparency) {
        try {
          const scanCanvas = document.createElement('canvas');
          scanCanvas.width = origW;
          scanCanvas.height = origH;
          const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
          if (scanCtx) {
            scanCtx.drawImage(img, 0, 0);
            const imgData = scanCtx.getImageData(0, 0, origW, origH);
            const data = imgData.data;
            let minX = origW, minY = origH, maxX = 0, maxY = 0;
            let hasTransparency = false;

            for (let y = 0; y < origH; y += 2) {
              for (let x = 0; x < origW; x += 2) {
                const alpha = data[(y * origW + x) * 4 + 3];
                if (alpha < 240) hasTransparency = true;
                if (alpha > 20) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }

            const cW = maxX - minX;
            const cH = maxY - minY;
            const hasExcess = hasTransparency && (
              minX > origW * 0.06 || 
              (origW - maxX) > origW * 0.06 || 
              minY > origH * 0.06 || 
              (origH - maxY) > origH * 0.06
            );

            if (hasExcess && cW > 100 && cH > 100) {
              const padX = Math.round(cW * 0.05);
              const padY = Math.round(cH * 0.05);
              cropX = Math.max(0, minX - padX);
              cropY = Math.max(0, minY - padY);
              cropW = Math.min(origW - cropX, cW + padX * 2);
              cropH = Math.min(origH - cropY, cH + padY * 2);
              didTrim = true;
            }
          }
        } catch (e) {
          console.warn('Trim check bypassed:', e);
        }
      }

      // Calculate constrained target dimensions
      let targetW = cropW;
      let targetH = cropH;

      if (targetW > maxWidth || targetH > maxHeight) {
        const ratio = Math.min(maxWidth / targetW, maxHeight / targetH);
        targetW = Math.round(targetW * ratio);
        targetH = Math.round(targetH * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw from source crop into constrained canvas
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

      // Export as PNG (preserves crisp transparency)
      let compressedUrl = canvas.toDataURL('image/png');

      // If PNG is still larger than 250KB, test WebP compression
      if (compressedUrl.length > 250000) {
        try {
          const webpUrl = canvas.toDataURL('image/webp', quality);
          if (webpUrl && webpUrl.startsWith('data:image/webp') && webpUrl.length < compressedUrl.length) {
            compressedUrl = webpUrl;
          }
        } catch (e) {
          // fallback to png
        }
      }

      resolve({
        dataUrl: compressedUrl,
        width: targetW,
        height: targetH,
        didTrim,
        origW,
        origH
      });
    };

    img.onerror = (err) => reject(err);

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrDataUrl);
    } else {
      resolve('');
    }
  });
};

