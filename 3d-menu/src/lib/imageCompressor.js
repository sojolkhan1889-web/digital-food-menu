/**
 * Client-side high-definition image compressor & optimizer.
 * Produces crisp, retina-sharp WebP images for realistic 3D food presentation
 * while slashing file size by 85-95% compared to raw photos or uncompressed PNGs.
 */

export const compressImage = (fileOrDataUrl, options = {}) => {
  const {
    maxWidth = 1080,
    maxHeight = 1080,
    quality = 0.85,
    autoTrimTransparency = false,
    preferWebP = true
  } = options;

  return new Promise((resolve, reject) => {
    if (!fileOrDataUrl) {
      resolve({ dataUrl: '', width: 0, height: 0, didTrim: false, origW: 0, origH: 0 });
      return;
    }

    const img = new Image();
    let hasProcessed = false;

    // Safety timeout to prevent hanging forever
    const timeoutId = setTimeout(() => {
      if (!hasProcessed) {
        hasProcessed = true;
        reject(new Error('Image processing timed out'));
      }
    }, 10000);

    const safeProcess = () => {
      if (hasProcessed) return;
      hasProcessed = true;
      clearTimeout(timeoutId);
      processImage();
    };

    const processImage = () => {
      let origW = img.naturalWidth || img.width;
      let origH = img.naturalHeight || img.height;
      if (!origW || !origH) {
        resolve({
          dataUrl: typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '',
          width: 0,
          height: 0,
          didTrim: false,
          origW: 0,
          origH: 0
        });
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
              minX > origW * 0.05 || 
              (origW - maxX) > origW * 0.05 || 
              minY > origH * 0.05 || 
              (origH - maxY) > origH * 0.05
            );

            if (hasExcess && cW > 100 && cH > 100) {
              const padX = Math.round(cW * 0.04);
              const padY = Math.round(cH * 0.04);
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
        resolve({
          dataUrl: typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '',
          width: targetW,
          height: targetH,
          didTrim: false,
          origW,
          origH
        });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw from source crop into constrained canvas
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

      let compressedUrl = '';

      // Modern WebP is prioritized: retains 100% alpha transparency with superior compression
      if (preferWebP) {
        try {
          const webpUrl = canvas.toDataURL('image/webp', quality);
          if (webpUrl && webpUrl.startsWith('data:image/webp')) {
            compressedUrl = webpUrl;
          }
        } catch (e) {
          console.warn('[ImageCompressor] WebP export unsupported, falling back to PNG:', e);
        }
      }

      // Fallback to PNG if WebP is unsupported
      if (!compressedUrl) {
        compressedUrl = canvas.toDataURL('image/png');
      }

      resolve({
        dataUrl: compressedUrl,
        width: targetW,
        height: targetH,
        didTrim,
        origW,
        origH,
        format: compressedUrl.startsWith('data:image/webp') ? 'webp' : 'png'
      });
    };

    img.onload = safeProcess;
    img.onerror = (err) => {
      if (!hasProcessed) {
        hasProcessed = true;
        clearTimeout(timeoutId);
        reject(err);
      }
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
      if (img.complete && img.naturalWidth) {
        safeProcess();
      }
    } else if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
        if (img.complete && img.naturalWidth) {
          safeProcess();
        }
      };
      reader.onerror = (err) => {
        if (!hasProcessed) {
          hasProcessed = true;
          clearTimeout(timeoutId);
          reject(err);
        }
      };
      reader.readAsDataURL(fileOrDataUrl);
    } else {
      clearTimeout(timeoutId);
      resolve({ dataUrl: '', width: 0, height: 0, didTrim: false, origW: 0, origH: 0 });
    }
  });
};

/**
 * Convenience helper for optimizing food photos specifically.
 */
export const optimizeFoodImage = (fileOrDataUrl, options = {}) => {
  return compressImage(fileOrDataUrl, {
    maxWidth: 1080,
    maxHeight: 1080,
    quality: 0.85,
    autoTrimTransparency: true,
    preferWebP: true,
    ...options
  });
};
