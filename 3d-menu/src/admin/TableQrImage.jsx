import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export const QR_COLORS = { dark: '#ea580c', light: '#ffffff' };

export const formatTable = (n) => `Table ${String(n).padStart(2, '0')}`;
export const formatTableId = (n) => `TBL-${String(n).padStart(3, '0')}`;

/**
 * Encode a restaurant-specific menu URL plus the immutable table's public ID.
 * Customer app validates both fields SERVER-SIDE before showing menu/order flow.
 */
export function getTableMenuUrl({ restaurant, table }) {
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : (import.meta.env.VITE_PUBLIC_MENU_BASE_URL || 'http://localhost:5173');
  const slug = restaurant?.slug || restaurant?.menuSlug || '3d-dine';
  const url = new URL(`${origin.replace(/\/$/, '')}/${encodeURIComponent(slug)}`);
  url.searchParams.set('table', table?.publicId || table?.tableNo || table?.id);
  return url.toString();
}

export async function qrDataUrl(url, width = 360) {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 3,
    width,
    color: QR_COLORS,
  });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generates the official printable Table Stand / Tent Card template
 * exactly as specified in the reference design.
 */
export async function generateTableStandCardDataUrl({ restaurant, table }) {
  const width = 800;
  const height = 1120;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Pure White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. Outer thick orange border
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // 3. Inner thin orange border
  ctx.lineWidth = 2.5;
  ctx.strokeRect(34, 34, width - 68, height - 68);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 4. Restaurant Name
  const restaurantName = restaurant?.name || 'Hungry Bite Café';
  ctx.font = 'bold 38px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(restaurantName, width / 2, 115);

  // 5. Subtitle
  ctx.font = '600 13.5px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('3D DIGITAL MENU & TABLE ORDERING', width / 2, 150);

  // 6. Table Pill Badge
  const tableText = `TABLE ${String(table?.tableNo || 1).padStart(2, '0')}`;
  const pillW = 230;
  const pillH = 46;
  const pillX = (width - pillW) / 2;
  const pillY = 185;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = 2.8;
  ctx.stroke();

  ctx.font = 'bold 22px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#ea580c';
  ctx.fillText(tableText, width / 2, pillY + pillH / 2);

  // 7. QR Code Image Card
  const menuUrl = getTableMenuUrl({ restaurant, table });
  const qrData = await QRCode.toDataURL(menuUrl, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 440,
    color: { dark: '#ea580c', light: '#ffffff' }
  });

  await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Soft card backing behind QR
      const cardSize = 460;
      const cardX = (width - cardSize) / 2;
      const cardY = 265;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      drawRoundedRect(ctx, cardX, cardY, cardSize, cardSize, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();

      ctx.drawImage(img, (width - 440) / 2, cardY + 10, 440, 440);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = qrData;
  });

  // 8. Headline below QR
  ctx.font = 'bold 24px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Scan with Phone Camera to View Menu', width / 2, 785);

  // 9. Instructions below QR
  ctx.font = '500 15px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Orders will automatically include this table number', width / 2, 825);

  // 10. Unique Table URL
  ctx.font = 'bold 13px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#ea580c';
  const displayUrl = menuUrl.length > 72 ? menuUrl.slice(0, 69) + '...' : menuUrl;
  ctx.fillText(`Unique Table URL: ${displayUrl}`, width / 2, 868);

  // 11. Footer
  ctx.font = '500 13px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Powered by Digital Food Menu System', width / 2, 975);

  return canvas.toDataURL('image/png');
}

/**
 * Downloads the complete printable Table Stand template as PNG.
 */
export async function downloadTableQr({ restaurant, table }) {
  try {
    const cardDataUrl = await generateTableStandCardDataUrl({ restaurant, table });
    const link = document.createElement('a');
    link.href = cardDataUrl;
    const slug = restaurant?.slug || restaurant?.menuSlug || 'restaurant';
    link.download = `${slug}-table-${String(table?.tableNo || 1).padStart(2, '0')}-qr-stand.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (e) {
    console.error('Error generating printable table card, falling back to raw QR:', e);
    const url = getTableMenuUrl({ restaurant, table });
    const rawQr = await qrDataUrl(url, 1400);
    const link = document.createElement('a');
    link.href = rawQr;
    const slug = restaurant?.slug || restaurant?.menuSlug || 'restaurant';
    link.download = `${slug}-table-${String(table?.tableNo || 1).padStart(2, '0')}-qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

export default function TableQrImage({ restaurant, table, size = 66 }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    const url = getTableMenuUrl({ restaurant, table });
    qrDataUrl(url, 360)
      .then((data) => {
        if (!cancelled) setSrc(data);
      })
      .catch(() => {
        if (!cancelled) setSrc('');
      });
    return () => {
      cancelled = true;
    };
  }, [restaurant?.slug, table?.publicId, table?.tableNo, table?.id]);

  return (
    <div className="qr-image-frame" style={{ width: size, height: size }}>
      {src ? (
        <img
          className="qr-image"
          src={src}
          alt={`QR for ${restaurant?.name || 'Restaurant'} ${formatTable(table?.tableNo || 1)}`}
        />
      ) : (
        <span className="qr-loader" aria-label="Generating QR" />
      )}
    </div>
  );
}
