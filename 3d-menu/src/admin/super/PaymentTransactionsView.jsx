import React, { useState, useMemo, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock3,
  RotateCcw,
  Download,
  Plus,
  Search,
  Store,
  Calendar,
  MoreVertical,
  Eye,
  FileText,
  ExternalLink,
  History,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { generateLiveSettlementCycles } from './digitalBillsStore';
import { fetchDGMBillingLedger } from '../../data/dgmSessionStore';
import { supabase } from '../../lib/supabaseClient';
import {
  getDateRangeBounds,
  isDateInBounds,
  buildPaymentTransactions,
  downloadPaymentReceipt,
  updatePaymentStatusInSupabase
} from './revenueSettlementService';
import {
  RecordPaymentModal,
  ExportReportModal,
  PaymentDetailsModal
} from './RevenueModals';
import './revenueSettlement.css';

const PAGE_SIZE = 10;

export default function PaymentTransactionsView({
  restaurants = [],
  orders = [],
  settlements = [],
  dateFilter = 'All Time (Live)',
  customDateFrom = '',
  customDateTo = '',
  onSyncLive,
  onOpenDigitalBills,
  onShowToast
}) {
  const [billingLedger, setBillingLedger] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [restoFilter, setRestoFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [localDateFilter, setLocalDateFilter] = useState(dateFilter);
  const [page, setPage] = useState(1);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    setLocalDateFilter(dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    let mounted = true;
    fetchDGMBillingLedger({ limit: 500 }).then(data => {
      if (mounted && Array.isArray(data)) setBillingLedger(data);
    });
    const channel = supabase
      .channel('realtime_payment_transactions_ledger')
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

  const effectiveRefDate = useMemo(() => new Date(), [orders, settlements, billingLedger]);
  const bounds = useMemo(
    () => getDateRangeBounds(localDateFilter, customDateFrom, customDateTo),
    [localDateFilter, customDateFrom, customDateTo]
  );

  const cycles = useMemo(() => {
    return generateLiveSettlementCycles({
      restaurants,
      orders,
      billingLedger,
      settlements,
      currentDate: effectiveRefDate
    });
  }, [restaurants, orders, billingLedger, settlements, effectiveRefDate]);

  const allTransactions = useMemo(() => {
    return buildPaymentTransactions({ settlements, cycles, restaurants });
  }, [settlements, cycles, restaurants]);

  // Distinct payment methods
  const distinctMethods = useMemo(() => {
    const set = new Set();
    allTransactions.forEach(t => { if (t.method) set.add(t.method); });
    return Array.from(set);
  }, [allTransactions]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      if (!isDateInBounds(t.paymentDate, bounds)) return false;
      if (restoFilter !== 'all' && t.restaurantId !== restoFilter) return false;
      if (methodFilter !== 'all' && t.method !== methodFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          t.paymentId.toLowerCase().includes(q) ||
          t.restaurantName.toLowerCase().includes(q) ||
          t.transactionRef.toLowerCase().includes(q) ||
          t.settlementPeriod.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allTransactions, bounds, restoFilter, methodFilter, statusFilter, searchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [restoFilter, methodFilter, statusFilter, localDateFilter, searchQuery]);

  // 4 KPI Cards (PDF Page 8)
  const kpiStats = useMemo(() => {
    const dateScoped = allTransactions.filter(t => isDateInBounds(t.paymentDate, bounds));
    const verifiedList = dateScoped.filter(t => t.status === 'verified');
    const pendingList = dateScoped.filter(t => t.status === 'pending_verification');
    const refundedReversedAmount = dateScoped
      .filter(t => t.status === 'refunded' || t.status === 'reversed')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const verifiedSum = verifiedList.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalCollectedRevenue = Math.max(0, verifiedSum - refundedReversedAmount);

    return {
      totalCollectedRevenue,
      verifiedCount: verifiedList.length,
      pendingCount: pendingList.length,
      refundedReversedAmount
    };
  }, [allTransactions, bounds]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, page]);

  const getStatusBadge = (status) => {
    const map = {
      verified: { label: '✓ Verified', cls: 'verified' },
      pending_verification: { label: 'Pending Verification', cls: 'pending_verification' },
      failed: { label: 'Failed', cls: 'failed' },
      rejected: { label: 'Rejected', cls: 'rejected' },
      refunded: { label: 'Refunded', cls: 'refunded' },
      reversed: { label: 'Reversed', cls: 'reversed' }
    };
    const info = map[status] || map.verified;
    return <span className={`rs-pill ${info.cls}`}>{info.label}</span>;
  };

  return (
    <div className="rs-page">
      {/* Banner */}
      <section className="rs-banner">
        <div className="rs-banner-left">
          <div className="rs-banner-icon txns">
            <CreditCard size={24} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="rs-banner-title">Payment Transactions</h2>
            <p className="rs-banner-sub">
              Complete audit ledger of all verified, pending, and reversed restaurant payments.
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
            onClick={() => setIsRecordModalOpen(true)}
          >
            <Plus size={16} />
            <span>Record Payment</span>
          </button>
        </div>
      </section>

      {/* 4 KPI Cards (PDF Page 8) */}
      <section className="rs-kpi-row-4">
        <div className="rs-kpi-card tint-green" onClick={() => setStatusFilter('verified')}>
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><CreditCard size={18} /></div>
              <span className="rs-kpi-title">Total Collected Revenue</span>
            </div>
          </div>
          <div className="rs-kpi-val">৳{kpiStats.totalCollectedRevenue.toLocaleString()}</div>
          <div className="rs-kpi-sub">Net verified payments</div>
        </div>

        <div className="rs-kpi-card tint-blue" onClick={() => setStatusFilter('verified')}>
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><CheckCircle2 size={18} /></div>
              <span className="rs-kpi-title">Verified Payments</span>
            </div>
          </div>
          <div className="rs-kpi-val">{kpiStats.verifiedCount}</div>
          <div className="rs-kpi-sub">Successfully verified</div>
        </div>

        <div className="rs-kpi-card tint-amber" onClick={() => setStatusFilter('pending_verification')}>
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><Clock3 size={18} /></div>
              <span className="rs-kpi-title">Pending Verification</span>
            </div>
          </div>
          <div className="rs-kpi-val">{kpiStats.pendingCount}</div>
          <div className="rs-kpi-sub">Awaiting payment verification</div>
        </div>

        <div className="rs-kpi-card tint-red" onClick={() => setStatusFilter('reversed')}>
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><RotateCcw size={18} /></div>
              <span className="rs-kpi-title">Refunded / Reversed</span>
            </div>
          </div>
          <div className="rs-kpi-val">৳{kpiStats.refundedReversedAmount.toLocaleString()}</div>
          <div className="rs-kpi-sub">Confirmed financial corrections</div>
        </div>
      </section>

      {/* Transactions Table Card */}
      <section className="rs-card">
        <div className="rs-toolbar">
          <div className="rs-search-box">
            <Search size={15} />
            <input
              type="text"
              className="rs-search-input"
              placeholder="Search by Payment ID, restaurant, or reference ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rs-filter-group">
            <select
              className="rs-select"
              value={restoFilter}
              onChange={e => setRestoFilter(e.target.value)}
            >
              <option value="all">All Restaurants</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            <select
              className="rs-select"
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
            >
              <option value="all">All Methods</option>
              {distinctMethods.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              className="rs-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
              <option value="refunded">Refunded</option>
              <option value="reversed">Reversed</option>
            </select>

            <select
              className="rs-select"
              value={localDateFilter}
              onChange={e => setLocalDateFilter(e.target.value)}
            >
              <option value="All Time (Live)">All Time (Live)</option>
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="This Month">This Month</option>
            </select>
          </div>
        </div>

        <div className="rs-table-wrap">
          {paginatedRows.length === 0 ? (
            <div className="rs-empty-state">No payment transactions found matching the selected filters.</div>
          ) : (
            <table className="rs-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Restaurant</th>
                  <th>Settlement Period</th>
                  <th>Payment Date &amp; Time</th>
                  <th>Payment Method / Reference</th>
                  <th>Payment Source</th>
                  <th>Paid Amount</th>
                  <th>Payment Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map(txn => (
                  <tr key={txn.id}>
                    <td><strong>{txn.paymentId}</strong></td>
                    <td>
                      <div className="rs-resto-cell">
                        <span className="rs-resto-badge"><Store size={14} /></span>
                        <strong>{txn.restaurantName}</strong>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#475569' }}>
                        <Calendar size={13} color="#64748B" />
                        {txn.settlementPeriod}
                      </span>
                    </td>
                    <td>{txn.paymentDateTimeFormatted}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{txn.method}</div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>{txn.transactionRef}</div>
                    </td>
                    <td>
                      <span className="rs-source-pill">{txn.paymentSource}</span>
                    </td>
                    <td>
                      <strong style={{ color: txn.status === 'verified' ? '#16A34A' : '#64748B', fontSize: 14 }}>
                        ৳{txn.amount.toLocaleString()}
                      </strong>
                    </td>
                    <td>{getStatusBadge(txn.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="rs-action-cell">
                        <button
                          type="button"
                          className="rs-btn rs-btn-outline rs-btn-sm"
                          onClick={() => setSelectedTransaction(txn)}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className="rs-dots-btn"
                          onClick={() => setOpenMenuId(openMenuId === txn.id ? null : txn.id)}
                          aria-label="More actions"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {openMenuId === txn.id && (
                          <div className="rs-menu-dropdown">
                            <button
                              type="button"
                              className="rs-menu-item"
                              onClick={() => { setSelectedTransaction(txn); setOpenMenuId(null); }}
                            >
                              <Eye size={14} /> View Details
                            </button>

                            {txn.status === 'pending_verification' ? (
                              <>
                                <button
                                  type="button"
                                  className="rs-menu-item success"
                                  onClick={async () => {
                                    setOpenMenuId(null);
                                    const res = await updatePaymentStatusInSupabase({ transaction: txn, newStatus: 'verified' });
                                    if (res.success && onSyncLive) await onSyncLive();
                                    if (onShowToast) onShowToast(res.success ? `${txn.paymentId} verified!` : res.error);
                                  }}
                                >
                                  <CheckCircle2 size={14} /> Verify Payment
                                </button>
                                <button
                                  type="button"
                                  className="rs-menu-item danger"
                                  onClick={async () => {
                                    setOpenMenuId(null);
                                    const res = await updatePaymentStatusInSupabase({ transaction: txn, newStatus: 'rejected' });
                                    if (res.success && onSyncLive) await onSyncLive();
                                    if (onShowToast) onShowToast(res.success ? `${txn.paymentId} rejected.` : res.error);
                                  }}
                                >
                                  <AlertCircle size={14} /> Reject Payment
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="rs-menu-item"
                                  onClick={() => { downloadPaymentReceipt(txn); setOpenMenuId(null); }}
                                >
                                  <FileText size={14} /> Download Receipt
                                </button>
                                <button
                                  type="button"
                                  className="rs-menu-item"
                                  onClick={() => { setSelectedTransaction(txn); setOpenMenuId(null); }}
                                >
                                  <History size={14} /> View Activity Log
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              className="rs-menu-item"
                              onClick={() => {
                                setOpenMenuId(null);
                                if (onOpenDigitalBills) {
                                  onOpenDigitalBills('all', txn.primaryCycleId || null);
                                }
                              }}
                            >
                              <ExternalLink size={14} /> View Settlement
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

        {/* Pagination */}
        {filteredTransactions.length > 0 && (
          <div className="rs-pagination">
            <div>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredTransactions.length)} of {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? '' : 's'}
            </div>
            <div className="rs-page-btns">
              <button
                type="button"
                className="rs-page-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  className={`rs-page-btn ${page === n ? 'active' : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="rs-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Shared Modals */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        restaurants={restaurants}
        cycles={cycles}
        effectiveRefDate={effectiveRefDate}
        onPaymentRecorded={async (_res, cycle, amt) => {
          if (onSyncLive) await onSyncLive();
          if (onShowToast) onShowToast(`Payment of ৳${amt.toFixed(2)} recorded for ${cycle.id}.`);
        }}
      />

      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultReportType="Payment Collections Report"
        defaultDateRange={localDateFilter}
        filteredSummary={{
          accruedFee: kpiStats.totalCollectedRevenue,
          collectedRevenue: kpiStats.totalCollectedRevenue,
          billsCount: kpiStats.verifiedCount,
          paymentsCount: kpiStats.verifiedCount
        }}
        liveBalanceSummary={{
          outstandingFee: 0,
          currentCycleFee: 0,
          pendingFee: 0,
          overdueFee: 0,
          activeRestaurants: restaurants.filter(r => r.status === 'active').length
        }}
        trendBuckets={[]}
        transactions={filteredTransactions}
        onExported={(fmt) => onShowToast && onShowToast(`Transactions exported (${fmt}).`)}
      />

      <PaymentDetailsModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onStatusUpdated={async (st) => {
          if (onSyncLive) await onSyncLive();
          if (onShowToast) onShowToast(`Payment status updated to ${st}.`);
        }}
      />
    </div>
  );
}
