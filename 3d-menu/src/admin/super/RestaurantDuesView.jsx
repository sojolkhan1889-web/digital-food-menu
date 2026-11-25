import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  Clock3,
  AlertTriangle,
  Store,
  Download,
  Plus,
  Search,
  MoreVertical,
  Eye,
  CreditCard,
  Send,
  History,
  ExternalLink,
  CheckCircle2,
  X
} from 'lucide-react';
import { generateLiveSettlementCycles } from './digitalBillsStore';
import { fetchDGMBillingLedger } from '../../data/dgmSessionStore';
import { supabase } from '../../lib/supabaseClient';
import {
  buildRestaurantDuesData,
  buildPaymentTransactions,
  sendRestaurantPaymentReminder,
  formatDhakaDateTime,
  exportFinancialReportFile
} from './revenueSettlementService';
import {
  RecordPaymentModal,
  ExportReportModal,
  ViewDuesModal
} from './RevenueModals';
import './revenueSettlement.css';

export default function RestaurantDuesView({
  restaurants = [],
  orders = [],
  settlements = [],
  initialStatusFilter = 'all', // 'all' | 'pending' | 'overdue'
  onSyncLive,
  onNavigate,
  onShowToast
}) {
  const [billingLedger, setBillingLedger] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [sortBy, setSortBy] = useState('highest_due'); // 'highest_due' | 'oldest_overdue'
  const [openMenuId, setOpenMenuId] = useState(null);
  const [reminderRefreshTick, setReminderRefreshTick] = useState(0);

  const [viewDuesRow, setViewDuesRow] = useState(null);
  const [reminderHistoryRow, setReminderHistoryRow] = useState(null);
  const [recordModalTarget, setRecordModalTarget] = useState(null); // { restaurantId, cycleId }
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    setStatusFilter(initialStatusFilter || 'all');
  }, [initialStatusFilter]);

  useEffect(() => {
    let mounted = true;
    fetchDGMBillingLedger({ limit: 500 }).then(data => {
      if (mounted && Array.isArray(data)) setBillingLedger(data);
    });
    const channel = supabase
      .channel('realtime_restaurant_dues_ledger')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dgm_billing_ledger' }, () => {
        fetchDGMBillingLedger({ limit: 500 }).then(data => {
          if (mounted && Array.isArray(data)) setBillingLedger(data);
        });
      })
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (!e.target.closest('.rs-action-cell')) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  const effectiveRefDate = useMemo(() => new Date(), [orders, settlements, billingLedger, reminderRefreshTick]);

  const cycles = useMemo(() => {
    return generateLiveSettlementCycles({
      restaurants,
      orders,
      billingLedger,
      settlements,
      currentDate: effectiveRefDate
    });
  }, [restaurants, orders, billingLedger, settlements, effectiveRefDate]);

  // Only Pending & Overdue settlements with remaining > 0 (never In Progress!)
  const { rows: duesRows, summary } = useMemo(() => {
    return buildRestaurantDuesData({
      restaurants,
      cycles,
      refDate: effectiveRefDate
    });
  }, [restaurants, cycles, effectiveRefDate, reminderRefreshTick]);

  const filteredRows = useMemo(() => {
    let list = [...duesRows];

    if (statusFilter === 'pending') {
      list = list.filter(r => r.pendingAmount > 0);
    } else if (statusFilter === 'overdue') {
      list = list.filter(r => r.overdueAmount > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        r =>
          r.restaurantName.toLowerCase().includes(q) ||
          r.restaurantCode.toLowerCase().includes(q) ||
          r.restaurantId.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'oldest_overdue') {
        if (b.maxDaysOverdue !== a.maxDaysOverdue) return b.maxDaysOverdue - a.maxDaysOverdue;
      }
      return b.totalPayableDue - a.totalPayableDue;
    });

    return list;
  }, [duesRows, statusFilter, searchQuery, sortBy]);

  const transactions = useMemo(() => {
    return buildPaymentTransactions({ settlements, cycles, restaurants });
  }, [settlements, cycles, restaurants]);

  const handleSendReminder = (dueRow) => {
    const res = sendRestaurantPaymentReminder({
      restaurantId: dueRow.restaurantId,
      restaurantName: dueRow.restaurantName,
      totalDue: dueRow.totalPayableDue,
      unpaidCycles: dueRow.unpaidCycles
    });
    if (!res.success) {
      if (onShowToast) onShowToast(res.error);
      return;
    }
    setReminderRefreshTick(t => t + 1);
    if (onShowToast) {
      onShowToast(`Payment reminder sent to ${dueRow.restaurantName} for ৳${dueRow.totalPayableDue.toLocaleString()}!`);
    }
  };

  const handleDownloadDueStatement = (dueRow) => {
    exportFinancialReportFile({
      format: 'csv',
      reportTitle: `${dueRow.restaurantName} Due Statement`,
      dateRangeLabel: 'As of Today',
      includeSections: {
        revenueSummary: false,
        settlementBalanceSummary: true,
        revenueTrend: false,
        paymentTransactions: false
      },
      liveBalanceSummary: {
        outstandingFee: dueRow.totalPayableDue,
        currentCycleFee: 0,
        pendingFee: dueRow.pendingAmount,
        overdueFee: dueRow.overdueAmount,
        activeRestaurants: 1
      },
      duesRows: [dueRow]
    });
    if (onShowToast) onShowToast(`Due statement downloaded for ${dueRow.restaurantName}.`);
  };

  return (
    <div className="rs-page">
      {/* Banner */}
      <section className="rs-banner">
        <div className="rs-banner-left">
          <div className="rs-banner-icon dues">
            <Wallet size={24} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="rs-banner-title">Restaurant Dues</h2>
            <p className="rs-banner-sub">
              Manage pending &amp; overdue settlement balances owed by restaurants. (In-progress cycles are excluded.)
            </p>
          </div>
        </div>
        <div className="rs-banner-actions">
          <button
            type="button"
            className="rs-btn rs-btn-outline"
            onClick={() => setIsExportModalOpen(true)}
          >
            <Download size={15} />
            <span>Export Report</span>
          </button>
          <button
            type="button"
            className="rs-btn rs-btn-green"
            onClick={() => setRecordModalTarget({ restaurantId: filteredRows[0]?.restaurantId || '', cycleId: '' })}
          >
            <Plus size={16} />
            <span>Record Payment</span>
          </button>
        </div>
      </section>

      {/* 4 KPI Cards (PDF Page 2) */}
      <section className="rs-kpi-row-4">
        <div className="rs-kpi-card tint-orange" onClick={() => setStatusFilter('all')}>
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><Wallet size={18} /></div>
              <span className="rs-kpi-title">Total Payable Due</span>
            </div>
          </div>
          <div className="rs-kpi-val">৳{summary.totalPayableDue.toLocaleString()}</div>
          <div className="rs-kpi-sub">Pending + Overdue balance</div>
        </div>

        <div className="rs-kpi-card tint-amber" onClick={() => setStatusFilter('pending')}>
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><Clock3 size={18} /></div>
              <span className="rs-kpi-title">Pending Amount</span>
            </div>
          </div>
          <div className="rs-kpi-val">৳{summary.pendingAmount.toLocaleString()}</div>
          <div className="rs-kpi-sub">Within payment grace period</div>
        </div>

        <div className="rs-kpi-card tint-red" onClick={() => setStatusFilter('overdue')}>
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><AlertTriangle size={18} /></div>
              <span className="rs-kpi-title">Overdue Amount</span>
            </div>
          </div>
          <div className="rs-kpi-val">৳{summary.overdueAmount.toLocaleString()}</div>
          <div className="rs-kpi-sub">Payment deadline exceeded</div>
        </div>

        <div className="rs-kpi-card tint-blue" onClick={() => setStatusFilter('all')}>
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><Store size={18} /></div>
              <span className="rs-kpi-title">Restaurants with Dues</span>
            </div>
          </div>
          <div className="rs-kpi-val">{summary.restaurantsWithDuesCount}</div>
          <div className="rs-kpi-sub">Restaurants with unpaid dues</div>
        </div>
      </section>

      {/* Dues Table Card */}
      <section className="rs-card">
        <div className="rs-toolbar">
          <div className="rs-search-box">
            <Search size={15} />
            <input
              type="text"
              className="rs-search-input"
              placeholder="Search by Restaurant Name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rs-filter-group">
            <select
              className="rs-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Dues</option>
              <option value="pending">Pending Only</option>
              <option value="overdue">Overdue Only</option>
            </select>

            <select
              className="rs-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="highest_due">Sort by: Highest Due</option>
              <option value="oldest_overdue">Sort by: Oldest Overdue</option>
            </select>
          </div>
        </div>

        <div className="rs-table-wrap">
          {filteredRows.length === 0 ? (
            <div className="rs-empty-state">
              <CheckCircle2 size={34} color="#16A34A" style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>No Unpaid Restaurant Dues</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                All Pending &amp; Overdue settlements matching the current filter are completely settled.
              </div>
            </div>
          ) : (
            <table className="rs-table">
              <thead>
                <tr>
                  <th>Restaurant</th>
                  <th>Unpaid Settlements</th>
                  <th>Pending Amount</th>
                  <th>Overdue Amount</th>
                  <th>Total Payable Due</th>
                  <th>Days Overdue</th>
                  <th>Last Reminder</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(row => (
                  <tr key={row.restaurantId}>
                    <td>
                      <div className="rs-resto-cell">
                        <span className="rs-resto-badge"><Store size={14} /></span>
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {row.restaurantName}
                            {row.restaurantStatus === 'suspended' && (
                              <span className="rs-pill overdue" style={{ marginLeft: 6, padding: '2px 7px', fontSize: 10 }}>
                                Suspended
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748B' }}>{row.restaurantCode}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="rs-source-pill">
                        {row.unpaidSettlementsCount} unpaid settlement{row.unpaidSettlementsCount === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: row.pendingAmount > 0 ? '#D97706' : '#64748B' }}>
                        ৳{row.pendingAmount.toLocaleString()}
                      </strong>
                    </td>
                    <td>
                      <strong style={{ color: row.overdueAmount > 0 ? '#DC2626' : '#64748B' }}>
                        ৳{row.overdueAmount.toLocaleString()}
                      </strong>
                    </td>
                    <td>
                      <strong style={{ fontSize: 14 }}>৳{row.totalPayableDue.toLocaleString()}</strong>
                    </td>
                    <td>
                      {row.maxDaysOverdue > 0 ? (
                        <span className="rs-pill overdue">
                          {row.maxDaysOverdue} day{row.maxDaysOverdue === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span style={{ color: '#64748B' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: '#64748B' }}>
                      {row.lastReminderAt ? formatDhakaDateTime(row.lastReminderAt) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="rs-action-cell">
                        <button
                          type="button"
                          className="rs-btn rs-btn-outline rs-btn-sm"
                          onClick={() => setViewDuesRow(row)}
                        >
                          View Dues
                        </button>
                        <button
                          type="button"
                          className="rs-dots-btn"
                          onClick={() => setOpenMenuId(openMenuId === row.restaurantId ? null : row.restaurantId)}
                          aria-label="More actions"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {openMenuId === row.restaurantId && (
                          <div className="rs-menu-dropdown">
                            <button
                              type="button"
                              className="rs-menu-item"
                              onClick={() => { setViewDuesRow(row); setOpenMenuId(null); }}
                            >
                              <Eye size={14} /> View Dues
                            </button>
                            <button
                              type="button"
                              className="rs-menu-item success"
                              onClick={() => {
                                setOpenMenuId(null);
                                setRecordModalTarget({
                                  restaurantId: row.restaurantId,
                                  cycleId: row.unpaidCycles[0]?.id || ''
                                });
                              }}
                            >
                              <CreditCard size={14} /> Record Payment
                            </button>
                            <button
                              type="button"
                              className="rs-menu-item"
                              onClick={() => { handleSendReminder(row); setOpenMenuId(null); }}
                            >
                              <Send size={14} /> Send Payment Reminder
                            </button>
                            <button
                              type="button"
                              className="rs-menu-item"
                              onClick={() => { handleDownloadDueStatement(row); setOpenMenuId(null); }}
                            >
                              <Download size={14} /> Download Due Statement
                            </button>
                            <button
                              type="button"
                              className="rs-menu-item"
                              onClick={() => { setReminderHistoryRow(row); setOpenMenuId(null); }}
                            >
                              <History size={14} /> Reminder History
                            </button>
                            <button
                              type="button"
                              className="rs-menu-item"
                              onClick={() => { setOpenMenuId(null); onNavigate && onNavigate('All Restaurants'); }}
                            >
                              <ExternalLink size={14} /> View Restaurant Profile
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Modals */}
      <ViewDuesModal
        dueRow={viewDuesRow}
        onClose={() => setViewDuesRow(null)}
        onSendReminder={handleSendReminder}
        onRecordPayment={(restoId, cycleId) => {
          setViewDuesRow(null);
          setRecordModalTarget({ restaurantId: restoId, cycleId });
        }}
      />

      <RecordPaymentModal
        isOpen={Boolean(recordModalTarget)}
        onClose={() => setRecordModalTarget(null)}
        restaurants={restaurants}
        cycles={cycles}
        effectiveRefDate={effectiveRefDate}
        initialRestaurantId={recordModalTarget?.restaurantId || ''}
        initialCycleId={recordModalTarget?.cycleId || ''}
        onPaymentRecorded={async (_res, cycle, amt) => {
          if (onSyncLive) await onSyncLive();
          if (onShowToast) onShowToast(`Payment of ৳${amt.toFixed(2)} recorded for ${cycle.id}.`);
        }}
      />

      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultReportType="Outstanding Dues Statement"
        defaultDateRange="All Time (Live)"
        filteredSummary={{
          accruedFee: summary.totalPayableDue,
          collectedRevenue: 0,
          billsCount: 0,
          paymentsCount: 0
        }}
        liveBalanceSummary={{
          outstandingFee: summary.totalPayableDue,
          currentCycleFee: 0,
          pendingFee: summary.pendingAmount,
          overdueFee: summary.overdueAmount,
          activeRestaurants: summary.restaurantsWithDuesCount
        }}
        trendBuckets={[]}
        transactions={transactions}
        duesRows={filteredRows}
        onExported={(fmt) => onShowToast && onShowToast(`Due Statement exported (${fmt}).`)}
      />

      {/* Reminder History Modal */}
      {reminderHistoryRow && (
        <div className="rs-modal-overlay" onClick={() => setReminderHistoryRow(null)}>
          <div className="rs-modal" onClick={e => e.stopPropagation()}>
            <div className="rs-modal-head">
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  {reminderHistoryRow.restaurantName} — Reminder History
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
                  Payment notification dispatch audit log
                </p>
              </div>
              <button type="button" className="rs-modal-close" onClick={() => setReminderHistoryRow(null)}>
                <X size={16} />
              </button>
            </div>

            {reminderHistoryRow.reminders.length === 0 ? (
              <div className="rs-empty-state">No reminders have been sent to this restaurant yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reminderHistoryRow.reminders.map(rem => (
                  <div key={rem.id} className="rs-balance-box" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>৳{Number(rem.outstandingAmount).toLocaleString()} Due Reminder</strong>
                      <span style={{ fontSize: 11.5, color: '#64748B' }}>{formatDhakaDateTime(rem.sentAt)}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>{rem.periodsText}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                      Dispatched by {rem.sentBy} · Status: {rem.acknowledged ? 'Acknowledged' : 'Active in Restaurant Panel'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
