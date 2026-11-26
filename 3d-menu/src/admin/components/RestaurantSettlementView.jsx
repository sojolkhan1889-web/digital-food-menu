import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Calendar,
  Coins,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Search,
  Eye,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  Receipt,
  FileText,
  Info,
  RotateCcw
} from 'lucide-react';
import { formatDhakaDate, formatDhakaDateTime } from '../super/revenueSettlementService';

const formatCurrency = (val) => `৳${Number(val || 0).toFixed(2)}`;

const getStatusBadgeConfig = (cycle) => {
  if (cycle.displayStatus === 'payment_submitted') {
    return {
      label: 'Payment Submitted',
      sub: 'Awaiting verification',
      bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60'
    };
  }
  if (cycle.displayStatus === 'payment_rejected') {
    return {
      label: 'Payment Rejected',
      sub: 'Resubmit required',
      bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60'
    };
  }
  switch (cycle.status) {
    case 'in_progress':
      return {
        label: 'In Progress',
        sub: null,
        bg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60'
      };
    case 'pending':
      return {
        label: 'Pending',
        sub: `${cycle.graceDaysRemaining}d left`,
        bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
      };
    case 'overdue':
      return {
        label: 'Overdue',
        sub: `${cycle.daysOverdue} day${cycle.daysOverdue === 1 ? '' : 's'} overdue`,
        bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60'
      };
    case 'settled':
      return {
        label: 'Settled',
        sub: cycle.paidLate ? 'Paid Late' : null,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
      };
    default:
      return {
        label: String(cycle.status || 'Unknown'),
        sub: null,
        bg: 'bg-slate-100 text-slate-700 border-slate-200'
      };
  }
};

const getPaymentStatusBadge = (status) => {
  switch (status) {
    case 'verified':
      return {
        label: 'Verified',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
      };
    case 'pending_verification':
      return {
        label: 'Pending Verification',
        cls: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
      };
    case 'rejected':
      return {
        label: 'Rejected',
        cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60'
      };
    case 'reversed':
      return {
        label: 'Reversed',
        cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
      };
    default:
      return {
        label: String(status || 'Unknown'),
        cls: 'bg-slate-100 text-slate-700 border-slate-200'
      };
  }
};

export default function RestaurantSettlementView({
  isDark = false,
  restaurantName = 'Restaurant',
  settlementLifecycle,
  onOpenSettleModal,
  onRefresh
}) {
  const [activeSubTab, setActiveSubTab] = useState('settlements'); // 'settlements' | 'payments'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [detailsCycle, setDetailsCycle] = useState(null);
  const [detailsPayment, setDetailsPayment] = useState(null);

  const pageSize = 8;

  const {
    allCycles = [],
    txns = [],
    currentCycle = null,
    totalAccruedFee = 0,
    currentCycleFee = 0,
    totalPayableDue = 0,
    pendingTotal = 0,
    overdueTotal = 0,
    pendingCycles = [],
    overdueCycles = [],
    totalSettledAmount = 0,
    reminderMode = 'none',
    maxDaysOverdue = 0,
    graceDaysRemaining = 3,
    primaryCycle = null,
    pendingVerificationTotal = 0,
    anyRejected = null
  } = settlementLifecycle || {};

  const handleRefreshClick = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 350);
    }
  };

  // Filtered Settlement History
  const filteredCycles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCycles.filter((c) => {
      if (q) {
        const matchId = String(c.id || '').toLowerCase().includes(q);
        const matchPeriod = String(c.periodLabel || '').toLowerCase().includes(q);
        if (!matchId && !matchPeriod) return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'payment_submitted' || statusFilter === 'payment_rejected') {
          if (c.displayStatus !== statusFilter) return false;
        } else if (c.status !== statusFilter) {
          return false;
        }
      }
      if (periodFilter === 'current' && c.status !== 'in_progress') return false;
      if (periodFilter === 'past' && c.status === 'in_progress') return false;
      return true;
    });
  }, [allCycles, searchQuery, statusFilter, periodFilter]);

  // Filtered Payment History
  const filteredTxns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return txns.filter((t) => {
      if (q) {
        const matchPayId = String(t.paymentId || '').toLowerCase().includes(q);
        const matchTrx = String(t.transactionRef || '').toLowerCase().includes(q);
        const matchPeriod = String(t.settlementPeriod || '').toLowerCase().includes(q);
        if (!matchPayId && !matchTrx && !matchPeriod) return false;
      }
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [txns, searchQuery, statusFilter]);

  const activeRows = activeSubTab === 'settlements' ? filteredCycles : filteredTxns;
  const totalPages = Math.max(1, Math.ceil(activeRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = activeRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportStatement = () => {
    const headers = [
      'Settlement ID',
      'Settlement Period',
      'Total Bills',
      'Accrued Fee (BDT)',
      'Paid Amount (BDT)',
      'Remaining Balance (BDT)',
      'Due Date',
      'Status',
      'Settled On'
    ];
    const rows = allCycles.map((c) => [
      c.id,
      c.periodLabel,
      c.totalOrders,
      Number(c.accruedFee || 0).toFixed(2),
      Number(c.paidAmount || 0).toFixed(2),
      Number(c.remainingDue || 0).toFixed(2),
      formatDhakaDate(c.paymentDueDate),
      c.paidLate ? `${c.status} (Paid Late)` : c.status,
      c.settledAt ? formatDhakaDate(c.settledAt) : '-'
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${restaurantName.replace(/\s+/g, '_')}_Settlement_Statement.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReceipt = (item, type = 'cycle') => {
    const lines =
      type === 'payment'
        ? [
            'PHONEMENU PLATFORM FEE PAYMENT RECEIPT',
            '======================================',
            `Restaurant: ${restaurantName}`,
            `Payment ID: ${item.paymentId}`,
            `Settlement Period: ${item.settlementPeriod}`,
            `Payment Date & Time: ${formatDhakaDateTime(item.paymentDate)}`,
            `Payment Method: ${item.paymentMethod}`,
            `Transaction ID: ${item.transactionRef || '-'}`,
            `Paid Amount: ${formatCurrency(item.amount)}`,
            `Status: ${String(item.status || '').toUpperCase()}`,
            item.notes ? `Notes: ${item.notes}` : ''
          ]
        : [
            'PHONEMENU PLATFORM FEE SETTLEMENT RECEIPT',
            '=========================================',
            `Restaurant: ${restaurantName}`,
            `Settlement ID: ${item.id}`,
            `Settlement Period: ${item.periodLabel}`,
            `Total Bills: ${item.totalOrders}`,
            `Accrued Fee: ${formatCurrency(item.accruedFee)}`,
            `Paid Amount: ${formatCurrency(item.paidAmount)}`,
            `Remaining Balance: ${formatCurrency(item.remainingDue)}`,
            `Due Date: ${formatDhakaDate(item.paymentDueDate)}`,
            `Status: ${String(item.status || '').toUpperCase()}${item.paidLate ? ' (PAID LATE)' : ''}`,
            `Settled On: ${item.settledAt ? formatDhakaDate(item.settledAt) : '-'}`
          ];

    const blob = new Blob([lines.filter(Boolean).join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${type === 'payment' ? item.paymentId : item.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const surfaceCard = isDark
    ? 'bg-[#111827] border-slate-800 text-slate-100'
    : 'bg-white border-slate-200/80 text-slate-900';

  const subtleText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-5">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
            Weekly Platform Fee Settlement
          </h2>
          <p className={`text-xs sm:text-sm ${subtleText}`}>
            7-day settlement cycles with a 3-day payment grace period · ৳5 per verified DGM order
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefreshClick}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportStatement}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Statement</span>
          </button>

          {totalPayableDue > 0 && (
            <button
              type="button"
              onClick={() => onOpenSettleModal && onOpenSettleModal(primaryCycle?.id || '')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>Settle Due</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 KPI Cards (3x2 on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Total Accrued Fee */}
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs ${surfaceCard}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-semibold ${subtleText}`}>Total Accrued Fee</div>
              <div className="text-2xl font-extrabold tracking-tight mt-0.5">{formatCurrency(totalAccruedFee)}</div>
              <div className={`text-[11px] mt-0.5 ${subtleText}`}>All-time platform fees</div>
            </div>
          </div>
        </div>

        {/* 2. Current Cycle Fee */}
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs ${surfaceCard}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-semibold ${subtleText}`}>Current Cycle Fee</div>
              <div className="text-2xl font-extrabold tracking-tight text-sky-600 dark:text-sky-400 mt-0.5">
                {formatCurrency(currentCycleFee)}
              </div>
              <div className={`text-[11px] mt-0.5 truncate ${subtleText}`}>
                {currentCycle?.periodLabel ? `${currentCycle.periodLabel} · Not yet payable` : 'Active 7-day cycle'}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Total Payable Due */}
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs ${surfaceCard}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-semibold ${subtleText}`}>Total Payable Due</div>
              <div className={`text-2xl font-extrabold tracking-tight mt-0.5 ${totalPayableDue > 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                {formatCurrency(totalPayableDue)}
              </div>
              <div className={`text-[11px] mt-0.5 ${subtleText}`}>Pending + overdue balances</div>
            </div>
          </div>
        </div>

        {/* 4. Pending Settlement */}
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs ${surfaceCard}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-semibold ${subtleText}`}>Pending Settlement</div>
              <div className="text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 mt-0.5">
                {formatCurrency(pendingTotal)}
              </div>
              <div className={`text-[11px] mt-0.5 ${subtleText}`}>
                {pendingCycles.length} pending settlement{pendingCycles.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Overdue Settlement */}
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs ${surfaceCard}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-semibold ${subtleText}`}>Overdue Settlement</div>
              <div className={`text-2xl font-extrabold tracking-tight mt-0.5 ${overdueTotal > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                {formatCurrency(overdueTotal)}
              </div>
              <div className={`text-[11px] mt-0.5 ${subtleText}`}>
                {overdueCycles.length} overdue settlement{overdueCycles.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        {/* 6. Total Settled */}
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs ${surfaceCard}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-semibold ${subtleText}`}>Total Settled</div>
              <div className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(totalSettledAmount)}
              </div>
              <div className={`text-[11px] mt-0.5 ${subtleText}`}>Verified settlement payments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual Reminder Banner (Matches Restaurant Panel Banner Design) */}
      {reminderMode === 'overdue' && (
        <div className="px-4 sm:px-6 py-3.5 rounded-[12px] bg-gradient-to-r from-[#C81E1E] via-[#B91C1C] to-[#991B1B] text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-[10px] bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-[18px] font-extrabold tracking-tight leading-snug">
                Platform fee payment overdue
              </div>
              <div className="text-xs sm:text-[13px] text-red-100 mt-0.5 flex items-center flex-wrap gap-2">
                <span>Due {formatDhakaDate(primaryCycle?.paymentDueDate)} ·</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                  {maxDaysOverdue} day{maxDaysOverdue === 1 ? '' : 's'} overdue
                </span>
              </div>
              {anyRejected && (
                <div className="mt-1 text-[11.5px] font-semibold text-amber-200">
                  Previous submission rejected ({anyRejected.transactionRef}): {anyRejected.rejectionReason}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-5 sm:gap-6 shrink-0">
            <div className="hidden lg:block h-10 w-px bg-white/25" />
            <div>
              <div className="text-[11px] font-semibold text-red-100">Outstanding amount</div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono leading-tight">
                {formatCurrency(overdueTotal)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenSettleModal && onOpenSettleModal(primaryCycle?.id || '')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-white hover:bg-slate-100 text-[#0F172A] text-xs sm:text-sm font-bold shadow-sm cursor-pointer transition-colors shrink-0"
            >
              <span>Settle Due</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {reminderMode === 'pending' && (
        <div className="px-4 sm:px-6 py-3.5 rounded-[12px] bg-gradient-to-r from-[#FACC15] via-[#FBBF24] to-[#F59E0B] text-[#0F172A] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-[10px] bg-black/10 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-[#0F172A]" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-[18px] font-extrabold tracking-tight leading-snug text-[#0F172A]">
                Platform fee payment pending
              </div>
              <div className="text-xs sm:text-[13px] text-[#0F172A]/85 mt-0.5 flex items-center flex-wrap gap-2">
                <span>Please settle your platform fee within 3 days.</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#0F172A]/45 bg-black/5 text-[#0F172A] text-[11px] font-bold">
                  {graceDaysRemaining} day{graceDaysRemaining === 1 ? '' : 's'} remaining
                </span>
              </div>
              {anyRejected && (
                <div className="mt-1 text-[11.5px] font-bold text-[#991B1B]">
                  Previous submission rejected ({anyRejected.transactionRef}): {anyRejected.rejectionReason}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-5 sm:gap-6 shrink-0">
            <div className="hidden lg:block h-10 w-px bg-black/15" />
            <div>
              <div className="text-[11px] font-semibold text-[#0F172A]/80">Outstanding amount</div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono leading-tight text-[#0F172A]">
                {formatCurrency(pendingTotal)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenSettleModal && onOpenSettleModal(primaryCycle?.id || '')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#0B1324] hover:bg-[#17233D] text-white text-xs sm:text-sm font-bold shadow-sm cursor-pointer transition-colors shrink-0"
            >
              <span>Settle Due</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {reminderMode === 'verification_pending' && (
        <div className="px-4 sm:px-6 py-3.5 rounded-[12px] bg-gradient-to-r from-[#1D63D0] via-[#1351B4] to-[#0B3C91] text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-[10px] bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-[18px] font-extrabold tracking-tight leading-snug">
                Thank you for submitting your payment!
              </div>
              <div className="text-xs sm:text-[13px] text-blue-100 mt-0.5 flex items-center flex-wrap gap-2">
                <span>We are verifying your transaction.</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 text-white text-[11px] font-bold">
                  Awaiting verification
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-5 sm:gap-6 shrink-0">
            <div className="hidden lg:block h-10 w-px bg-white/25" />
            <div>
              <div className="text-[11px] font-semibold text-blue-100">Submitted amount</div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono leading-tight">
                {formatCurrency(pendingVerificationTotal)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('payments');
                setStatusFilter('all');
                setPage(1);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-white hover:bg-slate-100 text-[#0F172A] text-xs sm:text-sm font-bold shadow-sm cursor-pointer transition-colors shrink-0"
            >
              <span>View submission</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs + Table Card */}
      <div className={`rounded-2xl border shadow-xs overflow-hidden ${surfaceCard}`}>
        {/* Sub-Tabs */}
        <div className={`flex items-center gap-6 px-5 pt-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('settlements');
              setStatusFilter('all');
              setSearchQuery('');
              setPage(1);
            }}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'settlements'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : `border-transparent ${subtleText} hover:text-slate-700 dark:hover:text-slate-200`
            }`}
          >
            Settlement History ({allCycles.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('payments');
              setStatusFilter('all');
              setSearchQuery('');
              setPage(1);
            }}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'payments'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : `border-transparent ${subtleText} hover:text-slate-700 dark:hover:text-slate-200`
            }`}
          >
            Payment History ({txns.length})
          </button>
        </div>

        {/* Filters Row */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${subtleText}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={
                activeSubTab === 'settlements'
                  ? 'Search settlement ID or period...'
                  : 'Search payment ID, TrxID, or period...'
              }
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs sm:text-sm outline-none focus:ring-2 focus:ring-orange-500/30 ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={`px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold outline-none cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="all">All Status</option>
              {activeSubTab === 'settlements' ? (
                <>
                  <option value="in_progress">In Progress</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="settled">Settled</option>
                  <option value="payment_submitted">Payment Submitted</option>
                  <option value="payment_rejected">Payment Rejected</option>
                </>
              ) : (
                <>
                  <option value="pending_verification">Pending Verification</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </>
              )}
            </select>

            {activeSubTab === 'settlements' && (
              <select
                value={periodFilter}
                onChange={(e) => {
                  setPeriodFilter(e.target.value);
                  setPage(1);
                }}
                className={`px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold outline-none cursor-pointer ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <option value="all">All Periods</option>
                <option value="current">Current Cycle</option>
                <option value="past">Past Cycles</option>
              </select>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {activeSubTab === 'settlements' ? (
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead>
                <tr className={`border-y text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-3 px-4">Settlement ID</th>
                  <th className="py-3 px-4">Settlement Period</th>
                  <th className="py-3 px-4 text-center">Total Bills</th>
                  <th className="py-3 px-4">Accrued Fee</th>
                  <th className="py-3 px-4">Paid Amount</th>
                  <th className="py-3 px-4">Remaining Balance</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Settlement Status</th>
                  <th className="py-3 px-4">Settled On</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs sm:text-sm ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className={`py-12 text-center ${subtleText}`}>
                      No settlement cycles match the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((cycle) => {
                    const badge = getStatusBadgeConfig(cycle);
                    return (
                      <tr key={cycle.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}>
                        <td className="py-3.5 px-4 font-mono font-bold text-xs">{cycle.id}</td>
                        <td className="py-3.5 px-4 font-semibold">{cycle.periodLabel}</td>
                        <td className="py-3.5 px-4 text-center font-bold">{cycle.totalOrders}</td>
                        <td className="py-3.5 px-4 font-bold">{formatCurrency(cycle.accruedFee)}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(cycle.paidAmount)}
                        </td>
                        <td className="py-3.5 px-4 font-bold">
                          {formatCurrency(cycle.remainingDue)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">{formatDhakaDate(cycle.paymentDueDate)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex flex-col items-start px-2.5 py-1 rounded-lg border text-[11px] font-bold ${badge.bg}`}>
                            <span>{badge.label}</span>
                            {badge.sub && <span className="text-[10px] font-semibold opacity-85">{badge.sub}</span>}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                          {cycle.settledAt ? formatDhakaDate(cycle.settledAt) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {cycle.displayStatus === 'payment_submitted' ? (
                              <button
                                type="button"
                                onClick={() => setDetailsCycle(cycle)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Payment Status</span>
                              </button>
                            ) : cycle.displayStatus === 'payment_rejected' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setDetailsCycle(cycle)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                    isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Details</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOpenSettleModal && onOpenSettleModal(cycle.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Resubmit Payment Details</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setDetailsCycle(cycle)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                    isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Details</span>
                                </button>
                                {(cycle.status === 'pending' || cycle.status === 'overdue') && cycle.submittableRemaining > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenSettleModal && onOpenSettleModal(cycle.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer"
                                  >
                                    <span>Settle Due</span>
                                  </button>
                                )}
                                {cycle.status === 'settled' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadReceipt(cycle, 'cycle')}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                      isDark ? 'border-slate-700 text-emerald-400 hover:bg-slate-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download Receipt</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className={`border-y text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Settlement Period</th>
                  <th className="py-3 px-4">Payment Date &amp; Time</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Paid Amount</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs sm:text-sm ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`py-12 text-center ${subtleText}`}>
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((txn) => {
                    const pBadge = getPaymentStatusBadge(txn.status);
                    return (
                      <tr key={txn.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}>
                        <td className="py-3.5 px-4 font-mono font-bold text-xs">{txn.paymentId}</td>
                        <td className="py-3.5 px-4 font-semibold">{txn.settlementPeriod}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">{formatDhakaDateTime(txn.paymentDate)}</td>
                        <td className="py-3.5 px-4">{txn.paymentMethod || 'bKash Merchant QR'}</td>
                        <td className="py-3.5 px-4 font-mono text-xs">{txn.transactionRef || '—'}</td>
                        <td className="py-3.5 px-4 font-bold">{formatCurrency(txn.amount)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-bold ${pBadge.cls}`}>
                            {pBadge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailsPayment(txn)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Details</span>
                            </button>
                            {txn.status === 'verified' && (
                              <button
                                type="button"
                                onClick={() => handleDownloadReceipt(txn, 'payment')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                  isDark ? 'border-slate-700 text-emerald-400 hover:bg-slate-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Receipt</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className={`px-5 py-3.5 border-t flex items-center justify-between text-xs ${
          isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
        }`}>
          <div>
            Showing <strong>{activeRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, activeRows.length)}</strong> of <strong>{activeRows.length}</strong>{' '}
            {activeSubTab === 'settlements' ? 'settlements' : 'payments'}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-bold">{currentPage}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Info Footer Note */}
      {currentCycle && (
        <div className={`flex items-center gap-2 text-xs px-1 ${subtleText}`}>
          <Info className="w-4 h-4 shrink-0" />
          <span>
            Current cycle fees ({currentCycle.periodLabel}) become payable after the 7-day cycle closes. Payment due date:{' '}
            <strong>{formatDhakaDate(currentCycle.paymentDueDate)}</strong>.
          </span>
        </div>
      )}

      {/* Settlement Details Modal */}
      {detailsCycle && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setDetailsCycle(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden ${surfaceCard}`}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-extrabold text-base">Settlement Details · {detailsCycle.id}</h3>
                  <p className={`text-xs ${subtleText}`}>{detailsCycle.periodLabel}</p>
                </div>
              </div>
              <button type="button" onClick={() => setDetailsCycle(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`text-[11px] ${subtleText}`}>Total Bills</div>
                  <div className="text-base font-extrabold mt-0.5">{detailsCycle.totalOrders}</div>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`text-[11px] ${subtleText}`}>Accrued Fee</div>
                  <div className="text-base font-extrabold mt-0.5">{formatCurrency(detailsCycle.accruedFee)}</div>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`text-[11px] ${subtleText}`}>Paid Amount</div>
                  <div className="text-base font-extrabold text-emerald-600 mt-0.5">{formatCurrency(detailsCycle.paidAmount)}</div>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`text-[11px] ${subtleText}`}>Remaining Balance</div>
                  <div className="text-base font-extrabold text-rose-600 mt-0.5">{formatCurrency(detailsCycle.remainingDue)}</div>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`text-[11px] ${subtleText}`}>Due Date</div>
                  <div className="text-sm font-bold mt-0.5">{formatDhakaDate(detailsCycle.paymentDueDate)}</div>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`text-[11px] ${subtleText}`}>Settled On</div>
                  <div className="text-sm font-bold mt-0.5">
                    {detailsCycle.settledAt ? formatDhakaDate(detailsCycle.settledAt) : '—'}
                    {detailsCycle.paidLate && (
                      <span className="block text-[10px] text-amber-600 font-bold">Paid Late</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2">
                  Related Payment History ({detailsCycle.matchingTxns?.length || 0})
                </h4>
                {(!detailsCycle.matchingTxns || detailsCycle.matchingTxns.length === 0) ? (
                  <div className={`p-4 rounded-xl border text-xs text-center ${subtleText} ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    No payment submissions recorded for this cycle yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailsCycle.matchingTxns.map((t) => {
                      const pb = getPaymentStatusBadge(t.status);
                      return (
                        <div key={t.id} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                          <div className="min-w-0">
                            <div className="text-xs font-bold font-mono">{t.paymentId} · {t.transactionRef || 'No TrxID'}</div>
                            <div className={`text-[11px] ${subtleText}`}>
                              {formatDhakaDateTime(t.paymentDate)} · {t.paymentMethod}
                            </div>
                            {t.rejectionReason && (
                              <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
                                Rejected: {t.rejectionReason}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-extrabold">{formatCurrency(t.amount)}</div>
                            <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold mt-0.5 ${pb.cls}`}>
                              {pb.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={`px-5 py-3.5 border-t flex items-center justify-end gap-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              {detailsCycle.status === 'settled' && (
                <button
                  type="button"
                  onClick={() => handleDownloadReceipt(detailsCycle, 'cycle')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  Download Receipt
                </button>
              )}
              {(detailsCycle.status === 'pending' || detailsCycle.status === 'overdue') && detailsCycle.submittableRemaining > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const cId = detailsCycle.id;
                    setDetailsCycle(null);
                    onOpenSettleModal && onOpenSettleModal(cId);
                  }}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer"
                >
                  Settle Due
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailsCycle(null)}
                className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                  isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {detailsPayment && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setDetailsPayment(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${surfaceCard}`}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-extrabold text-base">Payment Details · {detailsPayment.paymentId}</h3>
                  <p className={`text-xs ${subtleText}`}>{detailsPayment.settlementPeriod}</p>
                </div>
              </div>
              <button type="button" onClick={() => setDetailsPayment(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs sm:text-sm max-h-[75vh] overflow-y-auto">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className={subtleText}>Payment Status</span>
                <span className={`px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${getPaymentStatusBadge(detailsPayment.status).cls}`}>
                  {getPaymentStatusBadge(detailsPayment.status).label}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className={subtleText}>Paid Amount</span>
                <span className="font-extrabold">{formatCurrency(detailsPayment.amount)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className={subtleText}>Payment Date &amp; Time</span>
                <span className="font-semibold">{formatDhakaDateTime(detailsPayment.paymentDate)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className={subtleText}>Payment Method</span>
                <span className="font-semibold">{detailsPayment.paymentMethod || 'bKash Merchant QR'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className={subtleText}>Transaction ID</span>
                <span className="font-mono font-bold">{detailsPayment.transactionRef || '—'}</span>
              </div>
              {detailsPayment.paymentMobile && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className={subtleText}>Sender Mobile</span>
                  <span className="font-mono font-semibold">{detailsPayment.paymentMobile}</span>
                </div>
              )}
              {detailsPayment.rejectionReason && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                  <strong>Rejection Reason:</strong> {detailsPayment.rejectionReason}
                </div>
              )}
              {detailsPayment.screenshotUrl && (
                <div className="pt-2">
                  <div className={`text-xs font-bold mb-1.5 ${subtleText}`}>Payment Screenshot</div>
                  <img
                    src={detailsPayment.screenshotUrl}
                    alt="Payment Proof"
                    className="w-full max-h-60 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              )}
            </div>

            <div className={`px-5 py-3.5 border-t flex items-center justify-end gap-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              {detailsPayment.status === 'verified' && (
                <button
                  type="button"
                  onClick={() => handleDownloadReceipt(detailsPayment, 'payment')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  Download Receipt
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailsPayment(null)}
                className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                  isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
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
