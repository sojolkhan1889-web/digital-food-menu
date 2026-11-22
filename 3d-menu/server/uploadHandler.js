/**
 * Production Media Upload Handler for Private VPS / Cloud Server.
 * Can be mounted into any Node.js / Express / Fastify / HTTP server:
 * 
 * Example Express usage:
 *   const { handleMediaUploadRequest } = require('./server/uploadHandler');
 *   app.post('/api/media/upload', handleMediaUploadRequest);
 *   app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'), {
 *     maxAge: '365d',
 *     immutable: true
 *   }));
 */

import fs from 'fs';
import path from 'path';

export async function handleMediaUploadRequest(req, res) {
  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 20 * 1024 * 1024) { // 20MB limit
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const { dataUrl, filename } = JSON.parse(body || '{}');
        if (!dataUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing dataUrl' }));
        }

        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid Data URL format' }));
        }

        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        let ext = 'webp';
        if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';

        const uploadDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'public/uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const baseName = (filename || 'food_media')
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .substring(0, 40);

        const safeFilename = `${baseName}_${Date.now()}.${ext}`;
        const targetPath = path.join(uploadDir, safeFilename);

        fs.writeFileSync(targetPath, buffer);

        // Prepend custom CDN URL if configured in env (e.g. VITE_CDN_URL=https://cdn.example.com)
        const cdnPrefix = process.env.CDN_URL || '';
        const publicUrl = `${cdnPrefix}/uploads/${safeFilename}`;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          url: publicUrl,
          filename: safeFilename,
          sizeBytes: buffer.length,
          sizeKb: (buffer.length / 1024).toFixed(1)
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
