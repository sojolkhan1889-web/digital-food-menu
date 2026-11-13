import { initialSuperAdminRestaurants } from '../admin/super/superAdminStore';

// Clean alphanumeric slug helper without spaces or special characters (e.g. hungrybite, spicelounge, monkeybhai)
export const getRestaurantAdminSlug = (restaurant) => {
  if (!restaurant) return 'monkeybhai';
  if (restaurant.login_id && /^[a-z0-9]+$/i.test(restaurant.login_id) && restaurant.login_id.toLowerCase() !== 'admin') {
    return restaurant.login_id.toLowerCase();
  }
  const base = restaurant.slug || restaurant.name || restaurant.id || '';
  const clean = base.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean || 'monkeybhai';
};

export const normalizeSlug = (str) => {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const findRestaurantBySlug = (slugOrName, restaurantList = initialSuperAdminRestaurants) => {
  if (!slugOrName || !Array.isArray(restaurantList)) return null;
  const raw = String(slugOrName).toLowerCase().trim();
  const normalized = normalizeSlug(raw);
  if (!normalized) return null;

  return (
    restaurantList.find(r => {
      const rId = (r.id || '').toLowerCase();
      const rSlug = (r.slug || '').toLowerCase();
      const rLogin = (r.login_id || '').toLowerCase();
      const rName = (r.name || '').toLowerCase();

      return (
        rId === raw ||
        rSlug === raw ||
        rLogin === raw ||
        normalizeSlug(rSlug) === normalized ||
        normalizeSlug(rLogin) === normalized ||
        normalizeSlug(rName) === normalized ||
        normalizeSlug(rName).includes(normalized) ||
        normalized.includes(normalizeSlug(rSlug))
      );
    }) || null
  );
};

export const parseAppRoute = (pathname = (typeof window !== 'undefined' ? window.location.pathname : '')) => {
  const clean = (pathname || '').replace(/^\/+|\/+$/g, '').toLowerCase();
  const parts = clean.split('/').filter(Boolean);

  if (parts.includes('super-admin') || parts.includes('superadmin')) {
    return { view: 'superadmin', restaurantSlug: null };
  }

  if (parts.includes('admin') || parts.includes('restaurant')) {
    let candidateSlug = null;
    if (parts.length >= 2) {
      if (parts[1] === 'admin' || parts[1] === 'restaurant') {
        candidateSlug = parts[0];
      } else if (parts[0] === 'admin' || parts[0] === 'restaurant') {
        candidateSlug = parts[1];
      }
    }
    return { view: 'admin', restaurantSlug: candidateSlug };
  }

  if (parts.length > 0) {
    return { view: 'menu', restaurantSlug: parts[0] };
  }

  return { view: 'menu', restaurantSlug: null };
};

