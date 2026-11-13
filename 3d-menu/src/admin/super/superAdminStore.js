// Real Multi-Tenant Super Admin Data Store with Supabase Sync & Persistence
import { supabase } from '../../lib/supabaseClient';
import { isSameCalendarDay } from '../../data/menuStore';

const SUPER_ADMIN_STORAGE_PREFIX = 'dgm_superadmin_live_v2_';

// Initial fallback restaurants (Matches live Supabase data: 3 genuine tenant accounts)
export const initialSuperAdminRestaurants = [
  {
    id: 'resto_001',
    displayId: '#001',
    display_id: '#001',
    name: 'Monkey Bhai',
    slug: '3d-dine',
    menuSlug: '3d-dine',
    login_id: 'monkeybhai',
    password: 'password123',
    phone: '+8801700000000',
    ownerName: 'Arif Hossain',
    owner_name: 'Arif Hossain',
    ownerPhone: '+8801700000000',
    owner_phone: '+8801700000000',
    type: 'fine',
    restaurant_type: 'fine',
    location: 'Dhaka, Banani',
    address: 'Dhaka, Banani',
    plan: 'Pro Holographic',
    tableCount: 12,
    table_count: 12,
    status: 'active',
    theme: 'Warm Amber Glass',
    created_at: '2026-10-31T19:25:00Z',
    joinedAt: '2026-10-31T19:25:00Z',
    currency: '৳',
    logo: '/monkey_bhai_logo.png',
    avatar: 'MB',
    settlementStatus: 'settled',
    settlement_status: 'settled',
    email: 'owner@3ddine.com',
    features: {
      enable3D: true,
      enableOrderManagement: true,
      enablePayments: true,
      enableCartPage: true,
      enableKitchenNotes: true,
      enablePortions: true,
      enableAddons: true
    }
  },
  {
    id: 'resto_002',
    displayId: '#002',
    display_id: '#002',
    name: 'Hungry Bite Café',
    slug: 'hungry-bite',
    menuSlug: 'hungry-bite',
    login_id: 'hungrybite',
    password: 'password123',
    phone: '+8801712345678',
    ownerName: 'Tania Rahman',
    owner_name: 'Tania Rahman',
    ownerPhone: '+8801712345678',
    owner_phone: '+8801712345678',
    type: 'non-fine',
    restaurant_type: 'non-fine',
    location: 'Dhaka, Uttara',
    address: 'Dhaka, Uttara',
    plan: 'Starter',
    tableCount: 8,
    table_count: 8,
    status: 'active',
    theme: 'Classic Clean',
    created_at: '2026-11-04T12:00:00Z',
    joinedAt: '2026-11-04T12:00:00Z',
    currency: '৳',
    logo: '/monkey_bhai_logo.png',
    avatar: 'HB',
    settlementStatus: 'pending',
    settlement_status: 'pending',
    email: 'contact@hungrybite.com',
    features: {
      enable3D: false,
      enableOrderManagement: true,
      enablePayments: true,
      enableCartPage: true,
      enableKitchenNotes: false,
      enablePortions: true,
      enableAddons: true
    }
  },
  {
    id: 'resto_003',
    displayId: '#003',
    display_id: '#003',
    name: 'Spice Lounge',
    slug: 'spice-lounge',
    menuSlug: 'spice-lounge',
    login_id: 'spicelounge',
    password: 'password123',
    phone: '+8801987654321',
    ownerName: 'Imran Kabir',
    owner_name: 'Imran Kabir',
    ownerPhone: '+8801987654321',
    owner_phone: '+8801987654321',
    type: 'fine',
    restaurant_type: 'fine',
    location: 'Chattogram, GEC',
    address: 'Chattogram, GEC',
    plan: 'Business',
    tableCount: 20,
    table_count: 20,
    status: 'active',
    theme: 'Warm Amber Glass',
    created_at: '2026-11-01T10:00:00Z',
    joinedAt: '2026-11-01T10:00:00Z',
    currency: '৳',
    logo: '/monkey_bhai_logo.png',
    avatar: 'SL',
    settlementStatus: 'settled',
    settlement_status: 'settled',
    email: 'info@spicelounge.com',
    features: {
      enable3D: true,
      enableOrderManagement: true,
      enablePayments: true,
      enableCartPage: true,
      enableKitchenNotes: true,
      enablePortions: true,
      enableAddons: true
    }
  }
];

// 1. Fetch live restaurants from Supabase
export const fetchLiveRestaurantsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('display_id', { ascending: true, nullsFirst: false });

    if (!error && data && data.length > 0) {
      const clean = data.map(remote => ({
        id: String(remote.id),
        displayId: remote.display_id || (remote.id.startsWith('resto_') ? `#${remote.id.slice(6)}` : remote.id),
        display_id: remote.display_id || (remote.id.startsWith('resto_') ? `#${remote.id.slice(6)}` : remote.id),
        name: remote.name || 'Restaurant',
        slug: remote.slug || 'menu',
        menuSlug: remote.slug || 'menu',
        login_id: remote.login_id || 'admin',
        password: remote.password || 'resto123',
        phone: remote.phone || remote.owner_phone || '',
        ownerName: remote.owner_name || 'Owner',
        owner_name: remote.owner_name || 'Owner',
        ownerPhone: remote.owner_phone || remote.phone || '',
        owner_phone: remote.owner_phone || remote.phone || '',
        type: remote.restaurant_type || 'fine',
        restaurant_type: remote.restaurant_type || 'fine',
        location: remote.address || 'Dhaka, Bangladesh',
        address: remote.address || 'Dhaka, Bangladesh',
        plan: remote.plan || 'Starter',
        tableCount: Number(remote.table_count || 12),
        table_count: Number(remote.table_count || 12),
        settlementStatus: remote.settlement_status || 'settled',
        settlement_status: remote.settlement_status || 'settled',
        joinedAt: remote.created_at || new Date().toISOString(),
        created_at: remote.created_at || new Date().toISOString(),
        status: remote.status || 'active',
        avatar: remote.avatar || remote.name?.slice(0, 2)?.toUpperCase() || '🍽️',
        email: remote.email || '',
        theme: remote.theme || 'Warm Amber Glass',
        currency: remote.currency || '৳',
        logo: remote.logo || '/monkey_bhai_logo.png',
        features: remote.features || {
          enable3D: true,
          enableOrderManagement: true,
          enablePayments: true,
          enableCartPage: true,
          enableKitchenNotes: true,
          enablePortions: true,
          enableAddons: true
        }
      }));
      saveSuperAdminRestaurants(clean);
      return clean;
    }
  } catch (err) {
    console.warn('Supabase fetch restaurants caught:', err);
  }
  return getSuperAdminRestaurants();
};

// 2. Fetch live customer orders from Supabase
export const fetchLiveOrdersFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map(o => ({
        id: String(o.id),
        orderNumber: o.order_number || `#ORD-${String(o.id).slice(-4)}`,
        restaurantId: o.restaurant_id || 'resto_001',
        tableNumber: o.table_number || 'Table 04',
        customerName: o.customer_name || 'Customer',
        customerPhone: o.customer_phone || '',
        diningMode: o.dining_mode || 'dine-in',
        items: Array.isArray(o.items) ? o.items : [],
        subtotal: Number(o.subtotal || 0),
        vat: Number(o.vat || 0),
        serviceFee: Number(o.service_fee || 0),
        totalAmount: Number(o.total_amount || 0),
        paymentMethod: o.payment_method || 'Cash',
        paymentStatus: o.payment_status || 'paid',
        orderStatus: o.order_status || 'confirmed',
        createdAt: o.created_at || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn('Supabase fetch orders caught:', err);
  }
  return [];
};

// 2.1 Fetch live menu scans across all restaurants from Supabase
export const fetchLiveScansFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('menu_scans')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const totalScans = data.length;
      const todayScans = data.filter(s => isSameCalendarDay(s.scanned_at || s.created_at)).length;
      return { totalScans, todayScans, rawScans: data };
    }
  } catch (err) {
    console.warn('Supabase fetch scans caught:', err);
  }
  return { totalScans: 0, todayScans: 0, rawScans: [] };
};

// 3. Fetch live support tickets from Supabase
export const fetchLiveTicketsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map(t => ({
        id: String(t.id),
        restaurantId: t.restaurant_id || 'resto_001',
        subject: t.subject || 'Support Inquiry',
        category: t.category || 'General',
        priority: t.priority || 'Medium',
        status: t.status || 'Open',
        message: t.message || '',
        lastReply: t.last_reply || '',
        createdAt: t.created_at || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn('Supabase fetch tickets caught:', err);
  }
  return [];
};

// 4. Fetch live food catalog & categories from Supabase
export const fetchLiveCatalogFromSupabase = async () => {
  try {
    const [foodsRes, catsRes] = await Promise.all([
      supabase.from('food_items').select('*'),
      supabase.from('categories').select('*').order('display_order', { ascending: true })
    ]);

    return {
      foods: foodsRes.data || [],
      categories: catsRes.data || []
    };
  } catch (err) {
    console.warn('Supabase fetch catalog caught:', err);
    return { foods: [], categories: [] };
  }
};

// 5. Fetch live platform settings from Supabase
export const fetchLivePlatformSettingsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 'global_config')
      .single();

    if (!error && data) {
      const parsed = {
        feeRules: {
          platformFeePerBill: Number(data.fee_per_bill ?? 5.0),
          feeType: 'flat',
          minEligibleBillAmount: Number(data.min_eligible_bill ?? 50.0),
          autoDeductSettlement: Boolean(data.auto_deduct_settlement !== false),
          billingCycle: data.billing_cycle || 'weekly',
          currencySymbol: data.currency_symbol || '৳'
        },
        systemBranding: {
          platformName: data.platform_name || 'Digital Food Menu',
          tagline: 'Super Admin Master SaaS Panel',
          version: 'v2.0.0-live'
        }
      };
      savePlatformSettings(parsed);
      return parsed;
    }
  } catch (err) {
    console.warn('Supabase fetch platform settings caught:', err);
  }
  return getPlatformSettings();
};

// 6. Save platform settings live to Supabase
export const updatePlatformSettingsInSupabase = async (settings) => {
  try {
    savePlatformSettings(settings);
    const { error } = await supabase.from('platform_settings').upsert([{
      id: 'global_config',
      fee_per_bill: Number(settings?.feeRules?.platformFeePerBill ?? 5.0),
      min_eligible_bill: Number(settings?.feeRules?.minEligibleBillAmount ?? 50.0),
      auto_deduct_settlement: Boolean(settings?.feeRules?.autoDeductSettlement !== false),
      billing_cycle: settings?.feeRules?.billingCycle || 'weekly',
      currency_symbol: settings?.feeRules?.currencySymbol || '৳',
      platform_name: settings?.systemBranding?.platformName || 'Digital Food Menu',
      updated_at: new Date().toISOString()
    }]);
    if (error) console.warn('Supabase update platform settings warning:', error);
  } catch (err) {
    console.warn('Supabase update platform settings caught:', err);
  }
};

// 7. Sync new restaurant to Supabase (and initialize restaurant_settings)
export const syncNewRestaurantToSupabase = async (resto) => {
  try {
    const restoId = String(resto.id);
    const { error } = await supabase.from('restaurants').upsert([{
      id: restoId,
      display_id: resto.display_id || resto.displayId || `#${restoId.slice(-3)}`,
      name: resto.name,
      slug: resto.slug,
      login_id: resto.login_id || `admin_${resto.slug}`,
      password: resto.password || 'password123',
      phone: resto.phone || resto.ownerPhone || '',
      owner_name: resto.owner_name || resto.ownerName || 'Owner',
      owner_phone: resto.owner_phone || resto.ownerPhone || resto.phone || '',
      restaurant_type: resto.restaurant_type || resto.type || 'fine',
      settlement_status: resto.settlement_status || resto.settlementStatus || 'settled',
      email: resto.email || '',
      address: resto.address || resto.location || 'Dhaka, Bangladesh',
      table_count: Number(resto.table_count || resto.tableCount || 12),
      status: resto.status || 'active',
      plan: resto.plan || 'Starter',
      theme: resto.theme || 'Warm Amber Glass',
      currency: resto.currency || '৳',
      avatar: resto.avatar || resto.name?.slice(0, 2)?.toUpperCase() || '🍽️',
      logo: resto.logo || '/monkey_bhai_logo.png',
      features: resto.features || {
        enable3D: true,
        enableOrderManagement: true,
        enablePayments: true,
        enableCartPage: true,
        enableKitchenNotes: true,
        enablePortions: true,
        enableAddons: true
      },
      created_at: resto.created_at || resto.joinedAt || new Date().toISOString()
    }]);

    if (!error) {
      // Also upsert initial restaurant_settings
      await supabase.from('restaurant_settings').upsert([{
        id: `set_${restoId}`,
        restaurant_id: restoId,
        name: resto.name,
        tagline: 'Universal AR Digital Dining Experience',
        logo: resto.logo || '/monkey_bhai_logo.png',
        login_id: resto.login_id || `admin_${resto.slug}`,
        email: resto.email || '',
        phone: resto.phone || resto.ownerPhone || '',
        currency: resto.currency || '৳',
        table_count: Number(resto.table_count || resto.tableCount || 12),
        vat_enabled: true,
        vat_type: 'percentage',
        vat_rate: 5.0,
        service_charge_enabled: true,
        service_charge_type: 'flat',
        service_charge_rate: 2.0,
        updated_at: new Date().toISOString()
      }]);
    } else {
      console.warn('Supabase sync restaurant warning:', error);
    }
  } catch (err) {
    console.warn('Supabase sync restaurant caught:', err);
  }
};

// 7.1 Update restaurant details in Supabase
export const updateRestaurantInSupabase = async (id, updates = {}) => {
  try {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.ownerName !== undefined || updates.owner_name !== undefined) {
      payload.owner_name = updates.ownerName || updates.owner_name;
    }
    if (updates.ownerPhone !== undefined || updates.owner_phone !== undefined) {
      payload.owner_phone = updates.ownerPhone || updates.owner_phone;
      payload.phone = updates.ownerPhone || updates.owner_phone;
    }
    if (updates.type !== undefined || updates.restaurant_type !== undefined) {
      payload.restaurant_type = updates.type || updates.restaurant_type;
    }
    if (updates.settlementStatus !== undefined || updates.settlement_status !== undefined) {
      payload.settlement_status = updates.settlementStatus || updates.settlement_status;
    }
    if (updates.location !== undefined || updates.address !== undefined) {
      payload.address = updates.location || updates.address;
    }
    if (updates.plan !== undefined) payload.plan = updates.plan;
    if (updates.tableCount !== undefined || updates.table_count !== undefined) {
      payload.table_count = Number(updates.tableCount || updates.table_count);
    }
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.avatar !== undefined) payload.avatar = updates.avatar;

    const { error } = await supabase.from('restaurants').update(payload).eq('id', String(id));
    if (error) console.warn('Supabase update restaurant error:', error);

    // If name or phone was updated, keep restaurant_settings in sync
    if (updates.name || updates.ownerPhone || updates.phone) {
      const setPayload = {};
      if (updates.name) setPayload.name = updates.name;
      if (updates.ownerPhone || updates.phone) setPayload.phone = updates.ownerPhone || updates.phone;
      await supabase.from('restaurant_settings').update(setPayload).eq('restaurant_id', String(id));
    }
  } catch (err) {
    console.warn('Supabase update restaurant caught:', err);
  }
};

// 8. Update restaurant status in Supabase
export const updateRestaurantStatusInSupabase = async (id, status) => {
  try {
    await supabase.from('restaurants').update({ status }).eq('id', String(id));
  } catch (err) {
    console.warn('Supabase update status caught:', err);
  }
};

// 9. Delete restaurant from Supabase
export const deleteRestaurantFromSupabase = async (id) => {
  try {
    await supabase.from('restaurant_settings').delete().eq('restaurant_id', String(id));
    await supabase.from('restaurants').delete().eq('id', String(id));
  } catch (err) {
    console.warn('Supabase delete restaurant caught:', err);
  }
};

// 10. Update support ticket status and reply in Supabase
export const updateTicketInSupabase = async (ticketId, updates = {}) => {
  try {
    const payload = {};
    if (updates.status) payload.status = updates.status;
    if (updates.lastReply) payload.last_reply = updates.lastReply;

    await supabase.from('support_tickets').update(payload).eq('id', String(ticketId));
  } catch (err) {
    console.warn('Supabase update ticket caught:', err);
  }
};

// 11. Fetch live cleared settlements from Supabase
export const fetchLiveSettlementsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .order('cleared_at', { ascending: false });

    if (!error && data) {
      return data.map(s => ({
        id: String(s.id),
        restaurantId: s.restaurant_id,
        amount: Number(s.amount || 0),
        feePerBill: Number(s.fee_per_bill || 5.0),
        ordersCount: Number(s.orders_count || 0),
        paymentMethod: s.payment_method || 'bKash/Bank Transfer',
        transactionRef: s.transaction_ref || '',
        status: s.status || 'cleared',
        periodStart: s.period_start,
        periodEnd: s.period_end,
        notes: s.notes || '',
        clearedAt: s.cleared_at || s.created_at || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn('Supabase fetch settlements caught:', err);
  }
  return [];
};

// 12. Record a verified cleared settlement in Supabase
export const recordSettlementInSupabase = async (settlement) => {
  try {
    const payload = {
      id: settlement.id || `stl_${Date.now()}`,
      restaurant_id: settlement.restaurantId,
      amount: Number(settlement.amount || 0),
      fee_per_bill: Number(settlement.feePerBill || 5.0),
      orders_count: Number(settlement.ordersCount || 0),
      payment_method: settlement.paymentMethod || 'bKash/Bank Transfer',
      transaction_ref: settlement.transactionRef || '',
      status: 'cleared',
      period_start: settlement.periodStart || null,
      period_end: settlement.periodEnd || null,
      notes: settlement.notes || 'Settlement verified & confirmed by Super Admin',
      cleared_at: settlement.clearedAt || new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    const { error } = await supabase.from('settlements').insert([payload]);
    if (error) console.warn('Supabase record settlement error:', error);
    return payload;
  } catch (err) {
    console.warn('Supabase record settlement caught:', err);
    return null;
  }
};

// --- Local Storage Helpers ---
export const getSuperAdminRestaurants = () => {
  try {
    const raw = localStorage.getItem(`${SUPER_ADMIN_STORAGE_PREFIX}restaurants`);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Auto-purge any stale mock cache of 280+ demo restaurants
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.length <= 15) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed reading super admin restaurants:', e);
  }
  return initialSuperAdminRestaurants;
};

export const saveSuperAdminRestaurants = (restaurants) => {
  try {
    localStorage.setItem(`${SUPER_ADMIN_STORAGE_PREFIX}restaurants`, JSON.stringify(restaurants));
  } catch (e) {
    console.error('Failed saving super admin restaurants:', e);
  }
};

// Platform Global Settings
export const initialPlatformSettings = {
  feeRules: {
    platformFeePerBill: 5.0, // ৳5 Fee
    feeType: 'flat',
    minEligibleBillAmount: 50.0,
    autoDeductSettlement: true,
    billingCycle: 'weekly',
    currencySymbol: '৳'
  },
  systemBranding: {
    platformName: 'Digital Food Menu',
    tagline: 'Super Admin Master SaaS Panel',
    version: 'v2.0.0-live'
  }
};

export const getPlatformSettings = () => {
  try {
    const raw = localStorage.getItem(`${SUPER_ADMIN_STORAGE_PREFIX}settings`);
    if (raw) return { ...initialPlatformSettings, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed reading platform settings:', e);
  }
  return initialPlatformSettings;
};

export const savePlatformSettings = (settings) => {
  try {
    localStorage.setItem(`${SUPER_ADMIN_STORAGE_PREFIX}settings`, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed saving platform settings:', e);
  }
};

// Super Admin Session Storage
const SUPER_ADMIN_AUTH_KEY = 'dgm_super_admin_auth_session';

export const getSuperAdminAuthSession = () => {
  try {
    return localStorage.getItem(SUPER_ADMIN_AUTH_KEY) === 'true';
  } catch (e) {
    return false;
  }
};

export const setSuperAdminAuthSession = (isAuthenticated) => {
  try {
    if (isAuthenticated) {
      localStorage.setItem(SUPER_ADMIN_AUTH_KEY, 'true');
    } else {
      localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
    }
  } catch (e) {
    console.error('Failed saving super admin auth session:', e);
  }
};
