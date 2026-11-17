import { supabase } from '../lib/supabaseClient.js';

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

      const totalDurationMs = 90 * 60 * 1000;
      const elapsedMs = Math.max(0, totalDurationMs - diffMs);
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
export const fetchDGMBillingLedger = async ({ restaurantId = 'all', limit = 100 } = {}) => {
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
    return data || [];
  } catch (err) {
    console.error('Exception in fetchDGMBillingLedger:', err);
    return [];
  }
};

/**
 * Fetch Super Admin overall metrics for DGM Fine Dine sessions.
 */
export const fetchSuperAdminDGMMetrics = async () => {
  try {
    const { data: allSessions, error } = await supabase
      .from('dgm_table_sessions')
      .select('id, started_at, expires_at, confirmed_at');

    if (error || !allSessions) {
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
    const nowIso = now.toISOString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const isYesterday = (iso) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d.getFullYear() === yesterday.getFullYear() &&
             d.getMonth() === yesterday.getMonth() &&
             d.getDate() === yesterday.getDate();
    };

    let totalDgmOrders = allSessions.length;
    let todayOrders = 0;
    let yesterdayOrders = 0;
    let activeSessions = 0;
    let confirmedSessions = 0;

    allSessions.forEach((s) => {
      if (isSameCalendarDay(s.started_at)) todayOrders += 1;
      if (isYesterday(s.started_at)) yesterdayOrders += 1;
      if (new Date(s.expires_at) > now) activeSessions += 1;
      if (s.confirmed_at) confirmedSessions += 1;
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

