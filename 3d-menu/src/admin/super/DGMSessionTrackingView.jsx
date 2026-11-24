import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers,
  Calendar,
  Activity,
  Coins,
  Store,
  Table as TableIcon,
  Utensils,
  RefreshCw,
  Eye,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Bell,
  ChevronDown,
  Clock,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
  fetchSuperAdminDGMSessions,
  fetchSuperAdminDGMMetrics,
  fetchDGMBillingLedger
} from '../../data/dgmSessionStore';
import './dgmSessionTracking.css';

const RESTAURANT_COLORS = {
  resto_001: { bg: '#291e13', text: '#f97316', label: 'MB' }, // Monkey Bhai
  resto_002: { bg: '#102a43', text: '#38bdf8', label: 'HB' }, // Hungry Bite Café
  resto_003: { bg: '#36151e', text: '#fb7185', label: 'SL' }  // Spice Lounge
};

const formatTimeOnly = (iso) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(iso));
  } catch (e) {
    return '—';
  }
};

const formatFullDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(iso));
  } catch (e) {
    return '—';
  }
};

/**
 * Format table display cleanly as "Table 01", "Table 02", etc.
 * Avoids distorted numbers like "Table 00101" caused by regex digit stripping on "tbl_resto_001_01".
 */
export const formatTableDisplay = (tableIdOrNo, matchedSession = null) => {
  if (matchedSession?.table_number) return matchedSession.table_number;
  if (matchedSession?.table_no) return `Table ${String(matchedSession.table_no).padStart(2, '0')}`;
  if (!tableIdOrNo) return 'Table 01';

  const str = String(tableIdOrNo).trim();
  if (/^Table\s+\d+/i.test(str)) {
    const num = parseInt(str.replace(/\D/g, ''), 10);
    return isNaN(num) ? str : `Table ${String(num).padStart(2, '0')}`;
  }

  const parts = str.split(/[_-\s]+/);
  const lastPart = parts[parts.length - 1];
  const numMatch = lastPart.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    return `Table ${String(num).padStart(2, '0')}`;
  }

  const trailingDigits = str.match(/\d+$/);
  if (trailingDigits) {
    const num = parseInt(trailingDigits[0], 10);
    return `Table ${String(num).padStart(2, '0')}`;
  }

  return `Table ${str}`;
};

const formatDateToYMD = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isDateInRange = (isoDate, fromYmd, toYmd) => {
  if (!fromYmd && !toYmd) return true;
  if (!isoDate) return false;

  const itemTime = new Date(isoDate).getTime();
  if (isNaN(itemTime)) return false;

  if (fromYmd) {
    const [y, m, d] = fromYmd.split('-').map(Number);
    const fromTime = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    if (itemTime < fromTime) return false;
  }

  if (toYmd) {
    const [y, m, d] = toYmd.split('-').map(Number);
    const toTime = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
    if (itemTime > toTime) return false;
  }

  return true;
};

export default function DGMSessionTrackingView({
  restaurants = [],
  onBack,
  onOpenRestaurantPanel,
  showPageHeader = false
}) {
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'today' | 'all' | 'ledger'
  const [selectedResto, setSelectedResto] = useState('all');
  const [selectedTable, setSelectedTable] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Date Range filter states (supports all, today, week, month, year, custom range)
  const [datePreset, setDatePreset] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [metrics, setMetrics] = useState({
    totalDgmOrders: 0,
    todayOrders: 0,
    activeSessions: 0,
    confirmedSessions: 0,
    todayDgmFees: 0,
    pctVsYesterday: 12
  });

  const [sessions, setSessions] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modalSession, setModalSession] = useState(null);

  // Live timer tick every 30 seconds to recompute countdowns
  const [timerTick, setTimerTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all live metrics & sessions
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [metricsRes, sessionsRes, ledgerRes] = await Promise.all([
        fetchSuperAdminDGMMetrics(),
        fetchSuperAdminDGMSessions({
          restaurantId: selectedResto,
          tableNo: 'all',
          status: 'all',
          tab: 'all'
        }),
        fetchDGMBillingLedger({
          restaurantId: selectedResto,
          limit: 500
        })
      ]);

      if (metricsRes) setMetrics(metricsRes);
      if (sessionsRes?.sessions) setSessions(sessionsRes.sessions);
      if (ledgerRes) setLedger(ledgerRes);
    } catch (err) {
      console.error('Error loading DGM Tracking data:', err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [selectedResto, timerTick]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription to dgm_table_sessions & dgm_billing_ledger
  useEffect(() => {
    const channel = supabase
      .channel('realtime_dgm_session_tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dgm_table_sessions' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dgm_billing_ledger' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Map of restaurant info by ID
  const restoMap = useMemo(() => {
    const m = {};
    (restaurants || []).forEach(r => {
      m[r.id] = r;
    });
    return m;
  }, [restaurants]);

  // Fast session lookup map by id or session_code
  const sessionMap = useMemo(() => {
    const map = {};
    (sessions || []).forEach(s => {
      if (s.id) map[s.id] = s;
      if (s.session_code) map[s.session_code] = s;
    });
    return map;
  }, [sessions]);

  // Unique tables list collected from both sessions and billing ledger
  const tableFilterOptions = useMemo(() => {
    const set = new Set();
    (sessions || []).forEach(s => {
      if (selectedResto === 'all' || s.restaurant_id === selectedResto) {
        set.add(formatTableDisplay(s.table_id || s.table_no, s));
      }
    });
    (ledger || []).forEach(item => {
      if (selectedResto === 'all' || item.restaurant_id === selectedResto) {
        const matched = sessionMap[item.session_id] || sessionMap[item.session_code];
        set.add(formatTableDisplay(item.table_id, matched));
      }
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [sessions, ledger, selectedResto, sessionMap]);

  // If selectedTable is no longer in options (e.g. restaurant changed), reset to 'all'
  useEffect(() => {
    if (selectedTable !== 'all' && !tableFilterOptions.includes(selectedTable)) {
      setSelectedTable('all');
    }
  }, [tableFilterOptions, selectedTable]);

  // Date filter presets handler
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date();

    if (preset === 'all') {
      setCustomFrom('');
      setCustomTo('');
    } else if (preset === 'today') {
      const todayStr = formatDateToYMD(now);
      setCustomFrom(todayStr);
      setCustomTo(todayStr);
    } else if (preset === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 6);
      setCustomFrom(formatDateToYMD(weekAgo));
      setCustomTo(formatDateToYMD(now));
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setCustomFrom(formatDateToYMD(firstDay));
      setCustomTo(formatDateToYMD(now));
    } else if (preset === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      setCustomFrom(formatDateToYMD(firstDay));
      setCustomTo(formatDateToYMD(now));
    } else if (preset === 'custom') {
      if (!customFrom && !customTo) {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        setCustomFrom(formatDateToYMD(firstDay));
        setCustomTo(formatDateToYMD(now));
      }
    }
  };

  const handleCustomDateChange = (field, value) => {
    setDatePreset('custom');
    setPage(1);
    if (field === 'from') {
      setCustomFrom(value);
    } else {
      setCustomTo(value);
    }
  };

  const handleClearDate = () => {
    setDatePreset('all');
    setCustomFrom('');
    setCustomTo('');
    setPage(1);
  };

  // Filtered Sessions (Tab, Restaurant, Table, Status, Date Range)
  const filteredSessions = useMemo(() => {
    return (sessions || []).filter(s => {
      // Restaurant filter
      if (selectedResto !== 'all' && s.restaurant_id !== selectedResto) {
        return false;
      }

      // Table filter (matches Table 01, Table 02, etc.)
      if (selectedTable !== 'all') {
        const t = formatTableDisplay(s.table_id || s.table_no, s);
        if (t !== selectedTable) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        const norm = (s.computedStatus || '').toLowerCase().replace(/\s+/g, '_');
        if (norm !== selectedStatus.toLowerCase()) return false;
      }

      // Tab filter
      if (activeTab === 'live') {
        if (s.isExpired) return false;
      } else if (activeTab === 'today') {
        if (!s.isToday) return false;
      }

      // Date Range filter
      if (!isDateInRange(s.started_at || s.created_at, customFrom, customTo)) {
        return false;
      }

      return true;
    });
  }, [sessions, selectedResto, selectedTable, selectedStatus, activeTab, customFrom, customTo]);

  // Filtered Ledger (Restaurant, Table, Date Range)
  const filteredLedger = useMemo(() => {
    return (ledger || []).filter(item => {
      // Restaurant filter
      if (selectedResto !== 'all' && item.restaurant_id !== selectedResto) {
        return false;
      }

      // Table filter (matches Table 01, Table 02, etc.)
      if (selectedTable !== 'all') {
        const matched = sessionMap[item.session_id] || sessionMap[item.session_code];
        const t = formatTableDisplay(item.table_id, matched);
        if (t !== selectedTable) return false;
      }

      // Date Range filter
      if (!isDateInRange(item.created_at, customFrom, customTo)) {
        return false;
      }

      return true;
    });
  }, [ledger, sessionMap, selectedResto, selectedTable, customFrom, customTo]);

  // Total counts & pagination
  const totalCount = activeTab === 'ledger' ? filteredLedger.length : filteredSessions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSessions.slice(start, start + pageSize);
  }, [filteredSessions, currentPage, pageSize]);

  const paginatedLedger = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLedger.slice(start, start + pageSize);
  }, [filteredLedger, currentPage, pageSize]);

  const todayFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date());
    } catch {
      return 'Today';
    }
  }, []);

  return (
    <div className="dgm-tracking-container">
      {/* Top Header (Optional when loaded standalone) */}
      {showPageHeader && (
        <div className="dgm-header">
          <div className="dgm-title-area">
            <h1>DGM Session Tracking</h1>
            <p>Track table sessions, DGM orders, confirmations, and charges for Fine Dine restaurants.</p>
          </div>

          <div className="dgm-header-actions">
            <div className="dgm-date-pill">
              <Calendar size={15} className="text-slate-500" />
              <span>Today, {todayFormatted}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>

            <button type="button" className="dgm-notif-btn" title="Notifications">
              <Bell size={17} />
              <span className="dgm-notif-dot" />
            </button>

            <div className="dgm-user-pill">
              <span className="dgm-avatar-circle">SA</span>
              <span>Super Admin</span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="dgm-metrics-grid">
        {/* 1. Total DGM Orders */}
        <div className="dgm-card card-purple">
          <div className="dgm-card-bg-shape" />
          <div className="dgm-card-head">
            <div className="dgm-card-icon">
              <Layers size={22} strokeWidth={2.2} />
            </div>
            <span className="dgm-card-label">
              Total DGM Orders
              <Info size={14} className="dgm-info-tip" title="All-time fine-dine table session orders" />
            </span>
          </div>
          <div className="dgm-card-val">
            {metrics.totalDgmOrders.toLocaleString()}
          </div>
          <div className="dgm-card-sub">
            All time (Fine Dine)
          </div>
        </div>

        {/* 2. Today's Orders */}
        <div className="dgm-card card-green">
          <div className="dgm-card-bg-shape" />
          <div className="dgm-card-head">
            <div className="dgm-card-icon">
              <Calendar size={22} strokeWidth={2.2} />
            </div>
            <span className="dgm-card-label">
              Today's Orders
              <Info size={14} className="dgm-info-tip" title="Fine-dine sessions initiated today" />
            </span>
          </div>
          <div className="dgm-card-val">
            {metrics.todayOrders.toLocaleString()}
          </div>
          <div className="dgm-card-sub trend-up">
            ↑ {metrics.pctVsYesterday > 0 ? `+${metrics.pctVsYesterday}%` : `${metrics.pctVsYesterday}%`} vs. yesterday
          </div>
        </div>

        {/* 3. Active Sessions */}
        <div className="dgm-card card-blue">
          <div className="dgm-card-bg-shape" />
          <div className="dgm-card-head">
            <div className="dgm-card-icon">
              <Activity size={22} strokeWidth={2.2} />
            </div>
            <span className="dgm-card-label">
              Active Sessions
              <Info size={14} className="dgm-info-tip" title="90-minute table sessions currently running" />
            </span>
          </div>
          <div className="dgm-card-val">
            {metrics.activeSessions.toLocaleString()}
          </div>
          <div className="dgm-card-sub">
            Sessions running now
          </div>
        </div>

        {/* 4. Today's DGM Fees */}
        <div className="dgm-card card-amber">
          <div className="dgm-card-bg-shape" />
          <div className="dgm-card-head">
            <div className="dgm-card-icon">
              <Coins size={22} strokeWidth={2.2} />
            </div>
            <span className="dgm-card-label">
              Today's DGM Fees
              <Info size={14} className="dgm-info-tip" title="Platform service fee accrued today (৳5 per order)" />
            </span>
          </div>
          <div className="dgm-card-val">
            ৳{metrics.todayDgmFees.toLocaleString()}
          </div>
          <div className="dgm-card-sub">
            {metrics.todayOrders} orders × ৳5
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="dgm-filter-bar">
        {/* Restaurant Filter */}
        <div className="dgm-filter-item">
          <Store size={18} className="dgm-filter-icon" />
          <div className="dgm-filter-inner">
            <span className="dgm-filter-label">Restaurant</span>
            <select
              className="dgm-filter-select"
              value={selectedResto}
              onChange={(e) => {
                setSelectedResto(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Restaurants</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name} {r.type === 'fine' ? '(Fine Dine)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Filter */}
        <div className="dgm-filter-item">
          <TableIcon size={18} className="dgm-filter-icon" />
          <div className="dgm-filter-inner">
            <span className="dgm-filter-label">Table</span>
            <select
              className="dgm-filter-select"
              value={selectedTable}
              onChange={(e) => {
                setSelectedTable(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Tables</option>
              {tableFilterOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter */}
        <div className="dgm-filter-item">
          <Activity size={18} className="dgm-filter-icon" />
          <div className="dgm-filter-inner">
            <span className="dgm-filter-label">Status</span>
            <select
              className="dgm-filter-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="ending_soon">Ending Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Restaurant Type Logic Badge */}
        <div className="dgm-filter-badge-box">
          <Utensils size={18} className="text-purple-600" />
          <div className="dgm-filter-inner">
            <span className="dgm-filter-label">Restaurant Type</span>
            <span className="dgm-badge-fine-logic">
              Fine Dine (DGM Logic)
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Toolbar Row */}
      <div className="dgm-tabs-row">
        <div className="dgm-tabs-group">
          <button
            type="button"
            className={`dgm-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('live');
              setPage(1);
            }}
          >
            <span className="dgm-tab-dot-live" />
            <span>Live Sessions ({metrics.activeSessions})</span>
          </button>

          <button
            type="button"
            className={`dgm-tab-btn ${activeTab === 'today' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('today');
              setPage(1);
            }}
          >
            <Calendar size={16} />
            <span>Today's Orders ({metrics.todayOrders})</span>
          </button>

          <button
            type="button"
            className={`dgm-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('all');
              setPage(1);
            }}
          >
            <Layers size={16} />
            <span>All Sessions</span>
          </button>

          <button
            type="button"
            className={`dgm-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('ledger');
              setPage(1);
            }}
          >
            <Receipt size={16} />
            <span>Billing Ledger</span>
          </button>
        </div>

        <div className="dgm-tab-right-tools">
          {/* Date Range Filter Section (Monthly, Weekly, Yearly, Custom) */}
          <div className="dgm-date-filter-box" title="Filter both Sessions and Billing Ledger by date range">
            <div className="dgm-date-preset-pill">
              <Calendar size={14} className="dgm-date-icon" />
              <select
                className="dgm-date-preset-select"
                value={datePreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                aria-label="Date Range Filter Preset"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div className="dgm-date-inputs-group">
              <div className="dgm-date-input-wrap">
                <span className="dgm-date-lbl">From:</span>
                <input
                  type="date"
                  className="dgm-date-input"
                  value={customFrom}
                  onChange={(e) => handleCustomDateChange('from', e.target.value)}
                  title="Filter From Date"
                />
              </div>

              <span className="dgm-date-sep">–</span>

              <div className="dgm-date-input-wrap">
                <span className="dgm-date-lbl">To:</span>
                <input
                  type="date"
                  className="dgm-date-input"
                  value={customTo}
                  onChange={(e) => handleCustomDateChange('to', e.target.value)}
                  title="Filter To Date"
                />
              </div>

              {(datePreset !== 'all' || customFrom || customTo) && (
                <button
                  type="button"
                  className="dgm-date-clear-pill"
                  onClick={handleClearDate}
                  title="Clear Date Filter"
                >
                  <X size={13} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            className="dgm-refresh-btn"
            onClick={loadData}
            disabled={isRefreshing}
            title="Refresh Live Data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="dgm-table-card">
        {activeTab !== 'ledger' ? (
          <table className="dgm-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Table</th>
                <th>Session</th>
                <th>Started At</th>
                <th>Expires In</th>
                <th>Confirmed</th>
                <th>DGM Order</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#64748b' }}>
                      <RefreshCw size={20} className="animate-spin text-purple-600" />
                      <span>Loading real-time DGM sessions from Supabase…</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedSessions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    No sessions match the selected filters or date range.
                  </td>
                </tr>
              ) : (
                paginatedSessions.map((row) => {
                  const resto = restoMap[row.restaurant_id] || {
                    name: row.restaurant_id === 'resto_001' ? 'Monkey Bhai' : (row.restaurant_id === 'resto_003' ? 'Spice Lounge' : row.restaurant_id),
                    type: 'fine'
                  };
                  const colorPreset = RESTAURANT_COLORS[row.restaurant_id] || { bg: '#312e81', text: '#818cf8', label: (resto.name || 'RS').substring(0, 2).toUpperCase() };

                  // Bar color depending on time left
                  let barColorClass = 'green';
                  let txtColorClass = 'green';
                  if (row.isExpired) {
                    barColorClass = 'expired';
                    txtColorClass = 'expired';
                  } else if (row.minutesLeft < 15) {
                    barColorClass = 'red';
                    txtColorClass = 'red';
                  } else if (row.minutesLeft <= 30) {
                    barColorClass = 'amber';
                    txtColorClass = 'amber';
                  }

                  let statusClass = 'status-active';
                  if (row.computedStatus === 'Ending Soon') statusClass = 'status-ending';
                  else if (row.computedStatus === 'Expired') statusClass = 'status-expired';

                  return (
                    <tr key={row.id}>
                      {/* Restaurant */}
                      <td>
                        <div className="dgm-resto-cell">
                          <div
                            className="dgm-resto-logo"
                            style={{ background: colorPreset.bg, color: colorPreset.text }}
                          >
                            {colorPreset.label}
                          </div>
                          <div className="dgm-resto-info">
                            <span className="dgm-resto-name">{resto.name}</span>
                            <span className="dgm-resto-type-pill">Fine Dine</span>
                          </div>
                        </div>
                      </td>

                      {/* Table */}
                      <td>
                        <span className="dgm-table-badge">
                          {row.table_number || `Table ${String(row.table_no).padStart(2, '0')}`}
                        </span>
                      </td>

                      {/* Session Code */}
                      <td>
                        <span className="dgm-session-code">{row.session_code}</span>
                      </td>

                      {/* Started At */}
                      <td>
                        <span style={{ color: '#334155', fontWeight: 600 }}>
                          {formatTimeOnly(row.started_at)}
                        </span>
                      </td>

                      {/* Expires In */}
                      <td>
                        <div className="dgm-expires-cell">
                          <div className={`dgm-expires-txt ${txtColorClass}`}>
                            {row.expiresDisplay}
                          </div>
                          <div className="dgm-progress-track">
                            <div
                              className={`dgm-progress-bar ${barColorClass}`}
                              style={{ width: `${row.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Confirmed */}
                      <td>
                        {row.isConfirmed ? (
                          <span className="dgm-confirmed-yes">
                            <CheckCircle2 size={16} />
                            <span>Yes</span>
                          </span>
                        ) : (
                          <span className="dgm-confirmed-no">—</span>
                        )}
                      </td>

                      {/* DGM Order */}
                      <td>
                        <span className="dgm-order-cell">
                          <Layers size={15} className="text-slate-500" />
                          <span>1</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`dgm-status-pill ${statusClass}`}>
                          {row.computedStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="dgm-view-btn"
                            title="View Session Details"
                            onClick={() => setModalSession({ ...row, resto })}
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          /* Billing Ledger Table */
          <table className="dgm-table">
            <thead>
              <tr>
                <th>Ledger ID</th>
                <th>Session Code</th>
                <th>Restaurant</th>
                <th>Table</th>
                <th>Fee Amount</th>
                <th>Billing Status</th>
                <th>Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <RefreshCw size={20} className="animate-spin text-purple-600" />
                  </td>
                </tr>
              ) : paginatedLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    No billing ledger records match the selected filters or date range.
                  </td>
                </tr>
              ) : (
                paginatedLedger.map((item) => {
                  const resto = restoMap[item.restaurant_id] || {
                    name: item.restaurant_id === 'resto_001' ? 'Monkey Bhai' : (item.restaurant_id === 'resto_003' ? 'Spice Lounge' : item.restaurant_id)
                  };
                  const matchedSession = sessionMap[item.session_id] || sessionMap[item.session_code];
                  const tableDisplay = formatTableDisplay(item.table_id, matchedSession);

                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="dgm-session-code">#LEDG-{item.id.slice(0, 6)}</span>
                      </td>
                      <td>
                        <span className="dgm-session-code" style={{ color: '#6d28d9' }}>{item.session_code}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{resto.name}</span>
                      </td>
                      <td>
                        <span className="dgm-table-badge">{tableDisplay}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                          ৳{Number(item.amount).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span className="dgm-status-pill status-active" style={{ textTransform: 'capitalize' }}>
                          {item.billing_status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>
                          {formatFullDate(item.created_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* Pagination Row */}
        <div className="dgm-pagination-row">
          <div>
            Showing <strong>{totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> {activeTab === 'ledger' ? 'ledger records' : 'sessions'}
          </div>

          <div className="dgm-page-controls">
            <button
              type="button"
              className="dgm-page-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              if (
                pNum === 1 ||
                pNum === totalPages ||
                Math.abs(pNum - currentPage) <= 1
              ) {
                return (
                  <button
                    key={pNum}
                    type="button"
                    className={`dgm-page-btn ${pNum === currentPage ? 'active' : ''}`}
                    onClick={() => setPage(pNum)}
                  >
                    {pNum}
                  </button>
                );
              }
              return null;
            })}

            <button
              type="button"
              className="dgm-page-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Session Details Modal */}
      {modalSession && (
        <div className="dgm-modal-overlay" onClick={() => setModalSession(null)}>
          <div className="dgm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="dgm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Layers size={20} className="text-purple-600" />
                <h3>Session Details ({modalSession.session_code})</h3>
              </div>
              <button
                type="button"
                className="dgm-notif-btn"
                onClick={() => setModalSession(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dgm-modal-body">
              <div className="dgm-modal-row">
                <span className="dgm-modal-label">Restaurant</span>
                <span className="dgm-modal-value">{modalSession.resto?.name || modalSession.restaurant_id}</span>
              </div>

              <div className="dgm-modal-row">
                <span className="dgm-modal-label">Table Number</span>
                <span className="dgm-modal-value">
                  {modalSession.table_number || `Table ${modalSession.table_no}`}
                </span>
              </div>

              <div className="dgm-modal-row">
                <span className="dgm-modal-label">Started At</span>
                <span className="dgm-modal-value">{formatFullDate(modalSession.started_at)}</span>
              </div>

              <div className="dgm-modal-row">
                <span className="dgm-modal-label">Expires At</span>
                <span className="dgm-modal-value">{formatFullDate(modalSession.expires_at)}</span>
              </div>

              <div className="dgm-modal-row">
                <span className="dgm-modal-label">Remaining Time</span>
                <span className={`dgm-modal-value ${modalSession.isExpired ? 'text-red-600' : 'text-emerald-600'}`}>
                  {modalSession.expiresDisplay}
                </span>
              </div>

              <div className="dgm-modal-row">
                <span className="dgm-modal-label">Confirmed by Diner</span>
                <span className="dgm-modal-value">
                  {modalSession.isConfirmed ? (
                    <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle2 size={16} /> Yes ({formatTimeOnly(modalSession.confirmed_at)})
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Pending (No customer confirmed yet)</span>
                  )}
                </span>
              </div>

              <div className="dgm-modal-row">
                <span className="dgm-modal-label">DGM Order Counted</span>
                <span className="dgm-modal-value text-purple-700">
                  +1 DGM Order (counted immediately on QR scan)
                </span>
              </div>

              <div className="dgm-modal-row">
                <span className="dgm-modal-label">Platform Service Fee</span>
                <span className="dgm-modal-value text-amber-700">
                  ৳5.00 (Recorded in Billing Ledger)
                </span>
              </div>

              <div className="dgm-modal-row">
                <span className="dgm-modal-label">5-Hour Visitor Protection</span>
                <span className="dgm-modal-value text-slate-700" style={{ fontSize: '12.5px' }}>
                  <ShieldCheck size={14} className="inline mr-1 text-emerald-600" />
                  Active (rescan by same customer within 5h will not trigger new session)
                </span>
              </div>
            </div>

            <div className="dgm-modal-footer">
              <button
                type="button"
                className="dgm-page-btn"
                style={{ padding: '8px 18px', height: 'auto', fontWeight: 700 }}
                onClick={() => setModalSession(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
