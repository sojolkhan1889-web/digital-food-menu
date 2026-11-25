// Shared Revenue, Restaurant Dues & Payment Transactions Business Logic Service
// Single Source of Truth backed by Supabase PostgreSQL & digitalBillsStore.js

import { supabase } from '../../lib/supabaseClient.js';
import {
  computeSettlementStatus,
  getStoredPaymentOverrides,
  saveStoredPaymentOverrides,
  recordCycleReminder
} from './digitalBillsStore.js';

const REMINDERS_STORAGE_KEY = 'phonemenu_payment_reminders_v1';
const AUDIT_LOGS_STORAGE_KEY = 'phonemenu_payment_audit_logs_v1';
const DHAKA_TZ = 'Asia/Dhaka';

// ---------------------------------------------------------------------------
// 1. Asia/Dhaka Timezone & Date Range Utilities
// ---------------------------------------------------------------------------

export const getDhakaDateKey = (input) => {
  if (!input) return '';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: DHAKA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

export const formatDhakaDate = (input) => {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    timeZone: DHAKA_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatDhakaTime = (input) => {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', {
    timeZone: DHAKA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDhakaDateTime = (input) => {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '—';
  return `${formatDhakaDate(d)}, ${formatDhakaTime(d)}`;
};

export const getDateRangeBounds = (filterKey = 'All Time (Live)', customFrom = '', customTo = '') => {
  const key = String(filterKey || 'All Time (Live)');
  if (key === 'All Time (Live)' || key === 'all' || key === 'All Time') {
    return { startKey: null, endKey: null, label: 'All Time' };
  }

  const todayKey = getDhakaDateKey(new Date());
  const todayDate = new Date(`${todayKey}T12:00:00+06:00`);

  if (key === 'Today' || key === 'today') {
    return { startKey: todayKey, endKey: todayKey, label: `Today (${formatDhakaDate(todayDate)})` };
  }

  if (key === 'Last 7 Days' || key === 'last_7_days') {
    const start = new Date(todayDate);
    start.setDate(start.getDate() - 6);
    const startKey = getDhakaDateKey(start);
    return { startKey, endKey: todayKey, label: 'Last 7 Days' };
  }

  if (key === 'Last 30 Days' || key === 'last_30_days') {
    const start = new Date(todayDate);
    start.setDate(start.getDate() - 29);
    const startKey = getDhakaDateKey(start);
    return { startKey, endKey: todayKey, label: 'Last 30 Days' };
  }

  if (key === 'This Month' || key === 'this_month') {
    const startKey = `${todayKey.slice(0, 7)}-01`;
    return { startKey, endKey: todayKey, label: 'This Month' };
  }

  if (key === 'Custom Range' || key === 'custom') {
    return {
      startKey: customFrom || null,
      endKey: customTo || null,
      label: customFrom || customTo ? `${customFrom || '...'} to ${customTo || '...'}` : 'Custom Range'
    };
  }

  return { startKey: null, endKey: null, label: 'All Time' };
};

export const isDateInBounds = (isoDate, bounds) => {
  if (!bounds || (!bounds.startKey && !bounds.endKey)) return true;
  const key = getDhakaDateKey(isoDate);
  if (!key) return false;
  if (bounds.startKey && key < bounds.startKey) return false;
  if (bounds.endKey && key > bounds.endKey) return false;
  return true;
};

// ---------------------------------------------------------------------------
// 2. Payment Transactions Mapper (Single Source of Truth from settlements)
// ---------------------------------------------------------------------------

export const normalizePaymentStatus = (rawStatus) => {
  const s = String(rawStatus || 'cleared').toLowerCase();
  if (s === 'cleared' || s === 'settled' || s === 'verified') return 'verified';
  if (s === 'pending' || s === 'pending_verification') return 'pending_verification';
  if (s === 'failed') return 'failed';
  if (s === 'rejected') return 'rejected';
  if (s === 'refunded') return 'refunded';
  if (s === 'reversed') return 'reversed';
  return 'verified';
};

export const buildPaymentTransactions = ({ settlements = [], cycles = [], restaurants = [] }) => {
  const restoMap = new Map();
  (restaurants || []).forEach(r => restoMap.set(String(r.id), r));

  // Sort ascending first so PAY-YYYY-001, 002... numbering stays deterministic
  const chronological = [...(settlements || [])].sort((a, b) => {
    const tA = new Date(a.cleared_at || a.clearedAt || a.created_at || 0).getTime();
    const tB = new Date(b.cleared_at || b.clearedAt || b.created_at || 0).getTime();
    return tA - tB;
  });

  const yearCounters = {};

  const mapped = chronological.map((s) => {
    const rId = String(s.restaurant_id || s.restaurantId || '');
    const resto = restoMap.get(rId);
    const paymentDate = s.cleared_at || s.clearedAt || s.created_at || new Date().toISOString();
    const yr = new Date(paymentDate).getFullYear() || 2026;
    yearCounters[yr] = (yearCounters[yr] || 0) + 1;
    const seq = String(yearCounters[yr]).padStart(3, '0');
    const paymentId = `PAY-${yr}-${seq}`;

    const notes = String(s.notes || '');
    const method = String(s.payment_method || s.paymentMethod || 'bKash Merchant Pay');
    const ref = String(s.transaction_ref || s.transactionRef || s.id || '');
    const amount = Number(s.amount || 0);
    const status = normalizePaymentStatus(s.status);

    // Determine Settlement Cycle allocation(s)
    const restoCycles = (cycles || []).filter(c => c.restaurantId === rId);
    const directCycles = restoCycles.filter(c => {
      if (notes.includes(c.id)) return true;
      if (s.period_start && new Date(s.period_start).getTime() === new Date(c.start_at).getTime()) return true;
      if (rId === 'resto_002' && c.totalOrders > 0 && Number(s.orders_count || 0) === c.totalOrders) return true;
      return false;
    });

    let allocations = [];
    if (directCycles.length > 0) {
      allocations = directCycles.map(dc => ({
        cycleId: dc.id,
        periodLabel: dc.periodLabel,
        amount: directCycles.length === 1 ? amount : Math.min(amount, dc.accruedFee)
      }));
    } else {
      // Fallback: match cycles that have this transactionRef or settled payment inside cycles
      const refMatched = restoCycles.filter(c =>
        (c.payments || []).some(p => p.id === s.id || (ref && p.transactionRef === ref))
      );
      if (refMatched.length > 0) {
        allocations = refMatched.map(dc => ({
          cycleId: dc.id,
          periodLabel: dc.periodLabel,
          amount: refMatched.length === 1 ? amount : Math.min(amount, dc.accruedFee)
        }));
      }
    }

    const settlementPeriodLabel =
      allocations.length > 1
        ? 'Multiple Settlements'
        : allocations.length === 1
        ? allocations[0].periodLabel
        : (s.period_start && s.period_end
            ? `${formatDhakaDate(s.period_start)} – ${formatDhakaDate(s.period_end)}`
            : 'General Settlement');

    const isPortalAuto =
      notes.toLowerCase().includes('portal') ||
      method.toLowerCase().includes('digital payment / settle due') ||
      notes.toLowerCase().includes('automatic');

    return {
      id: String(s.id),
      paymentId,
      restaurantId: rId,
      restaurantName: resto?.name || 'Restaurant',
      restaurantCode: resto?.display_id || resto?.displayId || `#${rId.replace(/\D/g, '').padStart(3, '0')}`,
      settlementPeriod: settlementPeriodLabel,
      primaryCycleId: allocations[0]?.cycleId || null,
      allocations,
      paymentDate,
      paymentDateFormatted: formatDhakaDate(paymentDate),
      paymentTimeFormatted: formatDhakaTime(paymentDate),
      paymentDateTimeFormatted: formatDhakaDateTime(paymentDate),
      method,
      transactionRef: ref,
      paymentSource: isPortalAuto ? 'Automatic' : 'Manual',
      amount,
      status,
      verifiedBy: status === 'verified' ? 'Super Admin' : '—',
      notes,
      raw: s
    };
  });

  // Return newest first
  return mapped.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
};

// ---------------------------------------------------------------------------
// 3. Revenue & Collection Trend Series (Daily, Weekly, Monthly)
// ---------------------------------------------------------------------------

const getCalendarWeekInfo = (dateInput) => {
  const key = getDhakaDateKey(dateInput);
  if (!key) return null;
  const d = new Date(`${key}T12:00:00+06:00`);
  const dayOfWeek = d.getDay(); // 0=Sun..6=Sat
  const diffToSun = dayOfWeek;
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - diffToSun);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const sKey = getDhakaDateKey(weekStart);
  const sDay = weekStart.getDate();
  const eDay = weekEnd.getDate();
  const sMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const eMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
  const label = sMonth === eMonth ? `${sDay}–${eDay} ${sMonth}` : `${sDay} ${sMonth}–${eDay} ${eMonth}`;

  return { key: sKey, label, fullLabel: `${label} ${weekEnd.getFullYear()}` };
};

export const buildRevenueTrendSeries = ({
  orders = [],
  transactions = [],
  feePerBill = 5,
  granularity = 'daily',
  bounds = { startKey: null, endKey: null }
}) => {
  const filteredOrders = (orders || []).filter(o => isDateInBounds(o.createdAt || o.created_at, bounds));
  const verifiedTxns = (transactions || []).filter(
    t => t.status === 'verified' && isDateInBounds(t.paymentDate, bounds)
  );

  const bucketsMap = new Map();

  if (granularity === 'daily') {
    // Determine date span for continuous X-axis (like Nov 11 -> Nov 25)
    const todayKey = getDhakaDateKey(new Date());
    let minKey = bounds.startKey;
    let maxKey = bounds.endKey || todayKey;

    if (!minKey) {
      const allKeys = [
        ...filteredOrders.map(o => getDhakaDateKey(o.createdAt || o.created_at)),
        ...verifiedTxns.map(t => getDhakaDateKey(t.paymentDate))
      ].filter(Boolean).sort();

      if (allKeys.length > 0) {
        // Start 1 day before earliest activity (or up to 14 days window covering today)
        const earliest = new Date(`${allKeys[0]}T12:00:00+06:00`);
        earliest.setDate(earliest.getDate() - 1);
        minKey = getDhakaDateKey(earliest);
        const latestDataKey = allKeys[allKeys.length - 1];
        if (latestDataKey > maxKey) maxKey = latestDataKey;
      } else {
        const d14 = new Date(`${todayKey}T12:00:00+06:00`);
        d14.setDate(d14.getDate() - 13);
        minKey = getDhakaDateKey(d14);
      }
    }

    // Populate continuous day buckets (safety cap 62 days so chart remains legible)
    let cursor = new Date(`${minKey}T12:00:00+06:00`);
    const endCursor = new Date(`${maxKey}T12:00:00+06:00`);
    let safety = 0;
    while (cursor.getTime() <= endCursor.getTime() && safety < 62) {
      const k = getDhakaDateKey(cursor);
      const shortLabel = cursor.toLocaleDateString('en-GB', {
        timeZone: DHAKA_TZ,
        day: 'numeric',
        month: 'short'
      });
      bucketsMap.set(k, {
        key: k,
        label: shortLabel,
        fullDateLabel: formatDhakaDate(cursor),
        accrued: 0,
        collected: 0
      });
      cursor.setDate(cursor.getDate() + 1);
      safety++;
    }

    filteredOrders.forEach(o => {
      const k = getDhakaDateKey(o.createdAt || o.created_at);
      if (!k) return;
      if (!bucketsMap.has(k)) {
        bucketsMap.set(k, {
          key: k,
          label: formatDhakaDate(o.createdAt || o.created_at).slice(0, 6),
          fullDateLabel: formatDhakaDate(o.createdAt || o.created_at),
          accrued: 0,
          collected: 0
        });
      }
      const billFee = Number(o.platformFee || feePerBill);
      bucketsMap.get(k).accrued += billFee;
    });

    verifiedTxns.forEach(t => {
      const k = getDhakaDateKey(t.paymentDate);
      if (!k) return;
      if (!bucketsMap.has(k)) {
        bucketsMap.set(k, {
          key: k,
          label: formatDhakaDate(t.paymentDate).slice(0, 6),
          fullDateLabel: formatDhakaDate(t.paymentDate),
          accrued: 0,
          collected: 0
        });
      }
      bucketsMap.get(k).collected += Number(t.amount || 0);
    });
  } else if (granularity === 'weekly') {
    filteredOrders.forEach(o => {
      const info = getCalendarWeekInfo(o.createdAt || o.created_at);
      if (!info) return;
      if (!bucketsMap.has(info.key)) {
        bucketsMap.set(info.key, {
          key: info.key,
          label: info.label,
          fullDateLabel: info.fullLabel,
          accrued: 0,
          collected: 0
        });
      }
      bucketsMap.get(info.key).accrued += Number(o.platformFee || feePerBill);
    });

    verifiedTxns.forEach(t => {
      const info = getCalendarWeekInfo(t.paymentDate);
      if (!info) return;
      if (!bucketsMap.has(info.key)) {
        bucketsMap.set(info.key, {
          key: info.key,
          label: info.label,
          fullDateLabel: info.fullLabel,
          accrued: 0,
          collected: 0
        });
      }
      bucketsMap.get(info.key).collected += Number(t.amount || 0);
    });
  } else {
    // monthly
    filteredOrders.forEach(o => {
      const k = getDhakaDateKey(o.createdAt || o.created_at).slice(0, 7);
      if (!k) return;
      const d = new Date(`${k}-15T12:00:00+06:00`);
      const mLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!bucketsMap.has(k)) {
        bucketsMap.set(k, { key: k, label: mLabel, fullDateLabel: mLabel, accrued: 0, collected: 0 });
      }
      bucketsMap.get(k).accrued += Number(o.platformFee || feePerBill);
    });

    verifiedTxns.forEach(t => {
      const k = getDhakaDateKey(t.paymentDate).slice(0, 7);
      if (!k) return;
      const d = new Date(`${k}-15T12:00:00+06:00`);
      const mLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!bucketsMap.has(k)) {
        bucketsMap.set(k, { key: k, label: mLabel, fullDateLabel: mLabel, accrued: 0, collected: 0 });
      }
      bucketsMap.get(k).collected += Number(t.amount || 0);
    });
  }

  const buckets = Array.from(bucketsMap.values()).sort((a, b) => a.key.localeCompare(b.key));
  const totalAccrued = filteredOrders.reduce((s, o) => s + Number(o.platformFee || feePerBill), 0);
  const totalCollected = verifiedTxns.reduce((s, t) => s + Number(t.amount || 0), 0);

  return { buckets, totalAccrued, totalCollected };
};

// ---------------------------------------------------------------------------
// 4. Restaurant Dues Aggregation (Pending & Overdue ONLY, never In Progress)
// ---------------------------------------------------------------------------

export const getStoredPaymentReminders = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const getRestaurantReminders = (restaurantId) => {
  const all = getStoredPaymentReminders();
  return Array.isArray(all[restaurantId]) ? all[restaurantId] : [];
};

export const sendRestaurantPaymentReminder = ({
  restaurantId,
  restaurantName,
  totalDue,
  unpaidCycles = [],
  bypassCooldown = false
}) => {
  if (!restaurantId || totalDue <= 0) {
    return { success: false, error: 'No outstanding balance to remind.' };
  }

  const all = getStoredPaymentReminders();
  const list = Array.isArray(all[restaurantId]) ? all[restaurantId] : [];
  const latest = list[0];

  // Prevent spam / accidental duplicate reminder within 30 minutes
  if (!bypassCooldown && latest) {
    const minsSince = (Date.now() - new Date(latest.sentAt).getTime()) / 60000;
    if (minsSince < 30) {
      const waitMins = Math.max(1, Math.ceil(30 - minsSince));
      return {
        success: false,
        error: `A reminder was already sent to ${restaurantName} recently. Please wait ${waitMins} min(s) before resending.`
      };
    }
  }

  const periodsText = unpaidCycles.map(c => `${c.periodLabel} (Due: ${formatDhakaDate(c.paymentDueDate)})`).join(', ');
  const nowIso = new Date().toISOString();
  const reminderEntry = {
    id: `rem_${Date.now()}`,
    restaurantId,
    restaurantName,
    outstandingAmount: Number(totalDue),
    periodsText: periodsText || 'Pending / Overdue Settlement',
    cycles: unpaidCycles.map(c => ({
      cycleId: c.id,
      periodLabel: c.periodLabel,
      dueDate: c.paymentDueDate,
      remainingDue: c.remainingDue,
      status: c.status
    })),
    sentAt: nowIso,
    sentBy: 'Super Admin',
    acknowledged: false
  };

  all[restaurantId] = [reminderEntry, ...list].slice(0, 25);
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('phonemenu_payment_reminder_sent', { detail: reminderEntry }));
  } catch (e) {
    console.warn('Reminder storage warning:', e);
  }

  // Also log to each unpaid cycle's activity log in Digital Bills
  unpaidCycles.forEach(c => {
    recordCycleReminder(c.id, restaurantId, 'Payment Reminder');
  });

  return { success: true, reminder: reminderEntry };
};

export const acknowledgeRestaurantReminder = (restaurantId) => {
  const all = getStoredPaymentReminders();
  if (!Array.isArray(all[restaurantId])) return;
  all[restaurantId] = all[restaurantId].map(r => ({ ...r, acknowledged: true }));
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
};

export const buildRestaurantDuesData = ({ restaurants = [], cycles = [], refDate = new Date() }) => {
  const nowTime = new Date(refDate).getTime();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const remindersAll = getStoredPaymentReminders();

  const duesByResto = new Map();

  (cycles || []).forEach(c => {
    const status = computeSettlementStatus(c, refDate);
    // CRITICAL RULE: In Progress Settlement MUST NOT be counted as Due!
    if (status !== 'pending' && status !== 'overdue') return;

    const remainingDue = Math.max(0, Number(c.accruedFee || 0) - Number(c.paidAmount || 0));
    if (remainingDue <= 0) return;

    const dueTime = new Date(c.overdueStartDate || c.due_at || c.paymentDueDate).getTime();
    const daysOverdue = status === 'overdue' ? Math.max(1, Math.ceil((nowTime - dueTime) / MS_PER_DAY)) : 0;

    if (!duesByResto.has(c.restaurantId)) {
      const resto = (restaurants || []).find(r => r.id === c.restaurantId);
      const restoReminders = Array.isArray(remindersAll[c.restaurantId]) ? remindersAll[c.restaurantId] : [];
      duesByResto.set(c.restaurantId, {
        restaurantId: c.restaurantId,
        restaurantName: resto?.name || c.restaurantName,
        restaurantCode: resto?.display_id || resto?.displayId || c.restaurantCode || `#${String(c.restaurantId).replace(/\D/g, '').padStart(3, '0')}`,
        restaurantStatus: resto?.status || 'active',
        ownerPhone: resto?.ownerPhone || resto?.owner_phone || '',
        unpaidCycles: [],
        unpaidSettlementsCount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        totalPayableDue: 0,
        maxDaysOverdue: 0,
        reminders: restoReminders,
        lastReminderAt: restoReminders[0]?.sentAt || null
      });
    }

    const entry = duesByResto.get(c.restaurantId);
    entry.unpaidCycles.push({
      ...c,
      status,
      remainingDue,
      daysOverdue
    });
    entry.unpaidSettlementsCount += 1;
    if (status === 'pending') entry.pendingAmount += remainingDue;
    if (status === 'overdue') {
      entry.overdueAmount += remainingDue;
      if (daysOverdue > entry.maxDaysOverdue) entry.maxDaysOverdue = daysOverdue;
    }
    entry.totalPayableDue += remainingDue;
  });

  const rows = Array.from(duesByResto.values());
  const summary = {
    totalPayableDue: rows.reduce((s, r) => s + r.totalPayableDue, 0),
    pendingAmount: rows.reduce((s, r) => s + r.pendingAmount, 0),
    overdueAmount: rows.reduce((s, r) => s + r.overdueAmount, 0),
    restaurantsWithDuesCount: rows.length
  };

  return { rows, summary };
};

// ---------------------------------------------------------------------------
// 5. Payment Audit Log & Authorized Verification / Rejection / Reversal
// ---------------------------------------------------------------------------

export const getPaymentAuditLogs = (paymentId = null) => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : [];
    if (!paymentId) return all;
    return all.filter(l => l.settlementId === paymentId || l.paymentId === paymentId);
  } catch {
    return [];
  }
};

export const appendPaymentAuditLog = (entry) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getPaymentAuditLogs();
    const updated = [{ id: `aud_${Date.now()}`, timestamp: new Date().toISOString(), ...entry }, ...existing].slice(0, 200);
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
};

export const updatePaymentStatusInSupabase = async ({
  transaction,
  newStatus, // 'cleared' (verify) | 'rejected' | 'reversed' | 'refunded'
  reason = '',
  actor = 'Super Admin'
}) => {
  if (!transaction?.id) {
    return { success: false, error: 'Invalid payment record.' };
  }

  const dbStatus = newStatus === 'verified' ? 'cleared' : newStatus;
  const noteSuffix = reason ? ` | [${newStatus.toUpperCase()} by ${actor}: ${reason}]` : ` | [${newStatus.toUpperCase()} by ${actor}]`;
  const updatedNotes = `${transaction.notes || ''}${noteSuffix}`;

  try {
    const { error } = await supabase
      .from('settlements')
      .update({
        status: dbStatus,
        notes: updatedNotes,
        ...(dbStatus === 'cleared' ? { cleared_at: new Date().toISOString() } : {})
      })
      .eq('id', transaction.id);

    if (error) {
      return { success: false, error: `Failed to update status: ${error.message}` };
    }

    // If reversed / refunded / rejected, clear conflicting local override so cycle balance recalculates cleanly
    if (['reversed', 'refunded', 'rejected'].includes(dbStatus) && transaction.primaryCycleId) {
      const overrides = getStoredPaymentOverrides();
      const key = `${transaction.restaurantId}_${transaction.primaryCycleId}`;
      if (overrides[key]) {
        delete overrides[key];
        saveStoredPaymentOverrides(overrides);
      }
      // Update restaurant settlement_status back to pending if reversed
      await supabase
        .from('restaurants')
        .update({ settlement_status: 'pending' })
        .eq('id', transaction.restaurantId);
    }

    appendPaymentAuditLog({
      settlementId: transaction.id,
      paymentId: transaction.paymentId,
      restaurantId: transaction.restaurantId,
      restaurantName: transaction.restaurantName,
      action: `Payment ${newStatus.toUpperCase()}`,
      reason: reason || `Marked as ${newStatus} by ${actor}`,
      amount: transaction.amount,
      actor
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || 'Status update failed.' };
  }
};

// ---------------------------------------------------------------------------
// 6. Export Utilities (CSV, Excel, Printable PDF Report & Payment Receipt)
// ---------------------------------------------------------------------------

const csvEscape = (val) => {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const triggerFileDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportFinancialReportFile = ({
  format = 'csv', // 'csv' | 'excel' | 'pdf'
  reportTitle = 'Complete Revenue Report',
  dateRangeLabel = 'All Time',
  includeSections = {
    revenueSummary: true,
    settlementBalanceSummary: true,
    revenueTrend: true,
    paymentTransactions: true
  },
  filteredSummary = { accruedFee: 0, collectedRevenue: 0, billsCount: 0, paymentsCount: 0 },
  liveBalanceSummary = { outstandingFee: 0, currentCycleFee: 0, pendingFee: 0, overdueFee: 0, activeRestaurants: 0 },
  trendBuckets = [],
  transactions = [],
  duesRows = null
}) => {
  const generatedAt = formatDhakaDateTime(new Date());
  const dateTag = getDhakaDateKey(new Date());

  if (format === 'csv') {
    const lines = [];
    lines.push(['Digital Food Menu (PhoneMenu) - Financial Report'].map(csvEscape).join(','));
    lines.push(['Report Type', reportTitle].map(csvEscape).join(','));
    lines.push(['Selected Date Range', dateRangeLabel].map(csvEscape).join(','));
    lines.push(['Report Generated At (Asia/Dhaka)', generatedAt].map(csvEscape).join(','));
    lines.push(['Currency', 'BDT (৳)'].map(csvEscape).join(','));
    lines.push('');

    if (includeSections.revenueSummary) {
      lines.push(['=== DATE-FILTERED REVENUE SUMMARY ==='].map(csvEscape).join(','));
      lines.push(['Metric', 'Value'].map(csvEscape).join(','));
      lines.push(['Total Accrued Fee', `৳${filteredSummary.accruedFee.toFixed(2)}`].map(csvEscape).join(','));
      lines.push(['Verified Bills Count', filteredSummary.billsCount].map(csvEscape).join(','));
      lines.push(['Total Revenue Collected', `৳${filteredSummary.collectedRevenue.toFixed(2)}`].map(csvEscape).join(','));
      lines.push(['Verified Payments Count', filteredSummary.paymentsCount].map(csvEscape).join(','));
      lines.push('');
    }

    if (includeSections.settlementBalanceSummary) {
      lines.push(['=== CURRENT SETTLEMENT BALANCES (AS OF TODAY) ==='].map(csvEscape).join(','));
      lines.push(['Total Outstanding Fee', `৳${liveBalanceSummary.outstandingFee.toFixed(2)}`].map(csvEscape).join(','));
      lines.push(['Current Cycle Fee (In Progress)', `৳${liveBalanceSummary.currentCycleFee.toFixed(2)}`].map(csvEscape).join(','));
      lines.push(['Pending Settlement (Grace Period)', `৳${liveBalanceSummary.pendingFee.toFixed(2)}`].map(csvEscape).join(','));
      lines.push(['Overdue Settlement', `৳${liveBalanceSummary.overdueFee.toFixed(2)}`].map(csvEscape).join(','));
      lines.push(['Active Restaurants', liveBalanceSummary.activeRestaurants].map(csvEscape).join(','));
      lines.push('');
    }

    if (duesRows && duesRows.length > 0) {
      lines.push(['=== RESTAURANT DUES BREAKDOWN (PENDING & OVERDUE) ==='].map(csvEscape).join(','));
      lines.push(['Restaurant', 'ID', 'Unpaid Settlements', 'Pending (BDT)', 'Overdue (BDT)', 'Total Payable Due (BDT)', 'Days Overdue', 'Last Reminder'].map(csvEscape).join(','));
      duesRows.forEach(r => {
        lines.push([
          r.restaurantName,
          r.restaurantCode,
          r.unpaidSettlementsCount,
          r.pendingAmount.toFixed(2),
          r.overdueAmount.toFixed(2),
          r.totalPayableDue.toFixed(2),
          r.maxDaysOverdue > 0 ? `${r.maxDaysOverdue} days` : '—',
          r.lastReminderAt ? formatDhakaDateTime(r.lastReminderAt) : '—'
        ].map(csvEscape).join(','));
      });
      lines.push('');
    }

    if (includeSections.revenueTrend && trendBuckets.length > 0) {
      lines.push(['=== REVENUE & COLLECTION TREND ==='].map(csvEscape).join(','));
      lines.push(['Period', 'Accrued Fee (BDT)', 'Collected Revenue (BDT)'].map(csvEscape).join(','));
      trendBuckets.forEach(b => {
        lines.push([b.fullDateLabel || b.label, b.accrued.toFixed(2), b.collected.toFixed(2)].map(csvEscape).join(','));
      });
      lines.push('');
    }

    if (includeSections.paymentTransactions) {
      lines.push(['=== PAYMENT TRANSACTIONS ==='].map(csvEscape).join(','));
      lines.push(['Payment ID', 'Restaurant', 'Settlement Period', 'Payment Date & Time', 'Method', 'Reference ID', 'Source', 'Amount (BDT)', 'Status'].map(csvEscape).join(','));
      transactions.forEach(t => {
        lines.push([
          t.paymentId,
          t.restaurantName,
          t.settlementPeriod,
          t.paymentDateTimeFormatted,
          t.method,
          t.transactionRef,
          t.paymentSource,
          t.amount.toFixed(2),
          t.status
        ].map(csvEscape).join(','));
      });
    }

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    triggerFileDownload(blob, `PhoneMenu_${reportTitle.replace(/\s+/g, '_')}_${dateTag}.csv`);
    return true;
  }

  // Build rich HTML body used by both Excel (.xls) and Print/PDF
  const htmlBody = `
    <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; padding: 24px; max-width: 960px; margin: 0 auto;">
      <div style="display:flex; justify-content:space-between; border-bottom:2px solid #f97316; padding-bottom:14px; margin-bottom:20px;">
        <div>
          <h1 style="margin:0; font-size:22px; color:#121c2e;">Digital Food Menu (PhoneMenu) — ${reportTitle}</h1>
          <p style="margin:4px 0 0; font-size:12px; color:#64748b;">Selected Date Range: <strong>${dateRangeLabel}</strong> &nbsp;|&nbsp; Currency: <strong>BDT (৳)</strong></p>
        </div>
        <div style="text-align:right; font-size:12px; color:#64748b;">
          <div>Generated: <strong>${generatedAt}</strong></div>
          <div>Timezone: Asia/Dhaka (UTC+6)</div>
        </div>
      </div>

      ${includeSections.revenueSummary ? `
        <h3 style="margin:16px 0 8px; font-size:14px; color:#121c2e;">1. Date-Filtered Revenue Summary (${dateRangeLabel})</h3>
        <table border="1" cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse; border-color:#dce4ef; font-size:12px; margin-bottom:16px;">
          <tr style="background:#f8fafc;"><th>Total Accrued Fee</th><th>Verified Bills</th><th>Total Revenue Collected</th><th>Verified Payments</th></tr>
          <tr>
            <td style="font-weight:700; color:#ea580c;">৳${filteredSummary.accruedFee.toLocaleString()}</td>
            <td>${filteredSummary.billsCount}</td>
            <td style="font-weight:700; color:#16a34a;">৳${filteredSummary.collectedRevenue.toLocaleString()}</td>
            <td>${filteredSummary.paymentsCount}</td>
          </tr>
        </table>
      ` : ''}

      ${includeSections.settlementBalanceSummary ? `
        <h3 style="margin:16px 0 8px; font-size:14px; color:#121c2e;">2. Current Settlement Balances (As of Today)</h3>
        <table border="1" cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse; border-color:#dce4ef; font-size:12px; margin-bottom:16px;">
          <tr style="background:#f8fafc;"><th>Total Outstanding Fee</th><th>Current Cycle (In Progress)</th><th>Pending (Grace Period)</th><th>Overdue Settlement</th><th>Active Restaurants</th></tr>
          <tr>
            <td style="font-weight:700; color:#d97706;">৳${liveBalanceSummary.outstandingFee.toLocaleString()}</td>
            <td style="font-weight:700; color:#2563eb;">৳${liveBalanceSummary.currentCycleFee.toLocaleString()}</td>
            <td style="font-weight:700; color:#d97706;">৳${liveBalanceSummary.pendingFee.toLocaleString()}</td>
            <td style="font-weight:700; color:#dc2626;">৳${liveBalanceSummary.overdueFee.toLocaleString()}</td>
            <td>${liveBalanceSummary.activeRestaurants}</td>
          </tr>
        </table>
      ` : ''}

      ${duesRows && duesRows.length > 0 ? `
        <h3 style="margin:16px 0 8px; font-size:14px; color:#121c2e;">Restaurant Dues Statement (Pending & Overdue)</h3>
        <table border="1" cellspacing="0" cellpadding="7" style="width:100%; border-collapse:collapse; border-color:#dce4ef; font-size:12px; margin-bottom:16px;">
          <tr style="background:#f8fafc;"><th>Restaurant</th><th>Unpaid Cycles</th><th>Pending</th><th>Overdue</th><th>Total Payable Due</th><th>Days Overdue</th></tr>
          ${duesRows.map(r => `
            <tr>
              <td><strong>${r.restaurantName}</strong> (${r.restaurantCode})</td>
              <td>${r.unpaidSettlementsCount}</td>
              <td>৳${r.pendingAmount.toLocaleString()}</td>
              <td style="color:#dc2626; font-weight:700;">৳${r.overdueAmount.toLocaleString()}</td>
              <td style="font-weight:700;">৳${r.totalPayableDue.toLocaleString()}</td>
              <td>${r.maxDaysOverdue > 0 ? `${r.maxDaysOverdue} days` : '—'}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}

      ${includeSections.revenueTrend && trendBuckets.length > 0 ? `
        <h3 style="margin:16px 0 8px; font-size:14px; color:#121c2e;">3. Revenue & Collection Trend</h3>
        <table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border-color:#dce4ef; font-size:12px; margin-bottom:16px;">
          <tr style="background:#f8fafc;"><th>Date / Period</th><th>Accrued Fee</th><th>Collected Revenue</th></tr>
          ${trendBuckets.filter(b => b.accrued > 0 || b.collected > 0).map(b => `
            <tr><td>${b.fullDateLabel || b.label}</td><td>৳${b.accrued.toLocaleString()}</td><td>৳${b.collected.toLocaleString()}</td></tr>
          `).join('')}
        </table>
      ` : ''}

      ${includeSections.paymentTransactions ? `
        <h3 style="margin:16px 0 8px; font-size:14px; color:#121c2e;">4. Payment Transactions (${transactions.length})</h3>
        <table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border-color:#dce4ef; font-size:11px;">
          <tr style="background:#f8fafc;"><th>Payment ID</th><th>Restaurant</th><th>Settlement Period</th><th>Date & Time</th><th>Method & Ref</th><th>Source</th><th>Amount</th><th>Status</th></tr>
          ${transactions.map(t => `
            <tr>
              <td><strong>${t.paymentId}</strong></td>
              <td>${t.restaurantName}</td>
              <td>${t.settlementPeriod}</td>
              <td>${t.paymentDateTimeFormatted}</td>
              <td>${t.method} (${t.transactionRef})</td>
              <td>${t.paymentSource}</td>
              <td style="font-weight:700; color:#16a34a;">৳${t.amount.toLocaleString()}</td>
              <td>${t.status}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
    </div>
  `;

  if (format === 'excel') {
    const excelDoc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body>${htmlBody}</body></html>`;
    const blob = new Blob(['\uFEFF' + excelDoc], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    triggerFileDownload(blob, `PhoneMenu_${reportTitle.replace(/\s+/g, '_')}_${dateTag}.xls`);
    return true;
  }

  // PDF (Print Dialog to PDF)
  const win = window.open('', '_blank', 'width=1024,height=768');
  if (win) {
    win.document.write(`<!DOCTYPE html><html><head><title>${reportTitle}</title><style>@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style></head><body>${htmlBody}<script>window.onload = () => { setTimeout(() => window.print(), 250); };</script></body></html>`);
    win.document.close();
  }
  return true;
};

export const downloadPaymentReceipt = (txn) => {
  if (!txn) return;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${txn.paymentId}</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; color: #0f172a; padding: 32px; background: #f8fafc; }
          .receipt { max-width: 520px; margin: 0 auto; background: #fff; border: 1px solid #dce4ef; border-radius: 12px; padding: 28px; }
          .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 18px; text-align: center; margin: 18px 0; }
          .amount-val { font-size: 30px; font-weight: 800; color: #16a34a; margin-top: 4px; }
          .row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
          .row span:first-child { color: #64748b; }
          .row span:last-child { font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <h2 style="margin:0; font-size:18px;">Digital Food Menu — Payment Receipt</h2>
          <p style="margin:4px 0 0; font-size:12px; color:#64748b;">Official SaaS Settlement Payment Confirmation</p>
          <div class="amount-box">
            <div style="font-size:12px; color:#15803d; font-weight:600; text-transform:uppercase;">${txn.status} Payment</div>
            <div class="amount-val">৳${Number(txn.amount).toFixed(2)}</div>
          </div>
          <div class="row"><span>Payment ID</span><span>${txn.paymentId}</span></div>
          <div class="row"><span>Restaurant</span><span>${txn.restaurantName}</span></div>
          <div class="row"><span>Settlement Period</span><span>${txn.settlementPeriod}</span></div>
          <div class="row"><span>Payment Method</span><span>${txn.method}</span></div>
          <div class="row"><span>Reference ID</span><span>${txn.transactionRef}</span></div>
          <div class="row"><span>Date & Time</span><span>${txn.paymentDateTimeFormatted}</span></div>
          <div class="row"><span>Payment Source</span><span>${txn.paymentSource}</span></div>
          <div class="row" style="border-bottom:none;"><span>Verified By</span><span>${txn.verifiedBy}</span></div>
        </div>
        <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
      </body>
    </html>
  `;
  const win = window.open('', '_blank', 'width=680,height=720');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};
