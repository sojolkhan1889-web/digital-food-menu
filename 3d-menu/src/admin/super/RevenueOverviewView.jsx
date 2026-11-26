import React, { useState, useMemo, useEffect } from 'react';
import {
  Coins,
  Wallet,
  Clock3,
  Store,
  Calendar,
  Hourglass,
  AlertTriangle,
  Info,
  Download,
  Plus,
  BarChart2,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  MoreVertical,
  Eye,
  FileText,
  ExternalLink,
  History,
  CreditCard,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import {
  generateLiveSettlementCycles,
  computeSettlementSummary,
  computeSettlementStatus
} from './digitalBillsStore';
import { fetchDGMBillingLedger } from '../../data/dgmSessionStore';
import { supabase } from '../../lib/supabaseClient';
import {
  getDateRangeBounds,
  isDateInBounds,
  buildPaymentTransactions,
  buildRevenueTrendSeries,
  downloadPaymentReceipt,
  updatePaymentStatusInSupabase
} from './revenueSettlementService';
import {
  RecordPaymentModal,
  ExportReportModal,
  PaymentDetailsModal,
  ActionPortalMenu
} from './RevenueModals';
import './revenueSettlement.css';

export default function RevenueOverviewView({
  restaurants = [],
  orders = [],
  settlements = [],
  feePerBill = 5,
  dateFilter = 'All Time (Live)',
  customDateFrom = '',
  customDateTo = '',
  isSyncing = false,
  fetchError = null,
  onSyncLive,
  onNavigate,
  onOpenDigitalBills,
  onOpenRestaurantDues,
  onShowToast
}) {
  const [billingLedger, setBillingLedger] = useState([]);
  const [granularity, setGranularity] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line'
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Load fine-dine billing ledger so cycles match Digital Bills 100%
  useEffect(() => {
    let mounted = true;
    fetchDGMBillingLedger({ limit: 500 }).then(data => {
      if (mounted && Array.isArray(data)) setBillingLedger(data);
    });
    const channel = supabase
      .channel('realtime_revenue_overview_ledger')
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

  // Close three-dots dropdown on outside click
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
    () => getDateRangeBounds(dateFilter, customDateFrom, customDateTo),
    [dateFilter, customDateFrom, customDateTo]
  );

  // 1. Live Settlement Cycles (Single Source of Truth shared with Digital Bills)
  const cycles = useMemo(() => {
    return generateLiveSettlementCycles({
      restaurants,
      orders,
      billingLedger,
      settlements,
      currentDate: effectiveRefDate
    });
  }, [restaurants, orders, billingLedger, settlements, effectiveRefDate]);

  // 2. Live As-of-Today Settlement Summary (Mutually Exclusive statuses: in_progress, pending, overdue, settled)
  const liveCycleSummary = useMemo(() => {
    return computeSettlementSummary(cycles, effectiveRefDate);
  }, [cycles, effectiveRefDate]);

  // 3. Payment Transactions from live Supabase settlements
  const allTransactions = useMemo(() => {
    return buildPaymentTransactions({ settlements, cycles, restaurants });
  }, [settlements, cycles, restaurants]);

  // 4. Date-Filtered Metrics (Accrued Fee by Bill Date from Single-Source Cycles; Collected Revenue by Payment Date)
  const dateFilteredMetrics = useMemo(() => {
    const allCycleBills = (cycles || []).flatMap(c => c.orders || []);
    const filteredBills = allCycleBills.filter(o => isDateInBounds(o.date || o.createdAt, bounds));
    const accruedFee = filteredBills.reduce((sum, o) => sum + Number(o.fee || feePerBill), 0);

    const filteredVerifiedTxns = allTransactions.filter(
      t => t.status === 'verified' && isDateInBounds(t.paymentDate, bounds)
    );
    const refundedOrReversed = allTransactions
      .filter(t => (t.status === 'refunded' || t.status === 'reversed') && isDateInBounds(t.paymentDate, bounds))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const collectedRevenue = Math.max(
      0,
      filteredVerifiedTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0) - refundedOrReversed
    );

    const filteredRecentTxns = allTransactions
      .filter(t => isDateInBounds(t.paymentDate, bounds))
      .slice(0, 5);

    return {
      accruedFee,
      billsCount: filteredBills.length,
      collectedRevenue,
      verifiedPaymentsCount: filteredVerifiedTxns.length,
      filteredRecentTxns
    };
  }, [cycles, allTransactions, bounds, feePerBill]);

  // 5. Live Balances (Always As of Today — never distorted by Date Filter)
  const liveBalances = useMemo(() => {
    const activeRestaurants = (restaurants || []).filter(r => r.status === 'active').length;
    const allTimeAccrued = liveCycleSummary.totalAccruedFee || (orders.length * feePerBill);
    const allTimeVerifiedCollected = allTransactions
      .filter(t => t.status === 'verified')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Current Cycle Unpaid Fee + Pending Balance + Overdue Balance
    const cycleOutstanding =
      liveCycleSummary.currentCycleFee +
      liveCycleSummary.pendingFee +
      liveCycleSummary.overdueFee;

    const totalOutstanding = Math.max(0, cycleOutstanding || (allTimeAccrued - allTimeVerifiedCollected));

    return {
      activeRestaurants,
      currentCycleFee: liveCycleSummary.currentCycleFee,
      pendingFee: liveCycleSummary.pendingFee,
      pendingCount: liveCycleSummary.pendingCount,
      overdueFee: liveCycleSummary.overdueFee,
      overdueCount: liveCycleSummary.overdueCount,
      totalOutstanding,
      allTimeAccrued,
      allTimeCollected: allTimeVerifiedCollected
    };
  }, [restaurants, liveCycleSummary, orders.length, feePerBill, allTransactions]);

  // 6. Trend Series (Daily, Weekly, Monthly)
  const trendData = useMemo(() => {
    return buildRevenueTrendSeries({
      orders,
      transactions: allTransactions,
      feePerBill,
      granularity,
      bounds
    });
  }, [orders, allTransactions, feePerBill, granularity, bounds]);

  // 7. Donut Breakdown (All-Time Collection Breakdown As of Today)
  const donutMetrics = useMemo(() => {
    const total = liveBalances.allTimeAccrued;
    const collected = Math.min(total, liveBalances.allTimeCollected);
    const outstanding = Math.max(0, total - collected);
    const collectedPct = total > 0 ? Math.round((collected / total) * 100) : 0;
    const outstandingPct = total > 0 ? Math.max(0, 100 - collectedPct) : 0;

    const r = 56;
    const circ = 2 * Math.PI * r;
    const greenLen = total > 0 ? (collected / total) * circ : 0;
    const orangeLen = total > 0 ? (outstanding / total) * circ : 0;

    return {
      total,
      collected,
      outstanding,
      collectedPct,
      outstandingPct,
      circ,
      greenLen,
      orangeLen
    };
  }, [liveBalances]);

  const showInitialSkeleton = isSyncing && orders.length === 0;

  // Chart SVG Dimensions
  const chartW = 680;
  const chartH = 225;
  const padL = 42;
  const padR = 16;
  const padT = 22;
  const padB = 34;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const rawMax = Math.max(15, ...trendData.buckets.map(b => Math.max(b.accrued, b.collected)));
  const maxVal = Math.ceil(rawMax / 15) * 15;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

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
      {/* Non-destructive Fetch Error Banner */}
      {fetchError && (
        <div className="rs-error-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={17} />
            <span>{fetchError} (Showing last synced live figures.)</span>
          </div>
          {onSyncLive && (
            <button type="button" className="rs-btn rs-btn-outline rs-btn-sm" onClick={onSyncLive}>
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* 1. Revenue Overview Banner */}
      <section className="rs-banner">
        <div className="rs-banner-left">
          <div className="rs-banner-icon">
            <Coins size={24} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="rs-banner-title">Revenue Overview</h2>
            <p className="rs-banner-sub">
              A complete view of your platform&apos;s earnings, collections, and outstanding dues.
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

      {/* 2. KPI Cards — Row 1 (4 Cards) */}
      <section className="rs-kpi-row-4">
        {/* Card 01 — Total Accrued Fee */}
        <div
          className="rs-kpi-card tint-orange"
          onClick={() => onOpenDigitalBills && onOpenDigitalBills('all')}
          title="Open Digital Bills"
        >
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><Coins size={18} /></div>
              <span className="rs-kpi-title">Total Accrued Fee</span>
            </div>
            <span className="rs-info-wrap" onClick={e => e.stopPropagation()} tabIndex={0}>
              <Info size={14} />
              <span className="rs-tooltip">
                Total platform fees generated from all eligible digital bills, including paid and unpaid fees.
              </span>
            </span>
          </div>
          {showInitialSkeleton ? (
            <div className="rs-skeleton-line" />
          ) : (
            <div className="rs-kpi-val">৳{dateFilteredMetrics.accruedFee.toLocaleString()}</div>
          )}
          <div className="rs-kpi-sub">
            {dateFilteredMetrics.billsCount} verified bill{dateFilteredMetrics.billsCount === 1 ? '' : 's'} × ৳{feePerBill}
          </div>
        </div>

        {/* Card 02 — Total Revenue Collected */}
        <div
          className="rs-kpi-card tint-green"
          onClick={() => onNavigate && onNavigate('Payment Transactions')}
          title="Open Payment Transactions"
        >
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><Wallet size={18} /></div>
              <span className="rs-kpi-title">Total Revenue Collected</span>
            </div>
            <span className="rs-info-wrap" onClick={e => e.stopPropagation()} tabIndex={0}>
              <Info size={14} />
              <span className="rs-tooltip">
                Total verified payments received from restaurants, net of refunds and reversals.
              </span>
            </span>
          </div>
          {showInitialSkeleton ? (
            <div className="rs-skeleton-line" />
          ) : (
            <div className="rs-kpi-val">৳{dateFilteredMetrics.collectedRevenue.toLocaleString()}</div>
          )}
          <div className="rs-kpi-sub">
            {dateFilteredMetrics.verifiedPaymentsCount} verified payment{dateFilteredMetrics.verifiedPaymentsCount === 1 ? '' : 's'}
          </div>
        </div>

        {/* Card 03 — Total Outstanding Fee */}
        <div
          className="rs-kpi-card tint-amber"
          onClick={() => onOpenRestaurantDues && onOpenRestaurantDues('all')}
          title="Open Restaurant Dues"
        >
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><Clock3 size={18} /></div>
              <span className="rs-kpi-title">Total Outstanding Fee</span>
            </div>
            <span className="rs-info-wrap" onClick={e => e.stopPropagation()} tabIndex={0}>
              <Info size={14} />
              <span className="rs-tooltip">
                Total unpaid platform fees, including active, pending, and overdue settlement balances.
              </span>
            </span>
          </div>
          {showInitialSkeleton ? (
            <div className="rs-skeleton-line" />
          ) : (
            <div className="rs-kpi-val">৳{liveBalances.totalOutstanding.toLocaleString()}</div>
          )}
          <div className="rs-kpi-sub">All unpaid platform fees · As of Today</div>
        </div>

        {/* Card 04 — Active Restaurants */}
        <div
          className="rs-kpi-card tint-purple"
          onClick={() => onNavigate && onNavigate('All Restaurants')}
          title="View Active Restaurants"
        >
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><Store size={18} /></div>
              <span className="rs-kpi-title">Active Restaurants</span>
            </div>
            <span className="rs-info-wrap" onClick={e => e.stopPropagation()} tabIndex={0}>
              <Info size={14} />
              <span className="rs-tooltip">
                Count of active restaurants registered on the platform (suspended restaurant dues still count in financial cards).
              </span>
            </span>
          </div>
          {showInitialSkeleton ? (
            <div className="rs-skeleton-line" />
          ) : (
            <div className="rs-kpi-val">{liveBalances.activeRestaurants}</div>
          )}
          <div className="rs-kpi-sub">Active on platform · As of Today</div>
        </div>
      </section>

      {/* 3. KPI Cards — Row 2 (3 Cards, Live Balances As of Today) */}
      <section className="rs-kpi-row-3">
        {/* Card 05 — Current Cycle Fee */}
        <div
          className="rs-kpi-card tint-blue"
          onClick={() => onOpenDigitalBills && onOpenDigitalBills('in_progress')}
          title="View In Progress Cycles in Digital Bills"
        >
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><Calendar size={18} /></div>
              <span className="rs-kpi-title">Current Cycle Fee</span>
            </div>
            <span className="rs-info-wrap" onClick={e => e.stopPropagation()} tabIndex={0}>
              <Info size={14} />
              <span className="rs-tooltip">
                Platform fees generated during currently active settlement cycles, not yet payable.
              </span>
            </span>
          </div>
          <div className="rs-kpi-val">৳{liveBalances.currentCycleFee.toLocaleString()}</div>
          <div className="rs-kpi-sub">In Progress · As of Today</div>
        </div>

        {/* Card 06 — Pending Settlement */}
        <div
          className="rs-kpi-card tint-amber"
          onClick={() => onOpenRestaurantDues && onOpenRestaurantDues('pending')}
          title="View Pending Dues"
        >
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><Hourglass size={18} /></div>
              <span className="rs-kpi-title">Pending Settlement</span>
            </div>
            <span className="rs-info-wrap" onClick={e => e.stopPropagation()} tabIndex={0}>
              <Info size={14} />
              <span className="rs-tooltip">
                Unpaid settlement balances currently within the payment grace period.
              </span>
            </span>
          </div>
          <div className="rs-kpi-val">৳{liveBalances.pendingFee.toLocaleString()}</div>
          <div className="rs-kpi-sub">
            {liveBalances.pendingCount > 0
              ? `${liveBalances.pendingCount} pending cycle${liveBalances.pendingCount === 1 ? '' : 's'} · As of Today`
              : 'Within grace period · As of Today'}
          </div>
        </div>

        {/* Card 07 — Overdue Settlement */}
        <div
          className="rs-kpi-card tint-red"
          onClick={() => onOpenRestaurantDues && onOpenRestaurantDues('overdue')}
          title="View Overdue Dues"
        >
          <div className="rs-kpi-head">
            <div className="rs-kpi-head-left">
              <div className="rs-kpi-icon"><AlertTriangle size={18} /></div>
              <span className="rs-kpi-title">Overdue Settlement</span>
            </div>
            <span className="rs-info-wrap" onClick={e => e.stopPropagation()} tabIndex={0}>
              <Info size={14} />
              <span className="rs-tooltip">
                Unpaid settlement balances that have exceeded their payment deadline.
              </span>
            </span>
          </div>
          <div className="rs-kpi-val">৳{liveBalances.overdueFee.toLocaleString()}</div>
          <div className="rs-kpi-sub">
            {liveBalances.overdueCount > 0
              ? `${liveBalances.overdueCount} overdue cycle${liveBalances.overdueCount === 1 ? '' : 's'} · As of Today`
              : 'No overdue balances · As of Today'}
          </div>
        </div>
      </section>

      {/* 4. Analytics Row: Trend Chart + Revenue Breakdown Donut */}
      <section className="rs-analytics-grid">
        {/* Left: Revenue & Collection Trend */}
        <div className="rs-card">
          <div className="rs-card-head">
            <div>
              <h3 className="rs-card-title">Revenue &amp; Collection Trend</h3>
              <div className="rs-card-sub">
                Accrued fees mapped by bill creation date; collected revenue mapped by payment date.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="rs-segmented">
                {['daily', 'weekly', 'monthly'].map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`rs-seg-btn ${granularity === g ? 'active' : ''}`}
                    onClick={() => setGranularity(g)}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="rs-chart-toggle-btn"
                onClick={() => setChartType(t => (t === 'bar' ? 'line' : 'bar'))}
                title={`Switch to ${chartType === 'bar' ? 'Line' : 'Bar'} Chart`}
              >
                {chartType === 'bar' ? <TrendingUp size={16} /> : <BarChart2 size={16} />}
              </button>
            </div>
          </div>

          <div className="rs-chart-legend">
            <span><i className="rs-dot" style={{ background: '#F97316' }} />Accrued Fee (৳)</span>
            <span><i className="rs-dot" style={{ background: '#16A34A' }} />Collected Revenue (৳)</span>
          </div>

          <div className="rs-trend-svg-wrap" onMouseLeave={() => setHoveredIdx(null)}>
            {hoveredIdx !== null && trendData.buckets[hoveredIdx] && (
              <div className="rs-chart-tooltip">
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {trendData.buckets[hoveredIdx].fullDateLabel || trendData.buckets[hoveredIdx].label}
                </div>
                <div style={{ color: '#FDBA74' }}>
                  Accrued Fee: <strong>৳{trendData.buckets[hoveredIdx].accrued.toLocaleString()}</strong>
                </div>
                <div style={{ color: '#86EFAC' }}>
                  Collected: <strong>৳{trendData.buckets[hoveredIdx].collected.toLocaleString()}</strong>
                </div>
              </div>
            )}

            {trendData.buckets.length === 0 ? (
              <div className="rs-empty-state">No trend data available for selected date range.</div>
            ) : (
              <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" height="225" style={{ overflow: 'visible' }}>
                {/* Y Grid Lines */}
                {yTicks.map((val, idx) => {
                  const y = padT + plotH - (val / maxVal) * plotH;
                  return (
                    <g key={idx}>
                      <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                      <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#64748B">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {chartType === 'bar' ? (
                  trendData.buckets.map((b, idx) => {
                    const count = trendData.buckets.length;
                    const slotW = plotW / Math.max(1, count);
                    const barW = Math.min(18, Math.max(6, slotW * 0.28));
                    const cx = padL + idx * slotW + slotW / 2;

                    const accH = (b.accrued / maxVal) * plotH;
                    const colH = (b.collected / maxVal) * plotH;
                    const hasBoth = b.accrued > 0 && b.collected > 0;
                    const accX = hasBoth ? cx - barW - 1 : cx - barW / 2;
                    const colX = hasBoth ? cx + 1 : cx - barW / 2;

                    return (
                      <g key={b.key} onMouseEnter={() => setHoveredIdx(idx)} style={{ cursor: 'pointer' }}>
                        {/* Hover hit area */}
                        <rect x={padL + idx * slotW} y={padT} width={slotW} height={plotH} fill="transparent" />

                        {b.accrued > 0 && (
                          <>
                            <rect
                              x={accX}
                              y={padT + plotH - accH}
                              width={barW}
                              height={Math.max(4, accH)}
                              rx={4}
                              fill="#F97316"
                            />
                            <text
                              x={accX + barW / 2}
                              y={padT + plotH - accH - 5}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="600"
                              fill="#EA580C"
                            >
                              ৳{b.accrued}
                            </text>
                          </>
                        )}

                        {b.collected > 0 && (
                          <>
                            <rect
                              x={colX}
                              y={padT + plotH - colH}
                              width={barW}
                              height={Math.max(4, colH)}
                              rx={4}
                              fill="#16A34A"
                            />
                            <text
                              x={colX + barW / 2}
                              y={padT + plotH - colH - 5}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="600"
                              fill="#15803D"
                            >
                              ৳{b.collected}
                            </text>
                          </>
                        )}

                        {(count <= 15 || idx % Math.ceil(count / 10) === 0 || idx === count - 1) && (
                          <text
                            x={cx}
                            y={chartH - 10}
                            textAnchor="middle"
                            fontSize="10.5"
                            fill="#64748B"
                          >
                            {b.label}
                          </text>
                        )}
                      </g>
                    );
                  })
                ) : (
                  /* Line Chart View */
                  (() => {
                    const count = trendData.buckets.length;
                    const pts = trendData.buckets.map((b, idx) => {
                      const x = count === 1 ? padL + plotW / 2 : padL + (idx / (count - 1)) * plotW;
                      const yAcc = padT + plotH - (b.accrued / maxVal) * plotH;
                      const yCol = padT + plotH - (b.collected / maxVal) * plotH;
                      return { x, yAcc, yCol, b, idx };
                    });
                    const accPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.yAcc}`).join(' ');
                    const colPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.yCol}`).join(' ');

                    return (
                      <g>
                        <path d={accPath} fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinejoin="round" />
                        <path d={colPath} fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinejoin="round" />
                        {pts.map(p => (
                          <g key={p.b.key} onMouseEnter={() => setHoveredIdx(p.idx)} style={{ cursor: 'pointer' }}>
                            <circle cx={p.x} cy={p.yAcc} r="4.5" fill="#F97316" stroke="#fff" strokeWidth="1.5" />
                            <circle cx={p.x} cy={p.yCol} r="4.5" fill="#16A34A" stroke="#fff" strokeWidth="1.5" />
                            {(count <= 15 || p.idx % Math.ceil(count / 10) === 0 || p.idx === count - 1) && (
                              <text x={p.x} y={chartH - 10} textAnchor="middle" fontSize="10.5" fill="#64748B">
                                {p.b.label}
                              </text>
                            )}
                          </g>
                        ))}
                      </g>
                    );
                  })()
                )}
              </svg>
            )}
          </div>

          <div className="rs-trend-footer">
            <div className="rs-trend-foot-item">
              <div className="rs-kpi-icon" style={{ background: '#FFEDD5', color: '#EA580C' }}><Coins size={16} /></div>
              <div>
                <div style={{ fontSize: 11.5, color: '#64748B' }}>Accrued Fee (Total)</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                  ৳{trendData.totalAccrued.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="rs-trend-foot-item">
              <div className="rs-kpi-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}><Wallet size={16} /></div>
              <div>
                <div style={{ fontSize: 11.5, color: '#64748B' }}>Collected Revenue (Total)</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#16A34A' }}>
                  ৳{trendData.totalCollected.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Revenue Breakdown Donut (All-time As of Today) */}
        <div className="rs-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 className="rs-card-title">Revenue Breakdown</h3>
            <div className="rs-card-sub">All-time · As of Today</div>
          </div>

          {donutMetrics.total === 0 ? (
            <div className="rs-empty-state">
              <div className="rs-donut-pct" style={{ fontSize: 22, marginBottom: 6 }}>0%</div>
              <div>No revenue data available</div>
            </div>
          ) : (
            <div className="rs-donut-layout">
              <div className="rs-donut-svg-box">
                <svg viewBox="0 0 148 148" width="148" height="148" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="74" cy="74" r="56" fill="none" stroke="#F1F5F9" strokeWidth="18" />
                  <circle
                    cx="74"
                    cy="74"
                    r="56"
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="18"
                    strokeDasharray={`${donutMetrics.greenLen} ${donutMetrics.circ}`}
                    strokeDashoffset="0"
                  />
                  <circle
                    cx="74"
                    cy="74"
                    r="56"
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="18"
                    strokeDasharray={`${donutMetrics.orangeLen} ${donutMetrics.circ}`}
                    strokeDashoffset={-donutMetrics.greenLen}
                  />
                </svg>
                <div className="rs-donut-center">
                  <span className="rs-donut-pct">{donutMetrics.collectedPct}%</span>
                  <span className="rs-donut-lbl">Collected</span>
                </div>
              </div>

              <div className="rs-donut-legend">
                <div className="rs-donut-row">
                  <span><i className="rs-dot" style={{ background: '#16A34A' }} />Collected Revenue</span>
                  <strong>৳{donutMetrics.collected.toLocaleString()} <small style={{ color: '#64748B' }}>{donutMetrics.collectedPct}%</small></strong>
                </div>
                <div className="rs-donut-row">
                  <span><i className="rs-dot" style={{ background: '#F97316' }} />Outstanding Fee</span>
                  <strong>৳{donutMetrics.outstanding.toLocaleString()} <small style={{ color: '#64748B' }}>{donutMetrics.outstandingPct}%</small></strong>
                </div>
                <div className="rs-donut-row rs-donut-divider">
                  <span>Total Accrued Fee</span>
                  <strong>৳{donutMetrics.total.toLocaleString()} <small style={{ color: '#64748B' }}>100%</small></strong>
                </div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 11.5, color: '#64748B', borderTop: '1px solid #EEF2F7', paddingTop: 10 }}>
            Collection Rate = (Collected Fee ÷ Accrued Fee) × 100
          </div>
        </div>
      </section>

      {/* 5. Recent Payment Transactions (Latest 5, 8 columns) */}
      <section className="rs-card">
        <div className="rs-card-head">
          <div>
            <h3 className="rs-card-title">Recent Payment Transactions</h3>
            <div className="rs-card-sub">
              Showing latest {dateFilteredMetrics.filteredRecentTxns.length} payment record(s) ({bounds.label}).
            </div>
          </div>
          <button
            type="button"
            className="rs-btn rs-btn-outline rs-btn-sm"
            style={{ color: '#F97316', borderColor: '#FED7AA' }}
            onClick={() => onNavigate && onNavigate('Payment Transactions')}
          >
            <span>View All Transactions</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="rs-table-wrap">
          {dateFilteredMetrics.filteredRecentTxns.length === 0 ? (
            <div className="rs-empty-state">No payment transactions found for the selected filter.</div>
          ) : (
            <table className="rs-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Restaurant</th>
                  <th>Settlement Period</th>
                  <th>Payment Date &amp; Time</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {dateFilteredMetrics.filteredRecentTxns.map(txn => (
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
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <CreditCard size={13} color="#64748B" />
                        {txn.method}
                      </span>
                    </td>
                    <td><strong style={{ color: '#16A34A' }}>৳{txn.amount.toLocaleString()}</strong></td>
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
                        <ActionPortalMenu
                          isOpen={openMenuId === txn.id}
                          onToggle={() => setOpenMenuId(openMenuId === txn.id ? null : txn.id)}
                          onClose={() => setOpenMenuId(null)}
                        >
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
                                onClick={() => { setSelectedTransaction(txn); setOpenMenuId(null); }}
                              >
                                <CheckCircle2 size={14} /> Verify &amp; Confirm
                              </button>
                              <button
                                type="button"
                                className="rs-menu-item danger"
                                onClick={() => { setSelectedTransaction(txn); setOpenMenuId(null); }}
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
                        </ActionPortalMenu>
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
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        restaurants={restaurants}
        cycles={cycles}
        effectiveRefDate={effectiveRefDate}
        onPaymentRecorded={async (_res, cycle, amt) => {
          if (onSyncLive) await onSyncLive();
          if (onShowToast) onShowToast(`Verified payment of ৳${amt.toFixed(2)} recorded for ${cycle.id}.`);
        }}
      />

      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultReportType="Complete Revenue Report"
        defaultDateRange={dateFilter}
        filteredSummary={{
          accruedFee: dateFilteredMetrics.accruedFee,
          collectedRevenue: dateFilteredMetrics.collectedRevenue,
          billsCount: dateFilteredMetrics.billsCount,
          paymentsCount: dateFilteredMetrics.verifiedPaymentsCount
        }}
        liveBalanceSummary={{
          outstandingFee: liveBalances.totalOutstanding,
          currentCycleFee: liveBalances.currentCycleFee,
          pendingFee: liveBalances.pendingFee,
          overdueFee: liveBalances.overdueFee,
          activeRestaurants: liveBalances.activeRestaurants
        }}
        trendBuckets={trendData.buckets}
        transactions={allTransactions.filter(t => isDateInBounds(t.paymentDate, bounds))}
        onExported={(fmt) => onShowToast && onShowToast(`Revenue Report exported (${fmt}).`)}
      />

      <PaymentDetailsModal
        transaction={selectedTransaction}
        hasOtherUnpaidCycles={Boolean(selectedTransaction && cycles.some(c =>
          c.restaurantId === selectedTransaction.restaurantId &&
          c.id !== selectedTransaction.primaryCycleId &&
          Math.max(0, Number(c.accruedFee || 0) - Number(c.paidAmount || 0)) > 0 &&
          ['pending', 'overdue'].includes(computeSettlementStatus(c, effectiveRefDate))
        ))}
        onClose={() => setSelectedTransaction(null)}
        onStatusUpdated={async (st) => {
          if (onSyncLive) await onSyncLive();
          if (onShowToast) onShowToast(`Payment updated to ${st}.`);
        }}
      />
    </div>
  );
}
