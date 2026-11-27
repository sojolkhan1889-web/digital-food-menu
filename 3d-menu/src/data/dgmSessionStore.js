import { supabase } from '../lib/supabaseClient.js';
import { recordMenuScan } from './menuStore.js';

export const NON_FINE_TRACKING_VERSION = 'v1_non_fine_12h';
const NON_FINE_LOCK_MS = 12 * 60 * 60 * 1000; // 12 hours per device
const NON_FINE_LOCK_STORAGE_PREFIX = 'dgm_nonfine_12h_lock_';

export const isSameCalendarDay = (dateInput) => {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const VISITOR_TOKEN_KEY = 'dgm_visitor_token';

/**
 * Get or create a persistent anonymous visitor token for this browser device.
 * Used for 5-hour returning visitor protection across session expires.
 */
export const getOrCreateVisitorToken = () => {
  if (typeof window === 'undefined') return 'vst_server_placeholder';
  try {
    let token = localStorage.getItem(VISITOR_TOKEN_KEY);
    if (!token) {
      token = `vst_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem(VISITOR_TOKEN_KEY, token);
    }
    return token;
  } catch (e) {
    return `vst_fallback_${Date.now()}`;
  }
};

/**
 * Handle a table QR visit for fine-dine restaurant.
 * Atomically checks/creates a 90m session, applies 5h visitor protection,
 * logs DGM order & ৳5 billing ledger row.
 */
export const handleFineDineTableVisit = async ({
  restaurantId,
  tableId,
  tableNo,
  tableNumber
}) => {
  try {
    const visitorToken = getOrCreateVisitorToken();
    let cleanTableNo = Number(tableNo);
    if (!Number.isSafeInteger(cleanTableNo) || cleanTableNo < 1 || cleanTableNo > 2147483647) {
      const match = String(tableNumber || '').match(/Table\s*(\d{1,5})/i) || String(tableNumber || '').match(/\b(\d{1,5})\b/);
      cleanTableNo = match ? parseInt(match[1], 10) : 1;
    }
    const cleanTableId = String(tableId || `tbl_${cleanTableNo}`);
    const cleanTableNumber = tableNumber && !/Table\s*\d{6,}/.test(tableNumber)
      ? tableNumber
      : `Table ${String(cleanTableNo).padStart(2, '0')}`;

    const { data, error } = await supabase.rpc('handle_fine_dine_table_visit', {
      p_restaurant_id: restaurantId,
      p_table_id: cleanTableId,
      p_table_no: cleanTableNo,
      p_table_number: cleanTableNumber,
      p_visitor_token: visitorToken
    });

    if (error) {
      console.error('Error invoking handle_fine_dine_table_visit RPC:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      ...data,
      visitorToken
    };
  } catch (err) {
    console.error('Exception in handleFineDineTableVisit:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Confirm a fine-dine session when a customer clicks "Yes, I ordered".
 * Atomically sets confirmed_at = now() and suppresses modal for all devices at this table.
 */
export const confirmFineDineTableSession = async (sessionId) => {
  if (!sessionId) return { success: false, reason: 'no_session_id' };
  try {
    const visitorToken = getOrCreateVisitorToken();
    const { data, error } = await supabase.rpc('confirm_fine_dine_table_session', {
      p_session_id: sessionId,
      p_visitor_token: visitorToken
    });

    if (error) {
      console.error('Error in confirm_fine_dine_table_session RPC:', error);
      return { success: false, error: error.message };
    }

    return data || { success: true };
  } catch (err) {
    console.error('Exception in confirmFineDineTableSession:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Handle a single Customer QR visit for Non-Fine Dine restaurants.
 * Strictly isolated from Fine Dine table logic:
 * - Uses persistent customer device token (first_visitor_id) + tracking_version = 'v1_non_fine_12h'.
 * - Locks for 12 hours per device per restaurant.
 * - First visit (or after 12h expiry): creates 1 session (12h), 1 scan, 1 DGM order, 1 ৳5 billing ledger row.
 * - Subsequent visits within 12h on same device: reuses active session, 0 new scans/orders, suppresses popup if confirmed.
 */
export const handleNonFineDineDeviceVisit = async ({ restaurantId }) => {
  if (!restaurantId) return { success: false, error: 'Missing restaurantId' };

  const deviceId = getOrCreateVisitorToken();
  const lockKey = `${NON_FINE_LOCK_STORAGE_PREFIX}${restaurantId}_${deviceId}`;
  const now = new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();

  // 1. Check Supabase for an active 12h Non-Fine Dine session for THIS device & THIS restaurant
  try {
    const { data: activeRows, error: findErr } = await supabase
      .from('dgm_table_sessions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('tracking_version', NON_FINE_TRACKING_VERSION)
      .eq('first_visitor_id', deviceId)
      .gt('expires_at', nowIso)
      .order('started_at', { ascending: false })
      .limit(1);

    if (!findErr && Array.isArray(activeRows) && activeRows.length > 0) {
      const existing = activeRows[0];
      try {
        localStorage.setItem(lockKey, JSON.stringify({
          session_id: existing.id,
          session_code: existing.session_code,
          expires_at: existing.expires_at,
          is_confirmed: Boolean(existing.confirmed_at)
        }));
      } catch {}

      return {
        success: true,
        applied: true,
        is_new_session: false,
        session_id: existing.id,
        session_code: existing.session_code,
        started_at: existing.started_at,
        expires_at: existing.expires_at,
        is_confirmed: Boolean(existing.confirmed_at),
        visitorToken: deviceId
      };
    }
  } catch (err) {
    console.warn('Non-Fine Dine active session check warning:', err);
  }

  // 2. Local fast-lock guard against React StrictMode / simultaneous double-mount
  try {
    const cachedRaw = localStorage.getItem(lockKey);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (cached?.expires_at && new Date(cached.expires_at).getTime() > nowMs) {
        return {
          success: true,
          applied: true,
          is_new_session: false,
          session_id: cached.session_id,
          session_code: cached.session_code,
          expires_at: cached.expires_at,
          is_confirmed: Boolean(cached.is_confirmed),
          visitorToken: deviceId
        };
      }
    }
  } catch {}

  // 3. Start a new 12-hour device session + 1 scan + 1 billing ledger + 1 DGM order
  const expiresAtIso = new Date(nowMs + NON_FINE_LOCK_MS).toISOString();
  const codeNum = 1000 + Math.floor(Math.random() * 9000);
  const sessionCode = `#S-${codeNum}`;
  const dgmOrderNum = `DGM-${codeNum}`;
  const sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(16).padStart(8, '0')}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`;

  // Reserve local lock immediately to prevent concurrent mount duplicate creation
  try {
    localStorage.setItem(lockKey, JSON.stringify({
      session_id: sessionId,
      session_code: sessionCode,
      expires_at: expiresAtIso,
      is_confirmed: false
    }));
  } catch {}

  try {
    const { error: sessErr } = await supabase.from('dgm_table_sessions').insert([{
      id: sessionId,
      restaurant_id: restaurantId,
      table_id: 'non_fine_qr',
      table_no: 1,
      table_number: 'Customer QR',
      session_code: sessionCode,
      started_at: nowIso,
      expires_at: expiresAtIso,
      first_visitor_id: deviceId,
      status: 'active',
      tracking_version: NON_FINE_TRACKING_VERSION,
      created_at: nowIso
    }]);

    if (sessErr) {
      console.warn('Non-Fine Dine session insert error:', sessErr.message);
      try { localStorage.removeItem(lockKey); } catch {}
      return { success: false, error: sessErr.message };
    }

    // Record 1 Scan, 1 Billing Ledger row (৳5), and 1 DGM Order in parallel
    await Promise.all([
      recordMenuScan(restaurantId, 'Customer QR'),
      supabase.from('dgm_billing_ledger').insert([{
        restaurant_id: restaurantId,
        table_id: 'non_fine_qr',
        session_id: sessionId,
        session_code: sessionCode,
        amount: 5,
        currency: '৳',
        billing_status: 'pending',
        created_at: nowIso
      }]),
      supabase.from('orders').insert([{
        id: `ord_nf_${Date.now()}_${codeNum}`,
        restaurant_id: restaurantId,
        order_number: dgmOrderNum,
        table_number: 'Customer QR',
        customer_name: 'Walk-in QR Customer',
        dining_mode: 'dine-in',
        items: [],
        subtotal: 0,
        vat: 0,
        service_fee: 0,
        total_amount: 0,
        payment_method: 'Cash',
        payment_status: 'paid',
        order_status: 'confirmed',
        created_at: nowIso
      }])
    ]);

    return {
      success: true,
      applied: true,
      is_new_session: true,
      session_id: sessionId,
      session_code: sessionCode,
      started_at: nowIso,
      expires_at: expiresAtIso,
      is_confirmed: false,
      visitorToken: deviceId
    };
  } catch (err) {
    console.warn('Exception in handleNonFineDineDeviceVisit:', err);
    return { success: false, error: err?.message || 'Non-fine dine visit error' };
  }
};

/**
 * Confirm order inside a Non-Fine Dine 12-hour device session.
 * Suppresses Order Confirmation popup for the remainder of the 12h lock on this device.
 */
export const confirmNonFineDineSession = async (sessionId, restaurantId) => {
  if (!sessionId) return { success: false, reason: 'no_session_id' };
  const deviceId = getOrCreateVisitorToken();
  const nowIso = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('dgm_table_sessions')
      .update({
        confirmed_at: nowIso,
        confirmed_by_visitor_id: deviceId
      })
      .eq('id', sessionId)
      .eq('tracking_version', NON_FINE_TRACKING_VERSION);

    if (restaurantId) {
      const lockKey = `${NON_FINE_LOCK_STORAGE_PREFIX}${restaurantId}_${deviceId}`;
      try {
        const raw = localStorage.getItem(lockKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem(lockKey, JSON.stringify({ ...parsed, is_confirmed: true }));
        }
      } catch {}
    }

    if (error) {
      console.warn('confirmNonFineDineSession error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, confirmed_at: nowIso };
  } catch (err) {
    console.warn('Exception in confirmNonFineDineSession:', err);
    return { success: false, error: err?.message };
  }
};

/**
 * Sync the real Order List Grand Total to the session's DGM order in Supabase `orders`.
 * Called when customer taps "Yes, I Ordered" or "Confirm Your Order" with items in their list.
 * Ensures Gross Order Volume & Order Amount reflect actual Grand Total (instead of 0 or hardcoded 150).
 */
export const updateDgmSessionOrderAmount = async ({
  sessionId,
  sessionCode,
  restaurantId,
  tableNumber = 'Table 01',
  subtotal = 0,
  vat = 0,
  serviceFee = 0,
  grandTotal = 0,
  items = [],
  paymentMethod = 'Cash / Waiter',
  orderStatus = 'confirmed'
}) => {
  if (!restaurantId) return { success: false, reason: 'missing_restaurant_id' };
  const digits = String(sessionCode || '').replace(/\D/g, '');
  const orderNumber = digits
    ? `DGM-${digits}`
    : `DGM-${String(sessionId || Math.floor(1000 + Math.random() * 9000)).slice(-4)}`;

  const safeGrandTotal = Number(grandTotal) || 0;
  const safeSubtotal = Number(subtotal) || 0;
  const safeVat = Number(vat) || 0;
  const safeServiceFee = Number(serviceFee) || 0;

  try {
    const { data: existing, error: findErr } = await supabase
      .from('orders')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('order_number', orderNumber)
      .limit(1);

    if (!findErr && existing && existing.length > 0) {
      const { error: updErr } = await supabase
        .from('orders')
        .update({
          items: Array.isArray(items) ? items : [],
          subtotal: safeSubtotal,
          vat: safeVat,
          service_fee: safeServiceFee,
          total_amount: safeGrandTotal,
          payment_method: paymentMethod,
          order_status: orderStatus
        })
        .eq('id', existing[0].id);

      if (updErr) {
        console.warn('updateDgmSessionOrderAmount update warning:', updErr.message);
        return { success: false, error: updErr.message };
      }
      return { success: true, id: existing[0].id, orderNumber, totalAmount: safeGrandTotal, updated: true };
    }

    // No pre-created orders row (e.g. Fine Dine RPC); insert 1 canonical DGM order row
    const newOrdId = `ord_dgm_${Date.now()}_${digits || '0000'}`;
    const { error: insErr } = await supabase
      .from('orders')
      .insert([{
        id: newOrdId,
        restaurant_id: restaurantId,
        order_number: orderNumber,
        table_number: tableNumber,
        customer_name: tableNumber ? `Customer (${tableNumber})` : 'DGM Customer',
        dining_mode: 'dine-in',
        items: Array.isArray(items) ? items : [],
        subtotal: safeSubtotal,
        vat: safeVat,
        service_fee: safeServiceFee,
        total_amount: safeGrandTotal,
        payment_method: paymentMethod,
        payment_status: 'pending',
        order_status: orderStatus,
        created_at: new Date().toISOString()
      }]);

    if (insErr) {
      console.warn('updateDgmSessionOrderAmount insert warning:', insErr.message);
      return { success: false, error: insErr.message };
    }
    return { success: true, id: newOrdId, orderNumber, totalAmount: safeGrandTotal, inserted: true };
  } catch (err) {
    console.warn('Exception in updateDgmSessionOrderAmount:', err);
    return { success: false, error: err?.message };
  }
};

/**
 * Fetch table order counts for a restaurant's Table QR Management page.
 * Returns map of table statistics: { [table_id or table_no]: { todayOrders, totalOrders, hasActiveSession, activeSession } }
 */
export const fetchFineDineTableStats = async (restaurantId) => {
  if (!restaurantId) return {};
  try {
    const { data, error } = await supabase
      .from('dgm_table_sessions')
      .select('id, session_code, table_id, table_no, table_number, started_at, expires_at, confirmed_at, status')
      .eq('restaurant_id', restaurantId)
      .order('started_at', { ascending: false });

    if (error) {
      console.warn('Error fetching dgm_table_sessions for restaurant:', error);
      return {};
    }

    const statsMap = {};
    const now = new Date();

    (data || []).forEach((s) => {
      const keys = [
        s.table_id,
        String(s.table_no),
        s.table_number,
        `Table ${String(s.table_no).padStart(2, '0')}`,
        `TBL-${String(s.table_no).padStart(3, '0')}`
      ].filter(Boolean);

      const isToday = isSameCalendarDay(s.started_at);
      const isStillActive = new Date(s.expires_at) > now;

      keys.forEach((k) => {
        if (!statsMap[k]) {
          statsMap[k] = {
            todayOrders: 0,
            totalOrders: 0,
            hasActiveSession: false,
            activeSession: null
          };
        }
        statsMap[k].totalOrders += 1;
        if (isToday) {
          statsMap[k].todayOrders += 1;
        }
        if (isStillActive && !statsMap[k].hasActiveSession) {
          statsMap[k].hasActiveSession = true;
          statsMap[k].activeSession = s;
        }
      });
    });

    return statsMap;
  } catch (err) {
    console.warn('Exception in fetchFineDineTableStats:', err);
    return {};
  }
};

/**
 * Fetch Super Admin DGM Sessions with filters and pagination.
 */
export const fetchSuperAdminDGMSessions = async ({
  restaurantId = 'all',
  restaurantType = 'all', // 'fine' | 'non_fine' | 'all'
  tableNo = 'all',
  status = 'all', // 'all' | 'active' | 'ending_soon' | 'expired'
  tab = 'live',   // 'live' | 'today' | 'all' | 'ledger'
  search = ''
} = {}) => {
  try {
    let query = supabase
      .from('dgm_table_sessions')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false });

    if (restaurantId && restaurantId !== 'all') {
      query = query.eq('restaurant_id', restaurantId);
    }

    if (restaurantType === 'fine') {
      query = query.neq('tracking_version', NON_FINE_TRACKING_VERSION);
    } else if (restaurantType === 'non_fine') {
      query = query.eq('tracking_version', NON_FINE_TRACKING_VERSION);
    }

    if (tableNo && tableNo !== 'all') {
      const numMatch = String(tableNo).match(/\d+/);
      if (numMatch) {
        query = query.eq('table_no', parseInt(numMatch[0], 10));
      }
    }

    const nowIso = new Date().toISOString();

    if (tab === 'live') {
      // Active sessions: expires_at > now
      query = query.gt('expires_at', nowIso);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching Super Admin DGM sessions:', error);
      return { sessions: [], count: 0 };
    }

    const nowMs = Date.now();
    let enriched = (data || []).map((s) => {
      const isNonFine = s.tracking_version === NON_FINE_TRACKING_VERSION;
      const expiresMs = new Date(s.expires_at).getTime();
      const diffMs = expiresMs - nowMs;
      const isExpired = diffMs <= 0;
      const minutesLeft = Math.max(0, Math.floor(diffMs / 60000));
      const hoursLeft = Math.floor(minutesLeft / 60);
      const remMins = minutesLeft % 60;

      let computedStatus = 'Active';
      if (isExpired) {
        computedStatus = 'Expired';
      } else if (minutesLeft < 15) {
        computedStatus = 'Ending Soon';
      }

      const totalDurationMs = isNonFine ? NON_FINE_LOCK_MS : (90 * 60 * 1000);
      const progressPercent = isExpired ? 0 : Math.min(100, Math.max(4, Math.round((diffMs / totalDurationMs) * 100)));

      let expiresDisplay = 'Expired';
      if (!isExpired) {
        if (hoursLeft > 0) {
          expiresDisplay = `${hoursLeft}h ${remMins}m left`;
        } else {
          expiresDisplay = `${remMins}m left`;
        }
      }

      return {
        ...s,
        isNonFine,
        diffMs,
        minutesLeft,
        isExpired,
        computedStatus,
        progressPercent,
        expiresDisplay,
        isConfirmed: Boolean(s.confirmed_at),
        isToday: isSameCalendarDay(s.started_at)
      };
    });

    // Include historical pre-session Non-Fine Dine orders (e.g. resto_002) that don't have a v1_non_fine_12h session yet
    if (restaurantType === 'non_fine' || restaurantType === 'all') {
      let ordQuery = supabase
        .from('orders')
        .select('id, restaurant_id, order_number, table_number, created_at')
        .eq('restaurant_id', 'resto_002');
      if (restaurantId && restaurantId !== 'all') {
        ordQuery = ordQuery.eq('restaurant_id', restaurantId);
      }
      const { data: legacyOrds } = await ordQuery;
      const existingCodes = new Set(
        enriched.map(s => String(s.session_code || '').replace(/\D/g, '')).filter(Boolean)
      );
      (legacyOrds || []).forEach(o => {
        const digits = String(o.order_number || '').replace(/\D/g, '');
        if (!digits || !existingCodes.has(digits)) {
          const code = digits ? `#S-${digits}` : `#S-${String(o.id).slice(-4)}`;
          enriched.push({
            id: `legacy_ord_${o.id}`,
            restaurant_id: o.restaurant_id,
            table_id: 'non_fine_qr',
            table_no: 1,
            table_number: 'Customer QR',
            session_code: code,
            order_number: o.order_number,
            started_at: o.created_at,
            expires_at: o.created_at,
            confirmed_at: o.created_at,
            tracking_version: NON_FINE_TRACKING_VERSION,
            isNonFine: true,
            diffMs: 0,
            minutesLeft: 0,
            isExpired: true,
            computedStatus: 'Expired',
            progressPercent: 0,
            expiresDisplay: 'Expired',
            isConfirmed: true,
            isToday: isSameCalendarDay(o.created_at)
          });
        }
      });
      enriched.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    }

    // Tab-level filtering
    if (tab === 'today') {
      enriched = enriched.filter(s => s.isToday);
    }

    // Status filtering
    if (status && status !== 'all') {
      const norm = status.toLowerCase();
      if (norm === 'active') {
        enriched = enriched.filter(s => s.computedStatus === 'Active');
      } else if (norm === 'ending_soon' || norm === 'ending soon') {
        enriched = enriched.filter(s => s.computedStatus === 'Ending Soon');
      } else if (norm === 'expired') {
        enriched = enriched.filter(s => s.computedStatus === 'Expired');
      }
    }

    // Search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter((s) => {
        return (
          (s.session_code && s.session_code.toLowerCase().includes(q)) ||
          (s.table_number && s.table_number.toLowerCase().includes(q)) ||
          (s.restaurant_id && s.restaurant_id.toLowerCase().includes(q))
        );
      });
    }

    return { sessions: enriched, count: enriched.length };
  } catch (err) {
    console.error('Exception fetching Super Admin DGM sessions:', err);
    return { sessions: [], count: 0 };
  }
};

/**
 * Fetch DGM Billing Ledger entries.
 */
export const fetchDGMBillingLedger = async ({ restaurantId = 'all', limit = 100, restaurantType = 'all' } = {}) => {
  try {
    let query = supabase
      .from('dgm_billing_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (restaurantId && restaurantId !== 'all') {
      query = query.eq('restaurant_id', restaurantId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching DGM billing ledger:', error);
      return [];
    }

    const rows = [...(data || [])];

    // Include historical pre-session Non-Fine Dine orders so Billing Ledger matches Total DGM Orders (e.g. 6 = 4 + 2)
    if (restaurantType === 'non_fine') {
      let ordQuery = supabase
        .from('orders')
        .select('id, restaurant_id, order_number, created_at')
        .eq('restaurant_id', 'resto_002');
      if (restaurantId && restaurantId !== 'all') {
        ordQuery = ordQuery.eq('restaurant_id', restaurantId);
      }
      const { data: legacyOrds } = await ordQuery;
      const existingCodes = new Set(
        rows.map(l => String(l.session_code || '').replace(/\D/g, '')).filter(Boolean)
      );
      (legacyOrds || []).forEach(o => {
        const digits = String(o.order_number || '').replace(/\D/g, '');
        if (!digits || !existingCodes.has(digits)) {
          rows.push({
            id: `legacy_${o.id}`,
            restaurant_id: o.restaurant_id,
            table_id: 'non_fine_qr',
            session_id: `legacy_ord_${o.id}`,
            session_code: digits ? `#S-${digits}` : `#S-${String(o.id).slice(-4)}`,
            order_number: o.order_number,
            amount: 5,
            currency: '৳',
            billing_status: 'settled',
            created_at: o.created_at
          });
        }
      });
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return rows;
  } catch (err) {
    console.error('Exception in fetchDGMBillingLedger:', err);
    return [];
  }
};

/**
 * Fetch Super Admin overall metrics for DGM Fine Dine sessions.
 */
export const fetchSuperAdminDGMMetrics = async ({ restaurantType = 'all' } = {}) => {
  try {
    const [sessionsRes, nonFineOrdersRes] = await Promise.all([
      supabase
        .from('dgm_table_sessions')
        .select('id, session_code, started_at, expires_at, confirmed_at, tracking_version, restaurant_id'),
      supabase
        .from('orders')
        .select('id, order_number, created_at, restaurant_id')
        .eq('restaurant_id', 'resto_002')
    ]);

    const allSessions = sessionsRes.data || [];
    const nonFineOrdersRaw = nonFineOrdersRes.data || [];

    const fineSessions = allSessions.filter(s => s.tracking_version !== NON_FINE_TRACKING_VERSION);
    const nonFineSessions = allSessions.filter(s => s.tracking_version === NON_FINE_TRACKING_VERSION);

    // Avoid double-counting: only count historical non-fine orders that don't have a matching v1_non_fine_12h session
    const nonFineSessionCodes = new Set(
      nonFineSessions.map(s => String(s.session_code || '').replace(/\D/g, '')).filter(Boolean)
    );
    const legacyNonFineOrders = nonFineOrdersRaw.filter(o => {
      const num = String(o.order_number || '').replace(/\D/g, '');
      return !num || !nonFineSessionCodes.has(num);
    });

    const targetSessions =
      restaurantType === 'fine'
        ? fineSessions
        : restaurantType === 'non_fine'
        ? nonFineSessions
        : allSessions;

    const targetLegacyOrders = restaurantType === 'fine' ? [] : legacyNonFineOrders;

    if (!targetSessions.length && !targetLegacyOrders.length) {
      return {
        totalDgmOrders: 0,
        todayOrders: 0,
        activeSessions: 0,
        confirmedSessions: 0,
        todayDgmFees: 0,
        yesterdayOrders: 0,
        pctVsYesterday: 0
      };
    }

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const isYesterday = (iso) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d.getFullYear() === yesterday.getFullYear() &&
             d.getMonth() === yesterday.getMonth() &&
             d.getDate() === yesterday.getDate();
    };

    let totalDgmOrders = targetSessions.length + targetLegacyOrders.length;
    let todayOrders = 0;
    let yesterdayOrders = 0;
    let activeSessions = 0;
    let confirmedSessions = 0;

    targetSessions.forEach((s) => {
      if (isSameCalendarDay(s.started_at)) todayOrders += 1;
      if (isYesterday(s.started_at)) yesterdayOrders += 1;
      if (new Date(s.expires_at) > now) activeSessions += 1;
      if (s.confirmed_at) confirmedSessions += 1;
    });

    targetLegacyOrders.forEach((o) => {
      if (isSameCalendarDay(o.created_at)) todayOrders += 1;
      if (isYesterday(o.created_at)) yesterdayOrders += 1;
    });

    const feePerOrder = 5;
    const todayDgmFees = todayOrders * feePerOrder;

    let pctVsYesterday = 0;
    if (yesterdayOrders > 0) {
      pctVsYesterday = Math.round(((todayOrders - yesterdayOrders) / yesterdayOrders) * 100);
    } else if (todayOrders > 0) {
      pctVsYesterday = 100;
    }

    return {
      totalDgmOrders,
      todayOrders,
      activeSessions,
      confirmedSessions,
      todayDgmFees,
      yesterdayOrders,
      pctVsYesterday
    };
  } catch (err) {
    console.error('Exception in fetchSuperAdminDGMMetrics:', err);
    return {
      totalDgmOrders: 0,
      todayOrders: 0,
      activeSessions: 0,
      confirmedSessions: 0,
      todayDgmFees: 0,
      yesterdayOrders: 0,
      pctVsYesterday: 0
    };
  }
};

