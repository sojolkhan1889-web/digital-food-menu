import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export const QR_COLORS = { dark: '#d93a05', light: '#ffffff' };

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

export async function qrDataUrl(url, width = 320) {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 3,
    width,
    color: QR_COLORS,
  });
}

export async function downloadTableQr({ restaurant, table }) {
  const url = getTableMenuUrl({ restaurant, table });
  const dataUrl = await qrDataUrl(url, 1400);
  const link = document.createElement('a');
  link.href = dataUrl;
  const slug = restaurant?.slug || restaurant?.menuSlug || 'restaurant';
  link.download = `${slug}-table-${String(table.tableNo).padStart(2, '0')}-qr.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
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
