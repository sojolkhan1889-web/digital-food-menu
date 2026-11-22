import fs from 'fs';
import path from 'path';

/**
 * Vite Development Plugin for Media Uploads.
 * Enables zero-egress local image storage during development:
 * Receives optimized WebP files and writes them to public/uploads/
 * so they can be served as static CDN-ready assets with 0 database egress.
 */
export function mediaUploadPlugin() {
  return {
    name: 'vite-plugin-media-upload',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/media/upload')) {
          return next();
        }

        // Health check endpoint
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          return res.end(JSON.stringify({ status: 'ok', engine: 'Vite Local Media Engine', storage: '/uploads' }));
        }

        if (req.method === 'POST') {
          try {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
              // 15MB limit guard
              if (body.length > 15 * 1024 * 1024) {
                req.destroy();
              }
            });

            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const { dataUrl, filename, folder = 'foods' } = parsed;

                if (!dataUrl || typeof dataUrl !== 'string') {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ error: 'Missing or invalid dataUrl payload' }));
                }

                // Match data:image/xxx;base64,...
                const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (!matches || matches.length !== 3) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ error: 'Invalid Base64 Data URL format' }));
                }

                const mimeType = matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');

                // Determine extension
                let ext = 'webp';
                if (mimeType.includes('png')) ext = 'png';
                else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
                else if (mimeType.includes('webp')) ext = 'webp';

                // Target directory in public/uploads
                const publicDir = path.resolve(process.cwd(), 'public');
                const uploadDir = path.join(publicDir, 'uploads');
                if (!fs.existsSync(uploadDir)) {
                  fs.mkdirSync(uploadDir, { recursive: true });
                }

                // Clean and sanitize filename
                const baseName = (filename || 'food_media')
                  .replace(/\.[^/.]+$/, '') // remove existing ext
                  .replace(/[^a-zA-Z0-9_-]/g, '_')
                  .substring(0, 40);

                const finalFilename = `${baseName}_${Date.now()}.${ext}`;
                const targetFilePath = path.join(uploadDir, finalFilename);

                // Write file to disk
                fs.writeFileSync(targetFilePath, buffer);

                const publicUrl = `/uploads/${finalFilename}`;

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                return res.end(JSON.stringify({
                  success: true,
                  url: publicUrl,
                  filename: finalFilename,
                  sizeBytes: buffer.length,
                  sizeKb: (buffer.length / 1024).toFixed(1),
                  mimeType
                }));
              } catch (parseErr) {
                console.error('[MediaUpload] Parse error:', parseErr);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: 'Failed to process media file: ' + parseErr.message }));
              }
            });
          } catch (err) {
            console.error('[MediaUpload] Middleware error:', err);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: 'Internal server error: ' + err.message }));
          }
          return;
        }

        next();
      });
    }
  };
}
