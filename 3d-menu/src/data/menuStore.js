// Menu Data Store with Local Storage persistence & Supabase Sync capabilities
import { initialFoods, initialCategories } from './initialFoods';
import { supabase } from '../lib/supabaseClient';

const FOODS_KEY = 'dgm_restaurant_foods';
const FOODS_VERSION_KEY = 'dgm_foods_cache_version';
const CURRENT_FOODS_VERSION = 'v5_optimized_fast_cloud';
const SETTLEMENT_KEY = 'dgm_due_settlement_balance';
const SETTLEMENT_PAID_KEY = 'dgm_restaurant_due_settled';
const CATEGORIES_KEY = 'dgm_restaurant_categories';
const ORDERS_KEY = 'dgm_restaurant_orders';
const PAYMENTS_KEY = 'dgm_restaurant_payments';
const AUTH_KEY = 'dgm_restaurant_auth';
const THEME_KEY = 'dgm_restaurant_theme';

export const initialOrders = [
  {
    id: 'ord_1',
    orderNumber: '#ORD-8423',
    tableNumber: 'Table 04',
    customerName: 'Customer #4',
    diningMode: 'dine-in',
    items: [
      { title: 'Double Flame Cheeseburger', portion: 'Royale Triple Stack', quantity: 1, price: 19.49 },
      { title: 'Iced Caramel Macchiato', portion: 'Grande Jar', quantity: 1, price: 8.00 }
    ],
    totalAmount: 27.49,
    subtotal: 24.20,
    vat: 1.29,
    serviceFee: 2.00,
    paymentMethod: 'bKash',
    paymentStatus: 'paid',
    orderStatus: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    displayTime: '12 mins ago'
  },
  {
    id: 'ord_2',
    orderNumber: '#ORD-8422',
    tableNumber: 'Table 02',
    customerName: 'Customer #2',
    diningMode: 'dine-in',
    items: [
      { title: 'Artisan Wood-Fired Pizza', portion: '14" Family Stonebake', quantity: 1, price: 24.00 }
    ],
    totalAmount: 26.20,
    subtotal: 24.00,
    vat: 1.20,
    serviceFee: 1.00,
    paymentMethod: 'Credit Card',
    paymentStatus: 'paid',
    orderStatus: 'preparing',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    displayTime: '35 mins ago'
  },
  {
    id: 'ord_3',
    orderNumber: '#ORD-8421',
    tableNumber: 'Table 07',
    customerName: 'Customer #7',
    diningMode: 'dine-in',
    items: [
      { title: 'Korean Gochujang Crisp Chicken', portion: '10 Pcs Party Box', quantity: 1, price: 22.50 },
      { title: 'Royal Pistachio Kunafa', portion: 'Family Platter', quantity: 1, price: 18.00 }
    ],
    totalAmount: 43.50,
    subtotal: 40.50,
    vat: 2.00,
    serviceFee: 1.00,
    paymentMethod: 'Nagad',
    paymentStatus: 'paid',
    orderStatus: 'completed',
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    displayTime: '1.5 hrs ago'
  },
  {
    id: 'ord_4',
    orderNumber: '#ORD-8419',
    tableNumber: 'Table 01',
    customerName: 'Customer #1',
    diningMode: 'takeaway',
    items: [
      { title: 'Double Flame Cheeseburger', portion: 'Regular Double Stack', quantity: 1, price: 15.99 }
    ],
    totalAmount: 17.79,
    subtotal: 15.99,
    vat: 0.80,
    serviceFee: 1.00,
    paymentMethod: 'Cash',
    paymentStatus: 'unpaid',
    orderStatus: 'cancelled',
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    displayTime: '4 hrs ago'
  }
];

export const initialPayments = [
  {
    id: 'pay_1',
    transactionId: 'TXN-98421-BK',
    orderNumber: '#ORD-8423',
    amount: 27.49,
    paymentMethod: 'bKash',
    status: 'completed',
    customer: 'Customer #4 (Table 04)',
    date: 'Today, 01:12 PM'
  },
  {
    id: 'pay_2',
    transactionId: 'TXN-98420-CC',
    orderNumber: '#ORD-8422',
    amount: 26.20,
    paymentMethod: 'Credit Card (Visa)',
    status: 'completed',
    customer: 'Customer #2 (Table 02)',
    date: 'Today, 12:48 PM'
  },
  {
    id: 'pay_3',
    transactionId: 'TXN-98418-NG',
    orderNumber: '#ORD-8421',
    amount: 43.50,
    paymentMethod: 'Nagad',
    status: 'completed',
    customer: 'Customer #7 (Table 07)',
    date: 'Today, 11:30 AM'
  }
];

// --- Foods Management with Supabase Sync & High-Speed Cache ---
const IDB_NAME = 'DGM_Database';
const IDB_STORE = 'foods_cache';

const openIDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveFoodsToIndexedDB = async (foods) => {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    foods.forEach(food => {
      store.put({ ...food, id: String(food.id) });
    });
  } catch (e) {
    // Ignore in unsupported environments
  }
};

export const loadFoodsFromIndexedDB = async () => {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result;
        if (Array.isArray(items) && items.length >= 8) {
          const cleaned = items.filter(f => String(f.title || '').trim().toLowerCase() !== 'kacchi');
          resolve(cleaned.map(mapFoodItem));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

export const resolveFoodImage = (image, fallback) => {
  if (fallback?.image) {
    if (!image || (typeof image === 'string' && image.startsWith('/src/assets/'))) {
      return fallback.image;
    }
  }
  return image || (fallback ? fallback.image : null);
};

const mapFoodItem = (item) => {
  const fallback = initialFoods.find(f => String(f.id) === String(item.id) || f.title === item.title);
  return {
    ...item,
    id: String(item.id),
    title: item.title,
    price: Number(item.price || 0),
    oldPrice: item.oldPrice ? Number(item.oldPrice) : undefined,
    category: item.category || (fallback ? fallback.category : 'Main Course'),
    subcategory: item.subcategory || (fallback ? fallback.subcategory : undefined),
    image: resolveFoodImage(item.image, fallback),
    is_published: item.is_published !== false && item.status !== 'unpublished' && item.status !== 'draft',
    status: item.status || (item.is_published === false ? 'unpublished' : 'published'),
    ambientGlow: item.ambientGlow || (fallback ? fallback.ambientGlow : 'rgba(234, 88, 12, 0.45)'),
    themeColor: item.themeColor || (fallback ? fallback.themeColor : '#EA580C'),
    gradient: item.gradient || (fallback ? fallback.gradient : 'from-orange-500/25 via-red-500/15 to-transparent'),
    ingredients: Array.isArray(item.ingredients) ? item.ingredients : (fallback ? fallback.ingredients : ['Fresh Ingredients', 'Chef Selected Spices']),
    customizable: item.customizable || (fallback ? fallback.customizable : undefined)
  };
};

export const getStoredFoods = () => {
  try {
    const version = localStorage.getItem(FOODS_VERSION_KEY);
    const data = localStorage.getItem(FOODS_KEY);
    if (data) {
      let parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 1. Immediately eliminate any ghost 'Kacchi' item
        let cleaned = parsed.filter(item => {
          const t = String(item.title || '').trim().toLowerCase();
          return t !== 'kacchi' && String(item.id).toLowerCase() !== 'kacchi';
        });

        // 2. Check if KACCHI BIRYANI exists in cleaned
        const hasBiryani = cleaned.some(item => 
          String(item.title || '').trim().toUpperCase() === 'KACCHI BIRYANI'
        );

        // 3. If version matches and has KACCHI BIRYANI and count is >= 8, return clean items
        if (version === CURRENT_FOODS_VERSION && hasBiryani && cleaned.length >= 8) {
          return cleaned.map(mapFoodItem);
        }

        // 4. If cache is outdated or missing items, merge missing items from initialFoods
        const cleanedIds = new Set(cleaned.map(i => String(i.id)));
        const missing = initialFoods.filter(i => !cleanedIds.has(String(i.id)));
        const merged = [...cleaned, ...missing];

        saveStoredFoods(merged);
        localStorage.setItem(FOODS_VERSION_KEY, CURRENT_FOODS_VERSION);
        return merged.map(mapFoodItem);
      }
    }
  } catch (e) {
    console.error('Error reading foods from storage:', e);
  }

  // Fallback to initialFoods (all 8 official dishes)
  saveStoredFoods(initialFoods);
  try {
    localStorage.setItem(FOODS_VERSION_KEY, CURRENT_FOODS_VERSION);
  } catch (e) {}
  return initialFoods.map(mapFoodItem);
};

export const saveStoredFoods = (foods) => {
  if (!Array.isArray(foods)) return;

  // Filter out any stale 'Kacchi'
  const filtered = foods.filter(item => {
    const t = String(item.title || '').trim().toLowerCase();
    return t !== 'kacchi' && String(item.id).toLowerCase() !== 'kacchi';
  });

  // Asynchronously cache to IndexedDB (supports unlimited storage for high-res images)
  saveFoodsToIndexedDB(filtered);

  // Safely save to localStorage (strip massive base64 strings to prevent QuotaExceededError)
  try {
    const safePayload = filtered.map(item => {
      if (item.image && typeof item.image === 'string' && item.image.startsWith('data:') && item.image.length > 50000) {
        const fallback = initialFoods.find(f => String(f.id) === String(item.id) || f.title === item.title);
        return {
          ...item,
          image: fallback ? fallback.image : item.image.slice(0, 50000)
        };
      }
      return item;
    });
    localStorage.setItem(FOODS_KEY, JSON.stringify(safePayload));
    localStorage.setItem(FOODS_VERSION_KEY, CURRENT_FOODS_VERSION);
  } catch (e) {
    console.warn('Quota safe save fallback triggered:', e);
  }
};

// --- Platform Due Settlement Management ---
export const getStoredSettlementDue = (todayFees = 0) => {
  try {
    const isSettled = localStorage.getItem(SETTLEMENT_PAID_KEY) === 'true';
    if (isSettled) return 0;
    const stored = localStorage.getItem(SETTLEMENT_KEY);
    if (stored !== null) {
      const num = Number(stored);
      return isNaN(num) ? todayFees : num;
    }
  } catch (e) {}
  return todayFees;
};

export const saveStoredSettlementDue = (amount) => {
  try {
    localStorage.setItem(SETTLEMENT_KEY, String(amount));
    localStorage.setItem(SETTLEMENT_PAID_KEY, amount === 0 ? 'true' : 'false');
  } catch (e) {}
};

export const settlePlatformDues = () => {
  try {
    localStorage.setItem(SETTLEMENT_KEY, '0');
    localStorage.setItem(SETTLEMENT_PAID_KEY, 'true');
  } catch (e) {}
  return 0;
};

export const resetPlatformDues = (amount = 0) => {
  try {
    localStorage.setItem(SETTLEMENT_KEY, String(amount));
    localStorage.setItem(SETTLEMENT_PAID_KEY, 'false');
  } catch (e) {}
  return amount;
};

export const parseDateTime = (input) => {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  try {
    let d = new Date(input);
    if (!isNaN(d.getTime())) return d;
    if (typeof input === 'string') {
      const fixed = input.replace(' ', 'T').replace(/\+00$/, 'Z').replace(/\+00:00$/, 'Z');
      d = new Date(fixed);
      if (!isNaN(d.getTime())) return d;
    }
  } catch {}
  return null;
};

// --- Universal Date Comparison (Handles UTC, Local Timezones, and ISO vs Postgres strings) ---
export const isSameCalendarDay = (dateInput) => {
  const d = parseDateTime(dateInput);
  if (!d) return false;
  const now = new Date();
  // 1. Same local calendar day (Browser / Venue timezone)
  if (d.toDateString() === now.toDateString()) return true;
  // 2. Same UTC calendar day
  try {
    if (d.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)) return true;
  } catch {}
  // 3. Fallback: placed in the last 24 hours of today
  const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
  return diffHours >= 0 && diffHours < 24;
};

// --- Live Menu Scans Tracking (Real Cloud & Local Customer Engagement) ---
const SCANS_STORAGE_KEY = 'dgm_menu_scans_data';

export const recordMenuScan = async (restaurantId = 'resto_001', tableNumber = 'Table 04') => {
  const now = new Date().toISOString();
  // 1. Save locally for instant offline cache
  try {
    const key = `${SCANS_STORAGE_KEY}_${restaurantId}`;
    const raw = localStorage.getItem(key);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list.push(now);
    if (list.length > 500) list = list.slice(-500);
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}

  // 2. Direct Sync to Supabase menu_scans table so scans count across ALL devices & panels
  try {
    const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '').slice(0, 120) : 'Web Client';
    await supabase.from('menu_scans').insert([{
      restaurant_id: restaurantId,
      table_number: tableNumber,
      device_info: userAgent,
      scanned_at: now
    }]);
  } catch (err) {
    console.warn('Could not sync scan to Supabase:', err);
  }
};

export const fetchLiveMenuScansFromSupabase = async (restaurantId = null) => {
  try {
    let query = supabase.from('menu_scans').select('*').order('created_at', { ascending: false });
    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }
    const { data, error } = await safeQuery(query);
    if (error || !Array.isArray(data)) {
      return getMenuScans(restaurantId || 'resto_001');
    }
    const totalScans = data.length;
    const todayScans = data.filter(s => isSameCalendarDay(s.scanned_at || s.created_at)).length;

    // Cache latest counts
    try {
      localStorage.setItem(`dgm_live_scans_${restaurantId || 'all'}`, JSON.stringify({ totalScans, todayScans }));
    } catch {}

    return { totalScans, todayScans };
  } catch (e) {
    return getMenuScans(restaurantId || 'resto_001');
  }
};

export const getMenuScans = (restaurantId = 'resto_001', ordersCount = 0) => {
  try {
    const cached = localStorage.getItem(`dgm_live_scans_${restaurantId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (typeof parsed.totalScans === 'number') {
        return parsed;
      }
    }
    const key = `${SCANS_STORAGE_KEY}_${restaurantId}`;
    const raw = localStorage.getItem(key);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    const totalScans = Math.max(list.length, ordersCount > 0 ? ordersCount * 2 : 0);
    const todayList = list.filter(ts => isSameCalendarDay(ts));

    return {
      totalScans,
      todayScans: todayList.length
    };
  } catch (e) {
    return { totalScans: ordersCount * 2, todayScans: 0 };
  }
};

// --- Real Restaurant Followers & Loyal Diners ---
const FOLLOWERS_STORAGE_KEY = 'dgm_followers_data';

export const getRestaurantFollowers = (restaurantId = 'resto_001', ordersList = []) => {
  try {
    const key = `${FOLLOWERS_STORAGE_KEY}_${restaurantId}`;
    const raw = localStorage.getItem(key);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    // Distinct customer diners who have placed orders
    const dinerSet = new Set(
      ordersList
        .filter(o => o.customerName && o.customerName !== 'Customer')
        .map(o => o.customerPhone || o.customerName)
    );

    const totalFollowers = Math.max(list.length, dinerSet.size);
    const todayFollowers = list.filter(f => isSameCalendarDay(f.date || f)).length;

    return {
      totalFollowers,
      todayFollowers
    };
  } catch (e) {
    return { totalFollowers: 0, todayFollowers: 0 };
  }
};

export const syncFoodToSupabase = async (food) => {
  try {
    const isPub = food.is_published !== false && food.status !== 'unpublished' && food.status !== 'draft';
    let imageToSync = food.image || null;
    if (typeof imageToSync === 'string' && imageToSync.startsWith('data:') && imageToSync.length > 250000) {
      const fallback = initialFoods.find(f => String(f.id) === String(food.id) || f.title === food.title);
      if (fallback?.image && !fallback.image.startsWith('data:')) {
        imageToSync = `/src/assets/${food.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      }
    }
    const payload = {
      id: String(food.id),
      restaurant_id: 'resto_001',
      category_name: food.category || 'Main Course',
      subcategory: food.subcategory || null,
      title: food.title,
      tag: food.tag || 'Best Selling',
      rating: Number(food.rating || 5.0),
      rating_count: Number(food.ratingCount || 1),
      price: Number(food.price || 0),
      old_price: food.oldPrice ? Number(food.oldPrice) : null,
      description: food.description || null,
      image: imageToSync,
      is_published: isPub,
      status: food.status || (isPub ? 'published' : 'unpublished'),
      customizable: food.customizable || null
    };

    const { error } = await supabase.from('food_items').upsert([payload]);
    if (error) console.warn('Supabase food sync warning:', error);
  } catch (err) {
    console.warn('Supabase food sync caught:', err);
  }
};

export const deleteFoodFromSupabase = async (foodId) => {
  try {
    await supabase.from('food_items').delete().eq('id', String(foodId));
  } catch (err) {
    console.warn('Supabase food delete caught:', err);
  }
};

// --- Categories Management with Supabase Sync ---
export const getStoredCategories = () => {
  try {
    const data = localStorage.getItem(CATEGORIES_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set(parsed.filter(c => Boolean(c) && String(c).toLowerCase() !== 'all')));
      }
    }
  } catch (e) {
    console.error('Error reading categories from storage:', e);
  }
  return Array.from(new Set(initialCategories.filter(c => Boolean(c) && String(c).toLowerCase() !== 'all')));
};

export const saveStoredCategories = (categories) => {
  try {
    const unique = Array.from(new Set(categories.filter(c => Boolean(c) && String(c).toLowerCase() !== 'all')));
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(unique));
  } catch (e) {
    console.error('Error saving categories to storage:', e);
  }
};

export const syncCategoryToSupabase = async (catName) => {
  try {
    const slug = catName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const { error } = await supabase.from('categories').upsert([{
      id: `cat_${slug}`,
      restaurant_id: 'resto_001',
      name: catName,
      is_published: true,
      display_order: 10
    }]);
    if (error) console.warn('Supabase category sync warning:', error);
  } catch (err) {
    console.warn('Supabase category sync caught:', err);
  }
};

export const deleteCategoryFromSupabase = async (catName) => {
  try {
    await supabase.from('categories').delete().eq('name', catName);
  } catch (err) {
    console.warn('Supabase category delete caught:', err);
  }
};

// --- Safe query helper to prevent Promise.all failure cascades ---
const safeQuery = async (promise) => {
  try {
    const res = await promise;
    if (res?.error) {
      console.warn('Supabase query warning:', res.error.message || res.error);
      return { data: null, error: res.error };
    }
    return res || { data: null, error: null };
  } catch (err) {
    console.warn('Supabase query network exception:', err);
    return { data: null, error: err };
  }
};

// --- Remote Fetch on Mount to ensure Cloud State matches Local State ---
export const fetchRemoteData = async () => {
  try {
    const [foodsRes, catsRes, subsRes, slidersRes, settingsRes, ticketsRes, chatRes, ordersRes] = await Promise.all([
      safeQuery(supabase.from('food_items').select('*')),
      safeQuery(supabase.from('categories').select('*')),
      safeQuery(supabase.from('subcategories').select('*').order('display_order', { ascending: true })),
      safeQuery(supabase.from('featured_sliders').select('*').order('display_order', { ascending: true })),
      safeQuery(supabase.from('restaurant_settings').select('*').eq('id', 'set_resto_001').single()),
      safeQuery(supabase.from('support_tickets').select('*').order('created_at', { ascending: false })),
      safeQuery(supabase.from('support_chat_messages').select('*').order('created_at', { ascending: true })),
      safeQuery(supabase.from('orders').select('*').eq('restaurant_id', 'resto_001').order('created_at', { ascending: false }))
    ]);

    let remoteFoods = null;
    let remoteCategories = null;
    let remoteSubcategories = null;
    let remoteSliders = null;
    let remoteSettings = null;
    let remoteTickets = null;
    let remoteChat = null;
    let remoteOrders = null;

    if (foodsRes.data && foodsRes.data.length > 0) {
      remoteFoods = foodsRes.data
        .filter(item => {
          const t = String(item.title || '').trim().toLowerCase();
          return t !== 'kacchi' && String(item.id).toLowerCase() !== 'kacchi';
        })
        .map(item => {
          const fallback = initialFoods.find(f => String(f.id) === String(item.id) || f.title === item.title);
          return {
            id: String(item.id),
            title: item.title,
            tag: item.tag || (fallback ? fallback.tag : 'Best Selling'),
            rating: Number(item.rating || 5.0),
            ratingCount: Number(item.rating_count || (fallback ? fallback.ratingCount : 1)),
            category: item.category_name || (fallback ? fallback.category : 'Main Course'),
            subcategory: item.subcategory || (fallback ? fallback.subcategory : undefined),
            price: Number(item.price || 0),
            oldPrice: item.old_price ? Number(item.old_price) : (fallback ? fallback.oldPrice : undefined),
            description: item.description || (fallback ? fallback.description : ''),
            image: resolveFoodImage(item.image, fallback),
            isPng: true,
            is_published: item.is_published !== false && item.status !== 'unpublished' && item.status !== 'draft',
            status: item.status || (item.is_published === false ? 'unpublished' : 'published'),
            customizable: item.customizable || (fallback ? fallback.customizable : undefined),
            themeColor: item.theme_color || (fallback ? fallback.themeColor : '#EA580C'),
            ambientGlow: item.ambient_glow || (fallback ? fallback.ambientGlow : 'rgba(234, 88, 12, 0.45)'),
            gradient: item.gradient || (fallback ? fallback.gradient : 'from-orange-500/25 via-red-500/15 to-transparent'),
            ingredients: Array.isArray(item.ingredients) ? item.ingredients : (fallback ? fallback.ingredients : ['Fresh Ingredients', 'Chef Selected Spices'])
          };
        });
    }

    if (catsRes.data && catsRes.data.length > 0) {
      remoteCategories = Array.from(new Set(catsRes.data.map(c => c.name).filter(c => Boolean(c) && String(c).toLowerCase() !== 'all')));
    }

    if (subsRes.data && subsRes.data.length > 0) {
      remoteSubcategories = subsRes.data.map(s => ({
        id: s.id,
        category: s.category_name,
        name: s.name,
        displayOrder: s.display_order
      }));
    }

    if (slidersRes.data && slidersRes.data.length > 0) {
      remoteSliders = slidersRes.data.map(sl => {
        const fallbackFood = initialFoods.find(f => String(f.id) === String(sl.food_id) || f.title === sl.food_title);
        return {
          id: sl.id,
          badge: sl.badge,
          title: sl.title,
          subtitle: sl.subtitle,
          foodId: sl.food_id,
          foodTitle: sl.food_title,
          price: Number(sl.price || 0),
          image: resolveFoodImage(sl.image, fallbackFood),
          isPng: sl.is_png,
          isActive: sl.is_active,
          displayOrder: sl.display_order
        };
      });
    }

    if (settingsRes.data) {
      remoteSettings = {
        name: settingsRes.data.name || 'Moneky Bhai',
        tagline: settingsRes.data.tagline || 'Universal AR Digital Dining Experience',
        logo: settingsRes.data.logo || '/monkey_bhai_logo.png',
        loginId: settingsRes.data.login_id,
        email: settingsRes.data.email,
        phone: settingsRes.data.phone,
        currency: settingsRes.data.currency,
        tableCount: settingsRes.data.table_count,
        vatEnabled: settingsRes.data.vat_enabled !== false,
        vatType: settingsRes.data.vat_type || 'percentage',
        vatRate: Number(settingsRes.data.vat_rate ?? 5.0),
        serviceChargeEnabled: settingsRes.data.service_charge_enabled !== false,
        serviceChargeType: settingsRes.data.service_charge_type || 'flat',
        serviceChargeRate: Number(settingsRes.data.service_charge_rate ?? 2.0)
      };
    }

    if (ticketsRes.data && ticketsRes.data.length > 0) {
      remoteTickets = ticketsRes.data.map(t => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        message: t.message,
        lastReply: t.last_reply,
        createdAt: new Date(t.created_at).toLocaleDateString()
      }));
    }

    if (chatRes.data && chatRes.data.length > 0) {
      remoteChat = chatRes.data.map(m => ({
        id: m.id,
        sender: m.sender,
        name: m.name,
        text: m.text,
        time: m.time
      }));
    }

    if (ordersRes.data && ordersRes.data.length > 0) {
      remoteOrders = ordersRes.data.map(o => ({
        id: String(o.id),
        orderNumber: o.order_number || `DGM-${String(o.id).slice(-4)}`,
        tableNumber: o.table_number || 'Table 01',
        customerName: o.customer_name || 'Customer',
        customerPhone: o.customer_phone || '',
        diningMode: o.dining_mode || 'dine-in',
        items: Array.isArray(o.items) ? o.items : [],
        subtotal: Number(o.subtotal || 0),
        vat: Number(o.vat || 0),
        serviceFee: Number(o.service_fee || 0),
        totalAmount: Number(o.total_amount || 0),
        paymentMethod: o.payment_method || 'Cash',
        paymentStatus: o.payment_status || 'unpaid',
        orderStatus: o.order_status || 'confirmed',
        createdAt: o.created_at
      }));
    }

    return {
      remoteFoods,
      remoteCategories,
      remoteSubcategories,
      remoteSliders,
      remoteSettings,
      remoteTickets,
      remoteChat,
      remoteOrders
    };
  } catch (err) {
    console.warn('Remote fetch error (using local cache):', err);
    return {
      remoteFoods: null,
      remoteCategories: null,
      remoteSubcategories: null,
      remoteSliders: null,
      remoteSettings: null,
      remoteTickets: null,
      remoteChat: null,
      remoteOrders: null
    };
  }
};

// --- Orders ---
export const getStoredOrders = () => {
  try {
    const data = localStorage.getItem(ORDERS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading orders from storage:', e);
  }
  return initialOrders;
};

export const saveStoredOrders = (orders) => {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Error saving orders to storage:', e);
  }
};

export const addStoredOrder = (newOrder) => {
  try {
    const nowIso = new Date().toISOString();
    const normalized = {
      ...newOrder,
      createdAt: newOrder.createdAt || newOrder.created_at || nowIso,
      created_at: newOrder.created_at || newOrder.createdAt || nowIso
    };
    const existing = getStoredOrders();
    const updated = [normalized, ...existing];
    saveStoredOrders(updated);

    if (normalized.paymentStatus === 'paid') {
      const existingPayments = getStoredPayments();
      const newPayment = {
        id: `pay_${Date.now()}`,
        transactionId: `TXN-${Math.floor(10000 + Math.random() * 90000)}-DGM`,
        orderNumber: normalized.orderNumber,
        amount: normalized.totalAmount,
        paymentMethod: normalized.paymentMethod,
        status: 'completed',
        customer: `${normalized.customerName || 'Customer'} (${normalized.tableNumber})`,
        date: 'Just now'
      };
      saveStoredPayments([newPayment, ...existingPayments]);
    }

    // Async sync to Supabase with created_at explicitly passed
    supabase.from('orders').insert([{
      id: String(normalized.id || `ord_${Date.now()}`),
      restaurant_id: normalized.restaurantId || 'resto_001',
      order_number: normalized.orderNumber,
      table_number: normalized.tableNumber,
      customer_name: normalized.customerName || 'Customer',
      customer_phone: normalized.customerPhone || '',
      dining_mode: normalized.diningMode || 'dine-in',
      items: normalized.items,
      subtotal: normalized.subtotal,
      vat: normalized.vat,
      service_fee: normalized.serviceFee,
      total_amount: normalized.totalAmount,
      payment_method: normalized.paymentMethod,
      payment_status: normalized.paymentStatus,
      order_status: normalized.orderStatus,
      created_at: normalized.created_at
    }]).then(() => {}).catch(err => console.warn('Supabase order insert error:', err));

    return updated;
  } catch (e) {
    console.error('Error adding order:', e);
    return getStoredOrders();
  }
};

export const fetchLiveOrdersFromSupabase = async (restaurantId = 'resto_001') => {
  try {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }
    const { data, error } = await safeQuery(query);
    if (error || !Array.isArray(data)) {
      return getStoredOrders();
    }
    const mapped = data.map(o => ({
      id: String(o.id),
      orderNumber: o.order_number || `DGM-${String(o.id).slice(-4)}`,
      tableNumber: o.table_number || 'Table 01',
      customerName: o.customer_name || 'Customer',
      customerPhone: o.customer_phone || '',
      diningMode: o.dining_mode || 'dine-in',
      items: Array.isArray(o.items) ? o.items : [],
      subtotal: Number(o.subtotal || 0),
      vat: Number(o.vat || 0),
      serviceFee: Number(o.service_fee || 0),
      totalAmount: Number(o.total_amount || 0),
      paymentMethod: o.payment_method || 'Cash',
      paymentStatus: o.payment_status || 'unpaid',
      orderStatus: o.order_status || 'confirmed',
      createdAt: o.created_at || new Date().toISOString(),
      created_at: o.created_at || new Date().toISOString()
    }));
    saveStoredOrders(mapped);
    return mapped;
  } catch (e) {
    return getStoredOrders();
  }
};

// --- Payments ---
export const getStoredPayments = () => {
  try {
    const data = localStorage.getItem(PAYMENTS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading payments from storage:', e);
  }
  return initialPayments;
};

export const saveStoredPayments = (payments) => {
  try {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  } catch (e) {
    console.error('Error saving payments to storage:', e);
  }
};

// --- Authentication Session ---
export const getAdminAuthSession = () => {
  try {
    return localStorage.getItem(AUTH_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setAdminAuthSession = (isAuthenticated) => {
  try {
    if (isAuthenticated) {
      localStorage.setItem(AUTH_KEY, 'true');
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  } catch (e) {
    console.error('Error setting auth session:', e);
  }
};

// --- Theme Preference (Default = light) ---
export const getAdminTheme = () => {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'dark' || t === 'light') return t;
  } catch {}
  return 'light'; // Default is light mode as requested
};

export const setAdminTheme = (theme) => {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error('Error saving theme:', e);
  }
};

// ========================================================
// 1. RESTAURANT PROFILE & SETTINGS
// ========================================================
const PROFILE_KEY = 'dgm_restaurant_profile';

export const defaultRestaurantProfile = {
  name: 'Moneky Bhai',
  tagline: 'Universal AR Digital Dining Experience',
  logo: '/monkey_bhai_logo.png',
  loginId: 'admin',
  password: 'admin123',
  email: 'owner@3ddine.com',
  phone: '+880 1711-234567',
  address: 'Road 11, Block D, Banani, Dhaka',
  currency: '৳',
  tableCount: 12,
  vatEnabled: true,
  vatType: 'percentage', // 'percentage' | 'flat'
  vatRate: 5.0,
  serviceChargeEnabled: true,
  serviceChargeType: 'flat', // 'percentage' | 'flat'
  serviceChargeRate: 2.0
};

export const getRestaurantProfile = () => {
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    if (data) return { ...defaultRestaurantProfile, ...JSON.parse(data) };
  } catch (e) {
    console.error('Error reading restaurant profile:', e);
  }
  return defaultRestaurantProfile;
};

export const saveStoredRestaurantProfile = (profile) => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving stored restaurant profile:', e);
  }
};

export const saveRestaurantProfile = (profile) => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    syncSettingsToSupabase(profile);
  } catch (e) {
    console.error('Error saving restaurant profile:', e);
  }
};

let isSyncingSettings = false;
let pendingProfileSync = null;

export const syncSettingsToSupabase = async (profile) => {
  if (!profile) return;
  pendingProfileSync = profile;
  if (isSyncingSettings) return;

  isSyncingSettings = true;
  try {
    while (pendingProfileSync) {
      const current = pendingProfileSync;
      pendingProfileSync = null;

      const safeLogo = (current.logo && typeof current.logo === 'string' && current.logo.length > 200000)
        ? '/monkey_bhai_logo.png'
        : (current.logo || '/monkey_bhai_logo.png');

      // 1. Update restaurants table first to avoid foreign-key lock conflicts
      try {
        await supabase.from('restaurants').update({
          name: current.name,
          login_id: current.loginId || 'admin',
          email: current.email || '',
          tagline: current.tagline || '',
          logo: safeLogo,
          currency: current.currency || '৳',
          table_count: Number(current.tableCount || 12)
        }).eq('id', 'resto_001');
      } catch (rErr) {
        console.warn('Supabase restaurants update caught:', rErr);
      }

      // 2. Upsert restaurant_settings
      try {
        await supabase.from('restaurant_settings').upsert([{
          id: 'set_resto_001',
          restaurant_id: 'resto_001',
          name: current.name,
          tagline: current.tagline || '',
          logo: safeLogo,
          login_id: current.loginId || 'admin',
          email: current.email || '',
          phone: current.phone || '',
          currency: current.currency || '৳',
          table_count: Number(current.tableCount || 12),
          vat_enabled: current.vatEnabled !== false,
          vat_type: current.vatType || 'percentage',
          vat_rate: Number(current.vatRate ?? 5.0),
          serviceChargeEnabled: current.serviceChargeEnabled !== false,
          serviceChargeType: current.serviceChargeType || 'flat',
          serviceChargeRate: Number(current.serviceChargeRate ?? 2.0),
          updated_at: new Date().toISOString()
        }]);
      } catch (sErr) {
        console.warn('Supabase restaurant_settings upsert caught:', sErr);
      }
    }
  } catch (err) {
    console.warn('Supabase settings sync caught:', err);
  } finally {
    isSyncingSettings = false;
  }
};

// ========================================================
// 2. SUB-CATEGORIES / FOOD TYPES
// ========================================================
const SUBCATEGORIES_KEY = 'dgm_restaurant_subcategories';

export const initialSubcategories = [
  { id: 'sub_1', category: 'Main Course', name: 'Burgers', displayOrder: 1 },
  { id: 'sub_2', category: 'Main Course', name: 'Pizza', displayOrder: 2 },
  { id: 'sub_3', category: 'Main Course', name: 'Biryani & Rice', displayOrder: 3 },
  { id: 'sub_4', category: 'Appetizers', name: 'Crispy Wings & Finger Food', displayOrder: 4 },
  { id: 'sub_5', category: 'Beverages', name: 'Chilled Espresso & Cold Coffee', displayOrder: 5 },
  { id: 'sub_6', category: 'Beverages', name: 'Mocktails & Sodas', displayOrder: 6 },
  { id: 'sub_7', category: 'Dessert', name: 'Kunafa & Middle Eastern Sweets', displayOrder: 7 },
  { id: 'sub_8', category: 'Dessert', name: 'Artisan Gelato & Ice Cream', displayOrder: 8 }
];

export const getStoredSubcategories = () => {
  try {
    const data = localStorage.getItem(SUBCATEGORIES_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading subcategories:', e);
  }
  return initialSubcategories;
};

export const saveStoredSubcategories = (subcategories) => {
  try {
    localStorage.setItem(SUBCATEGORIES_KEY, JSON.stringify(subcategories));
  } catch (e) {
    console.error('Error saving subcategories:', e);
  }
};

export const syncSubcategoryToSupabase = async (sub) => {
  try {
    await supabase.from('subcategories').upsert([{
      id: String(sub.id),
      restaurant_id: 'resto_001',
      category_name: sub.category,
      name: sub.name,
      display_order: sub.displayOrder || 1
    }]);
  } catch (err) {
    console.warn('Supabase subcategory sync caught:', err);
  }
};

export const deleteSubcategoryFromSupabase = async (subId) => {
  try {
    await supabase.from('subcategories').delete().eq('id', String(subId));
  } catch (err) {
    console.warn('Supabase subcategory delete caught:', err);
  }
};

// ========================================================
// 3. FEATURED SPECIALS SLIDERS
// ========================================================
const FEATURED_SLIDERS_KEY = 'dgm_restaurant_featured_sliders';

export const initialFeaturedSliders = [
  {
    id: 'slide_1',
    badge: 'CHEF SPECIAL',
    title: 'Double Flame Cheeseburger',
    subtitle: 'Flame-grilled Angus patty with melted Wisconsin cheddar & secret sauce',
    foodId: 1,
    foodTitle: 'Double Flame Cheeseburger',
    price: 15.99,
    image: '/src/assets/burger_hd.png',
    isPng: true,
    isActive: true,
    displayOrder: 1
  },
  {
    id: 'slide_2',
    badge: 'WOOD-FIRED CRUST',
    title: 'Artisan Wood-Fired Pizza',
    subtitle: 'San Marzano tomatoes, fresh buffalo mozzarella & aromatic sweet basil',
    foodId: 2,
    foodTitle: 'Artisan Wood-Fired Pizza',
    price: 18.50,
    image: '/src/assets/pizza_hd.png',
    isPng: true,
    isActive: true,
    displayOrder: 2
  },
  {
    id: 'slide_3',
    badge: 'SWEET DELIGHT',
    title: 'Royal Pistachio Kunafa',
    subtitle: 'Golden kataifi pastry soaked in rose syrup & crushed Turkish pistachios',
    foodId: 5,
    foodTitle: 'Royal Pistachio Kunafa',
    price: 12.50,
    image: '/src/assets/Food.gif',
    isPng: false,
    isActive: true,
    displayOrder: 3
  }
];

export const getStoredFeaturedSliders = () => {
  try {
    const data = localStorage.getItem(FEATURED_SLIDERS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading featured sliders:', e);
  }
  return initialFeaturedSliders;
};

export const saveStoredFeaturedSliders = (sliders) => {
  try {
    localStorage.setItem(FEATURED_SLIDERS_KEY, JSON.stringify(sliders));
  } catch (e) {
    console.error('Error saving featured sliders:', e);
  }
};

export const syncSliderToSupabase = async (slider) => {
  try {
    let sliderImg = slider.image || null;
    if (typeof sliderImg === 'string' && sliderImg.startsWith('data:') && sliderImg.length > 250000) {
      const fallback = initialFoods.find(f => String(f.id) === String(slider.foodId) || f.title === slider.foodTitle || f.title === slider.title);
      if (fallback?.image && !fallback.image.startsWith('data:')) {
        sliderImg = `/src/assets/${(slider.foodTitle || slider.title || 'food').toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      }
    }

    const { data, error } = await supabase.from('featured_sliders').upsert([{
      id: String(slider.id),
      restaurant_id: 'resto_001',
      badge: slider.badge,
      title: slider.title,
      subtitle: slider.subtitle || null,
      food_id: String(slider.foodId || slider.id),
      food_title: slider.foodTitle || slider.title,
      price: Number(slider.price || 0),
      image: sliderImg,
      is_png: slider.isPng !== false,
      is_active: slider.isActive !== false,
      display_order: Number(slider.displayOrder || Date.now())
    }]);
    if (error) {
      console.error('Supabase slider sync error:', error);
    } else {
      console.log('Supabase slider sync success:', slider.id);
    }
  } catch (err) {
    console.warn('Supabase slider sync caught:', err);
  }
};

export const deleteSliderFromSupabase = async (sliderId) => {
  try {
    await supabase.from('featured_sliders').delete().eq('id', String(sliderId));
  } catch (err) {
    console.warn('Supabase slider delete caught:', err);
  }
};

// ========================================================
// 4. SUPPORT TICKETS & LIVE CHAT
// ========================================================
const TICKETS_KEY = 'dgm_restaurant_tickets';
const CHAT_KEY = 'dgm_restaurant_chat_messages';

export const initialTickets = [
  {
    id: 'TCK-8421',
    subject: 'Table 04 3D holographic rotation response inquiry',
    category: 'Technical',
    priority: 'Medium',
    status: 'Resolved',
    createdAt: 'Yesterday, 3:30 PM',
    lastReply: 'Technical team verified touch-manipulation sensitivity. All normal.'
  },
  {
    id: 'TCK-8422',
    subject: 'How to upload custom transparent PNG cutout for new dish',
    category: 'Menu Setup',
    priority: 'Low',
    status: 'In Progress',
    createdAt: 'Today, 11:20 AM',
    lastReply: 'Our specialist shared the 1000x1000 PNG transparent cutout guidelines.'
  }
];

export const getStoredTickets = () => {
  try {
    const data = localStorage.getItem(TICKETS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading tickets:', e);
  }
  return initialTickets;
};

export const saveStoredTickets = (tickets) => {
  try {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  } catch (e) {
    console.error('Error saving tickets:', e);
  }
};

export const syncTicketToSupabase = async (ticket) => {
  try {
    await supabase.from('support_tickets').upsert([{
      id: String(ticket.id),
      restaurant_id: 'resto_001',
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status || 'Open',
      message: ticket.message || '',
      last_reply: ticket.lastReply || null
    }]);
  } catch (err) {
    console.warn('Supabase ticket sync caught:', err);
  }
};

export const initialChatMessages = [
  {
    id: 'msg_1',
    sender: 'agent',
    name: 'Digital Menu Support',
    text: 'Hello! Welcome to 24/7 Digital Menu Partner Support. How can we assist your restaurant today?',
    time: '10:00 AM'
  },
  {
    id: 'msg_2',
    sender: 'owner',
    name: 'Restaurant Owner',
    text: 'Hello! I am configuring our Featured Specials slider and adding our new subcategories.',
    time: '10:02 AM'
  },
  {
    id: 'msg_3',
    sender: 'agent',
    name: 'Digital Menu Support',
    text: 'Great! You can add and publish Featured Sliders directly from the "Featured Sliders" tab. The live preview will show how it appears on your 3D digital menu.',
    time: '10:03 AM'
  }
];

export const getStoredChatMessages = () => {
  try {
    const data = localStorage.getItem(CHAT_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading chat messages:', e);
  }
  return initialChatMessages;
};

export const saveStoredChatMessages = (messages) => {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error('Error saving chat messages:', e);
  }
};

export const syncChatMessageToSupabase = async (msg) => {
  try {
    await supabase.from('support_chat_messages').upsert([{
      id: String(msg.id),
      restaurant_id: 'resto_001',
      sender: msg.sender,
      name: msg.name,
      text: msg.text,
      time: msg.time
    }]);
  } catch (err) {
    console.warn('Supabase chat sync caught:', err);
  }
};

// ========================================================
// 5. SUPER ADMIN CONFIGURATION (Feature Gating)
// ========================================================
const SUPER_ADMIN_CONFIG_KEY = 'dgm_super_admin_config';

export const defaultSuperAdminConfig = {
  // FALSE BY DEFAULT as requested!
  // Only enabled by Super Admin for subscribed restaurants
  enableOrderManagement: false,
  enablePayments: false,
  enableOrderButton: false,
  enableCartPage: false
};

export const getSuperAdminConfig = () => {
  try {
    const data = localStorage.getItem(SUPER_ADMIN_CONFIG_KEY);
    if (data) return { ...defaultSuperAdminConfig, ...JSON.parse(data) };
  } catch (e) {
    console.error('Error reading super admin config:', e);
  }
  return defaultSuperAdminConfig;
};

export const saveSuperAdminConfig = (cfg) => {
  try {
    localStorage.setItem(SUPER_ADMIN_CONFIG_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error('Error saving super admin config:', e);
  }
};
