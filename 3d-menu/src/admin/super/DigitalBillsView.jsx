import React, { useState, useMemo, useEffect } from 'react';
import {
  Coins,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronLeft,
  Eye,
  MoreVertical,
  Download,
  CreditCard,
  Send,
  FileText,
  RotateCcw,
  Store,
  Receipt,
  ShoppingBag,
  Percent,
  Check,
  X,
  Printer,
  History,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Bell
} from 'lucide-react';
import {
  generateLiveSettlementCycles,
  getSettlementStatus,
  computeSettlementStatus,
  computeSettlementSummary,
  recordCyclePayment,
  recordCycleReminder
} from './digitalBillsStore';
import { fetchDGMBillingLedger } from '../../data/dgmSessionStore';
import { supabase } from '../../lib/supabaseClient';
import './digitalBills.css';

const getLocalDateString = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DigitalBillsView({
  restaurants = [],
  orders = [],
  settlements = [],
  subRoute = 'Digital Bills',
  onBack
}) {
  // Main view tab: 'ledger' (Settlement Ledger) vs 'confirmations' (Customer Order Confirmations)
  const [activeMainTab, setActiveMainTab] = useState(
    subRoute === 'Customer Confirmations' ? 'confirmations' : 'ledger'
  );

  // Live billing ledger from Supabase
  const [billingLedger, setBillingLedger] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch live billing ledger for fine-dine fee ledger tracking
  useEffect(() => {
    fetchDGMBillingLedger({ limit: 500 }).then(data => {
      if (Array.isArray(data)) setBillingLedger(data);
    });
  }, [refreshTrigger]);

  // Realtime subscription to live Supabase orders, billing ledger, and settlements
  useEffect(() => {
    const channel = supabase
      .channel('realtime_digital_bills_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        setRefreshTrigger(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dgm_billing_ledger' }, () => {
        setRefreshTrigger(t => t + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, () => {
        setRefreshTrigger(t => t + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter States
  const [selectedResto, setSelectedResto] = useState('all'); // 'all' | 'resto_001' | 'resto_002' | 'resto_003'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in_progress' | 'pending' | 'overdue' | 'settled'
  const [periodFilter, setPeriodFilter] = useState('all'); // 'all' | 'current' | specific period | 'custom'
  const [customPeriodFrom, setCustomPeriodFrom] = useState('');
  const [customPeriodTo, setCustomPeriodTo] = useState('');

  // Effective Reference Date: Always live current system date
  const effectiveRefDate = useMemo(() => new Date(), [refreshTrigger]);

  // 100% Live Settlement Cycles generated directly from live database state
  const cycles = useMemo(() => {
    return generateLiveSettlementCycles({
      restaurants,
      orders,
      billingLedger,
      settlements,
      currentDate: effectiveRefDate
    });
  }, [restaurants, orders, billingLedger, settlements, effectiveRefDate, refreshTrigger]);

  // Distinct period labels collected from live generated cycles
  const distinctPeriods = useMemo(() => {
    const seen = new Set();
    const list = [];
    cycles.forEach(c => {
      if (c.periodLabel && !seen.has(c.periodLabel)) {
        seen.add(c.periodLabel);
        list.push(c.periodLabel);
      }
    });
    return list;
  }, [cycles]);

  // Selected Settlement Cycle for "View Details" page
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [detailsTab, setDetailsTab] = useState('orders'); // 'orders' | 'payments' | 'activities'

  // Three-dots menu active popup
  const [openMenuId, setOpenMenuId] = useState(null);

  // Modal States
  const [recordPaymentModalCycle, setRecordPaymentModalCycle] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'bKash Merchant Pay',
    transactionRef: '',
    paymentDate: '',
    notes: ''
  });

  const [invoiceModalCycle, setInvoiceModalCycle] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close three dots menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-buttons-wrap')) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Filtered Cycles
  const filteredCycles = useMemo(() => {
    return cycles.filter(c => {
      const computedStatus = computeSettlementStatus(c, effectiveRefDate);

      // Restaurant filter
      if (selectedResto !== 'all' && c.restaurantId !== selectedResto) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && computedStatus !== statusFilter) {
        return false;
      }

      // Period filter
      if (periodFilter === 'current') {
        if (!c.isCurrentCycle) return false;
      } else if (periodFilter !== 'all' && periodFilter !== 'custom') {
        if (!c.periodLabel.toLowerCase().includes(periodFilter.toLowerCase())) return false;
      } else if (periodFilter === 'custom') {
        const cStartDay = getLocalDateString(c.periodStart);
        const cEndDay = getLocalDateString(c.periodEnd);
        if (customPeriodFrom && cEndDay < customPeriodFrom) return false;
        if (customPeriodTo && cStartDay > customPeriodTo) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = c.id.toLowerCase().includes(q);
        const matchesResto = c.restaurantName.toLowerCase().includes(q);
        const matchesOrder = (c.orders || []).some(o => 
          (o.id && o.id.toLowerCase().includes(q)) ||
          (o.sessionCode && o.sessionCode.toLowerCase().includes(q)) ||
          (o.tableNo && o.tableNo.toLowerCase().includes(q))
        );
        if (!matchesId && !matchesResto && !matchesOrder) return false;
      }

      return true;
    });
  }, [cycles, selectedResto, effectiveRefDate, statusFilter, periodFilter, customPeriodFrom, customPeriodTo, searchQuery]);

  // Compute 5 Metric Cards dynamically based on active filtered cycles
  const metrics = useMemo(() => {
    return computeSettlementSummary(filteredCycles, effectiveRefDate);
  }, [filteredCycles, effectiveRefDate]);

  // Active cycle object for Details Page
  const activeCycle = useMemo(() => {
    if (!selectedCycleId) return null;
    return cycles.find(c => c.id === selectedCycleId) || null;
  }, [selectedCycleId, cycles]);

  // Open Record Payment Modal helper
  const handleOpenRecordPayment = (cycle) => {
    const remaining = Math.max(0, (cycle.accruedFee || 0) - (cycle.paidAmount || 0));
    setPaymentForm({
      amount: remaining.toFixed(2),
      paymentMethod: 'bKash Merchant Pay',
      transactionRef: `TRX-${Date.now().toString().slice(-6)}`,
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: `Weekly settlement clearance for ${cycle.id}`
    });
    setRecordPaymentModalCycle(cycle);
    setOpenMenuId(null);
  };

  // Submit Payment Record
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!recordPaymentModalCycle) return;

    const res = await recordCyclePayment({
      cycleId: recordPaymentModalCycle.id,
      restaurantId: recordPaymentModalCycle.restaurantId,
      amount: parseFloat(paymentForm.amount),
      paymentMethod: paymentForm.paymentMethod,
      transactionRef: paymentForm.transactionRef,
      paymentDate: paymentForm.paymentDate ? new Date(paymentForm.paymentDate).toISOString() : new Date().toISOString(),
      notes: paymentForm.notes
    });

    if (res.success) {
      setRefreshTrigger(t => t + 1);
      setRecordPaymentModalCycle(null);
      showToast(`Payment of ৳${paymentForm.amount} recorded for ${recordPaymentModalCycle.id}. Settlement is now Settled.`);
    }
  };

  // Quick reminder sender
  const handleSendReminder = (cycle, type = 'Payment Reminder') => {
    recordCycleReminder(cycle.id, cycle.restaurantId, type);
    setRefreshTrigger(t => t + 1);
    setOpenMenuId(null);
    showToast(`${type} successfully sent to ${cycle.restaurantName}.`);
  };

  // Format Date Helper
  const formatDateDisplay = (iso) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  // Confirmed orders list for customer confirmations tab
  const confirmedOrders = useMemo(() => {
    return (orders || []).filter(o => o.orderStatus === 'confirmed' || o.orderStatus === 'completed' || o.paymentStatus === 'paid');
  }, [orders]);

  // CSV Export
  const handleExportCSV = (cycle) => {
    if (!cycle?.orders?.length) {
      showToast('No orders recorded to export.');
      return;
    }
    const headers = ['Order ID', 'Date & Time', 'Table No', 'Order Amount (BDT)', 'Platform Fee (BDT)', 'Order From', 'Order Type'];
    const rows = cycle.orders.map(o => [
      o.id,
      `"${new Date(o.date).toLocaleString('en-US')}"`,
      `"${o.tableNo || o.tableNumber || 'Table 01'}"`,
      Number(o.amount).toFixed(2),
      Number(o.fee).toFixed(2),
      `"${o.orderFrom || 'Fine Dine'}"`,
      `"${o.orderType || 'Online Order'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Settlement_${cycle.id}_Orders.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${cycle.id} orders to CSV.`);
  };

  // =========================================================================
  // VIEW: SETTLEMENT DETAILS VIEW (Image 5)
  // =========================================================================
  if (activeCycle) {
    const cycleStatus = computeSettlementStatus(activeCycle, effectiveRefDate);
    const isPaid = cycleStatus === 'settled';

    return (
      <div className="settlement-details-wrapper">
        {/* Toast */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600,
            fontSize: 13
          }}>
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Back Link */}
        <div className="details-top-bar">
          <button
            type="button"
            className="btn-back-link"
            onClick={() => setSelectedCycleId(null)}
          >
            <ChevronLeft size={16} />
            <span>Back to Digital Bills</span>
          </button>
        </div>

        {/* Details Header Banner */}
        <div className="details-header-card">
          <div className="details-title">
            <h2>Settlement Details</h2>
            <p>Complete settlement information for {activeCycle.id}</p>
          </div>

          <div className="details-header-actions">
            <button
              type="button"
              className="btn-secondary-tool"
              onClick={() => setInvoiceModalCycle(activeCycle)}
              title="Download Statement"
            >
              <Download size={14} />
              <span>Download Invoice (PDF)</span>
            </button>

            <button
              type="button"
              className="btn-secondary-tool"
              onClick={() => setDetailsTab('orders')}
            >
              <ShoppingBag size={14} />
              <span>View Orders</span>
            </button>

            {!isPaid ? (
              <button
                type="button"
                className="btn-primary-record"
                onClick={() => handleOpenRecordPayment(activeCycle)}
              >
                <CreditCard size={15} />
                <span>Record Payment</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary-tool"
                style={{ borderColor: '#a7f3d0', color: '#047857', background: '#ecfdf5' }}
                onClick={() => setInvoiceModalCycle(activeCycle)}
              >
                <CheckCircle2 size={15} />
                <span>View Receipt (Paid)</span>
              </button>
            )}
          </div>
        </div>

        {/* Key Info Strip (Image 5) */}
        <div className="settlement-key-card">
          <div className="key-info-item">
            <span className="key-info-lbl">Restaurant</span>
            <div className="key-info-val">
              <div className="resto-icon-wrap" style={{ width: 22, height: 22 }}>
                <Store size={13} />
              </div>
              <span>{activeCycle.restaurantName}</span>
              <ShieldCheck size={15} className="text-blue-500 inline" />
            </div>
            <span className="key-info-sub">Restaurant ID: {activeCycle.restaurantCode}</span>
          </div>

          <div className="key-info-item">
            <span className="key-info-lbl">Settlement ID</span>
            <span className="key-info-val">{activeCycle.id}</span>
            <span className="key-info-sub">Weekly Frequency</span>
          </div>

          <div className="key-info-item">
            <span className="key-info-lbl">Settlement Period</span>
            <span className="key-info-val">{activeCycle.periodLabel}</span>
            <span className="key-info-sub">(7 Days Fee Collection)</span>
          </div>

          <div className="key-info-item">
            <span className="key-info-lbl">Payment Due Date</span>
            <span className="key-info-val">{formatDateDisplay(activeCycle.paymentDueDate)}</span>
            <span className="key-info-sub">(3 Days Grace Period)</span>
          </div>

          <div className="key-info-item">
            <span className="key-info-lbl">Settlement Status</span>
            <div>
              {cycleStatus === 'in_progress' && (
                <span className="status-pill status-in-progress">
                  <RefreshCw size={12} className="animate-spin" /> In Progress
                </span>
              )}
              {cycleStatus === 'pending' && (
                <span className="status-pill status-pending">
                  <Clock size={12} /> Pending
                </span>
              )}
              {cycleStatus === 'overdue' && (
                <span className="status-pill status-overdue">
                  <AlertTriangle size={12} /> Overdue
                </span>
              )}
              {cycleStatus === 'settled' && (
                <span className="status-pill status-settled">
                  <CheckCircle2 size={12} /> Settled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 5 Meta Metric Bar (Image 5) */}
        <div className="details-meta-bar">
          <div className="meta-bar-item">
            <div className="meta-bar-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <ShoppingBag size={18} />
            </div>
            <div className="meta-bar-content">
              <span className="meta-bar-lbl">Total Orders</span>
              <span className="meta-bar-val">{activeCycle.totalOrders}</span>
            </div>
          </div>

          <div className="meta-bar-item">
            <div className="meta-bar-icon" style={{ background: '#faf5ff', color: '#9333ea' }}>
              <Receipt size={18} />
            </div>
            <div className="meta-bar-content">
              <span className="meta-bar-lbl">Gross Order Volume</span>
              <span className="meta-bar-val">৳{activeCycle.grossOrderVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="meta-bar-item">
            <div className="meta-bar-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <Percent size={18} />
            </div>
            <div className="meta-bar-content">
              <span className="meta-bar-lbl">Platform Fee (৳5/bill)</span>
              <span className="meta-bar-val" style={{ color: '#ea580c' }}>
                ৳{activeCycle.accruedFee.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="meta-bar-item">
            <div className="meta-bar-icon" style={{ background: '#f8fafc', color: '#64748b' }}>
              <Calendar size={18} />
            </div>
            <div className="meta-bar-content">
              <span className="meta-bar-lbl">Created At</span>
              <span className="meta-bar-val" style={{ fontSize: 13, fontWeight: 700 }}>
                {formatDateDisplay(activeCycle.createdAt)}, 12:00 AM
              </span>
            </div>
          </div>

          <div className="meta-bar-item">
            <div className="meta-bar-icon" style={{ background: '#f8fafc', color: '#64748b' }}>
              <Clock size={18} />
            </div>
            <div className="meta-bar-content">
              <span className="meta-bar-lbl">Last Updated</span>
              <span className="meta-bar-val" style={{ fontSize: 13, fontWeight: 700 }}>
                {formatDateDisplay(activeCycle.lastUpdatedAt)}, 11:59 PM
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs in Details View */}
        <div className="details-tabs-row">
          <div className="details-tabs-group">
            <button
              type="button"
              className={`details-tab-btn ${detailsTab === 'orders' ? 'active' : ''}`}
              onClick={() => setDetailsTab('orders')}
            >
              Order Transactions ({activeCycle.orders?.length || activeCycle.totalOrders})
            </button>

            <button
              type="button"
              className={`details-tab-btn ${detailsTab === 'payments' ? 'active' : ''}`}
              onClick={() => setDetailsTab('payments')}
            >
              Payment History ({activeCycle.payments?.length || 0})
            </button>

            <button
              type="button"
              className={`details-tab-btn ${detailsTab === 'activities' ? 'active' : ''}`}
              onClick={() => setDetailsTab('activities')}
            >
              Activity Log ({activeCycle.activities?.length || 0})
            </button>
          </div>

          <div>
            <button
              type="button"
              className="btn-secondary-tool"
              onClick={() => handleExportCSV(activeCycle)}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Orders Table */}
        {detailsTab === 'orders' && (
          <div className="details-content-card">
            <table className="digital-bills-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Order Date & Time</th>
                  <th>Table No</th>
                  <th>Order Amount</th>
                  <th>Platform Fee</th>
                  <th>Order From</th>
                  <th>Order Type</th>
                </tr>
              </thead>
              <tbody>
                {activeCycle.orders?.map(o => (
                  <tr key={o.id}>
                    <td>
                      <span className="settlement-id-badge">{o.id}</span>
                    </td>
                    <td style={{ color: '#475569', fontSize: 13 }}>
                      {new Intl.DateTimeFormat('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }).format(new Date(o.date))}
                    </td>
                    <td>
                      <span className="order-table-pill">{o.tableNo || o.tableNumber || 'Table 01'}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      ৳{Number(o.amount).toFixed(2)}
                    </td>
                    <td style={{ fontWeight: 800, color: '#ea580c' }}>
                      ৳{Number(o.fee).toFixed(2)}
                    </td>
                    <td>
                      <span className={`status-pill ${o.orderFrom === 'Fine Dine' ? 'status-fine-dine' : 'status-non-fine'}`}>
                        {o.orderFrom || 'Fine Dine'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${o.orderType === 'Online Order' ? 'status-online' : 'status-regular'}`}>
                        {o.orderType || 'Online Order'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Payment History */}
        {detailsTab === 'payments' && (
          <div className="details-content-card">
            {!activeCycle.payments?.length ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                <CreditCard size={32} className="mx-auto mb-2 text-slate-400" />
                <p style={{ margin: 0, fontWeight: 600 }}>No payments recorded for this settlement cycle yet.</p>
                <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                  Click "Record Payment" above to log a verified settlement payment.
                </p>
              </div>
            ) : (
              <table className="digital-bills-table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Payment Date</th>
                    <th>Payment Method</th>
                    <th>Transaction Ref</th>
                    <th>Amount Paid</th>
                    <th>Recorded By</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCycle.payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700 }}>{p.id}</td>
                      <td>{formatDateDisplay(p.date)}</td>
                      <td>
                        <span className="status-pill status-settled">{p.method}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.transactionRef}</td>
                      <td style={{ fontWeight: 800, color: '#059669', fontSize: 14 }}>
                        ৳{Number(p.amount).toFixed(2)}
                      </td>
                      <td>{p.recordedBy}</td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{p.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Activity Log */}
        {detailsTab === 'activities' && (
          <div className="details-content-card">
            <div className="activity-timeline">
              {activeCycle.activities?.map(a => (
                <div key={a.id} className="activity-item">
                  <div className={`activity-node ${a.type || 'info'}`}>
                    {a.type === 'success' ? <CheckCircle2 size={16} /> : a.type === 'danger' ? <AlertTriangle size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="activity-body">
                    <div className="activity-header">
                      <span className="activity-title">{a.title}</span>
                      <span className="activity-time">{formatDateDisplay(a.timestamp)}</span>
                    </div>
                    <div className="activity-desc">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Record Payment Modal */}
        {recordPaymentModalCycle && (
          <div className="db-modal-overlay" onClick={() => setRecordPaymentModalCycle(null)}>
            <div className="db-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="db-modal-header">
                <h3>Record Settlement Payment ({recordPaymentModalCycle.id})</h3>
                <button
                  type="button"
                  className="db-modal-close-btn"
                  onClick={() => setRecordPaymentModalCycle(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitPayment}>
                <div className="db-modal-body">
                  <div className="db-form-group">
                    <span className="db-form-label">Restaurant</span>
                    <input
                      type="text"
                      className="db-form-input"
                      value={`${recordPaymentModalCycle.restaurantName} (${recordPaymentModalCycle.restaurantCode})`}
                      disabled
                      style={{ background: '#f8fafc', color: '#64748b' }}
                    />
                  </div>

                  <div className="db-form-group">
                    <span className="db-form-label">Settlement Period & Accrued Fee</span>
                    <input
                      type="text"
                      className="db-form-input"
                      value={`${recordPaymentModalCycle.periodLabel} — Accrued Fee: ৳${recordPaymentModalCycle.accruedFee.toFixed(2)}`}
                      disabled
                      style={{ background: '#f8fafc', color: '#64748b' }}
                    />
                  </div>

                  <div className="db-form-group">
                    <label className="db-form-label">Amount to Record (৳) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="db-form-input"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="db-form-group">
                    <label className="db-form-label">Payment Method *</label>
                    <select
                      className="db-form-select"
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    >
                      <option value="bKash Merchant Pay">bKash Merchant Pay</option>
                      <option value="Nagad Business">Nagad Business</option>
                      <option value="Bank Transfer (EFT/NPSB)">Bank Transfer (EFT/NPSB)</option>
                      <option value="Rocket">Rocket</option>
                      <option value="Cash Clearance">Cash Clearance</option>
                    </select>
                  </div>

                  <div className="db-form-group">
                    <label className="db-form-label">Transaction ID / Reference Number *</label>
                    <input
                      type="text"
                      className="db-form-input"
                      value={paymentForm.transactionRef}
                      onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                      placeholder="e.g. TRX-BK-918231"
                      required
                    />
                  </div>

                  <div className="db-form-group">
                    <label className="db-form-label">Payment Date</label>
                    <input
                      type="date"
                      className="db-form-input"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    />
                  </div>

                  <div className="db-form-group">
                    <label className="db-form-label">Admin Notes</label>
                    <textarea
                      className="db-form-input"
                      rows={2}
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      placeholder="Optional remarks or receipt references..."
                    />
                  </div>
                </div>

                <div className="db-modal-footer">
                  <button
                    type="button"
                    className="btn-secondary-tool"
                    onClick={() => setRecordPaymentModalCycle(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary-record"
                  >
                    Confirm & Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invoice / Statement Modal */}
        {invoiceModalCycle && (
          <div className="db-modal-overlay" onClick={() => setInvoiceModalCycle(null)}>
            <div className="db-modal-box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
              <div className="db-modal-header">
                <h3>PhoneMenu Platform Fee Statement</h3>
                <button
                  type="button"
                  className="db-modal-close-btn"
                  onClick={() => setInvoiceModalCycle(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="db-modal-body" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20, color: '#fd6e00', fontWeight: 900 }}>PhoneMenu SaaS</h2>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>3D AR Digital Menu & Table Ordering Platform</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>STATEMENT #{invoiceModalCycle.id}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Date: {formatDateDisplay(new Date())}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Billed To:</span>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', marginTop: 2 }}>{invoiceModalCycle.restaurantName}</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Account ID: {invoiceModalCycle.restaurantCode}</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Category: {invoiceModalCycle.restaurantType}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Billing Period:</span>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginTop: 2 }}>{invoiceModalCycle.periodLabel}</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Due Date: {formatDateDisplay(invoiceModalCycle.paymentDueDate)}</div>
                  </div>
                </div>

                <div style={{ marginTop: 20, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '10px 14px' }}>Description</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>Total Bills</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Rate</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '12px 14px' }}>
                          <strong>DGM Platform Service Fee</strong>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Weekly table ordering fee (৳5 per confirmed digital bill)</div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                          {invoiceModalCycle.totalOrders}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          ৳5.00
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#ea580c' }}>
                          ৳{invoiceModalCycle.accruedFee.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, padding: '14px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa' }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#9a3412' }}>Status:</span>
                    <span style={{ marginLeft: 6, fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', fontSize: 12 }}>
                      {computeSettlementStatus(invoiceModalCycle, effectiveRefDate)}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, color: '#64748b', marginRight: 8 }}>Total Payable:</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>
                      ৳{invoiceModalCycle.accruedFee.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="db-modal-footer">
                <button
                  type="button"
                  className="btn-secondary-tool"
                  onClick={() => window.print()}
                >
                  <Printer size={14} />
                  <span>Print Statement</span>
                </button>
                <button
                  type="button"
                  className="btn-primary-record"
                  onClick={() => setInvoiceModalCycle(null)}
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

  // =========================================================================
  // VIEW: MAIN DIGITAL BILLS LIST VIEW (Image 4)
  // =========================================================================
  return (
    <div className="digital-bills-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 600,
          fontSize: 13
        }}>
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="digital-bills-header">
        <div className="digital-bills-header-left">
          <h2>
            {activeMainTab === 'confirmations' ? 'Customer Order Confirmations (Live Supabase)' : 'Customer Digital Bills & ৳5 Fee Ledger'}
          </h2>
          <p>
            {activeMainTab === 'confirmations'
              ? 'Real-time verified orders placed by customers and stored in Supabase PostgreSQL.'
              : 'Digital Food Menu SaaS charges a flat ৳5 platform fee per customer digital bill. Settlement runs weekly (7 days) with a 3-day payment grace period.'}
          </p>
        </div>

        <div className="digital-bills-top-actions">
          <button
            type="button"
            className={`btn-confirmations-pill ${activeMainTab === 'confirmations' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('confirmations')}
          >
            <span>Customer Confirmations ({confirmedOrders.length || 38})</span>
          </button>

          <button
            type="button"
            className="btn-bills-ledger-pill"
            onClick={() => setActiveMainTab('ledger')}
          >
            <Receipt size={15} />
            <span>Restaurant Bills Ledger</span>
          </button>
        </div>
      </div>

      {activeMainTab === 'confirmations' ? (
        /* Customer Confirmations Table Tab */
        <div className="digital-bills-table-card">
          <table className="digital-bills-table">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Order #</th>
                <th style={{ width: '20%' }}>Table / Customer</th>
                <th style={{ width: '32%' }}>Dishes & Portions</th>
                <th style={{ width: '14%' }}>Total Bill</th>
                <th style={{ width: '16%', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {confirmedOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No customer orders found in Supabase.
                  </td>
                </tr>
              ) : (
                confirmedOrders.map(ord => {
                  const dateStr = ord.createdAt
                    ? new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Recent';

                  return (
                    <tr key={ord.id || ord.orderNumber}>
                      <td>
                        <strong>{ord.orderNumber}</strong>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{dateStr}</div>
                      </td>
                      <td>
                        <div><strong>{ord.tableNumber || 'Table 04'}</strong></div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{ord.customerName || 'Dine-In Customer'}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          {ord.items && ord.items.length > 0
                            ? ord.items.map(it => `${it.name || it.title || 'Item'} (${it.portion || 'Standard'})`).join(', ')
                            : 'Order items recorded'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, color: '#ea580c' }}>
                        ৳{Number(ord.totalAmount || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="status-pill status-settled">
                          <CheckCircle2 size={12} /> {ord.orderStatus || 'Confirmed'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Restaurant Weekly Settlement Ledger View */
        <>
          {/* 5 Summary Metric Cards (Image 4) */}
          <div className="digital-bills-metrics-grid">
            {/* 1. Total Accrued Fee */}
            <div className="metric-summary-card card-orange">
              <div className="metric-card-head">
                <div className="metric-card-icon">
                  <Coins size={20} strokeWidth={2.4} />
                </div>
                <span className="metric-card-title">Total Accrued Fee</span>
              </div>
              <div className="metric-card-value">৳{metrics.totalAccruedFee.toLocaleString()}</div>
              <div className="metric-card-sub">All settlement cycles</div>
            </div>

            {/* 2. Current Cycle Fee */}
            <div className="metric-summary-card card-blue">
              <div className="metric-card-head">
                <div className="metric-card-icon">
                  <Calendar size={20} strokeWidth={2.4} />
                </div>
                <span className="metric-card-title">Current Cycle Fee</span>
              </div>
              <div className="metric-card-value">৳{metrics.currentCycleFee.toLocaleString()}</div>
              <div className="metric-card-sub">{metrics.currentCycleLabel}</div>
            </div>

            {/* 3. Pending Settlement */}
            <div className="metric-summary-card card-amber">
              <div className="metric-card-head">
                <div className="metric-card-icon">
                  <Clock size={20} strokeWidth={2.4} />
                </div>
                <span className="metric-card-title">Pending Settlement</span>
              </div>
              <div className="metric-card-value">৳{metrics.pendingFee.toLocaleString()}</div>
              <div className="metric-card-sub">
                {metrics.pendingCount} cycle{metrics.pendingCount !== 1 ? 's' : ''} (awaiting payment)
              </div>
            </div>

            {/* 4. Overdue Settlement */}
            <div className="metric-summary-card card-red">
              <div className="metric-card-head">
                <div className="metric-card-icon">
                  <AlertTriangle size={20} strokeWidth={2.4} />
                </div>
                <span className="metric-card-title">Overdue Settlement</span>
              </div>
              <div className="metric-card-value">৳{metrics.overdueFee.toLocaleString()}</div>
              <div className="metric-card-sub">
                {metrics.overdueCount} cycle{metrics.overdueCount !== 1 ? 's' : ''} (payment overdue)
              </div>
            </div>

            {/* 5. Total Settled */}
            <div className="metric-summary-card card-green">
              <div className="metric-card-head">
                <div className="metric-card-icon">
                  <CheckCircle2 size={20} strokeWidth={2.4} />
                </div>
                <span className="metric-card-title">Total Settled</span>
              </div>
              <div className="metric-card-value">৳{metrics.totalSettled.toLocaleString()}</div>
              <div className="metric-card-sub">
                {metrics.settledCount} cycle{metrics.settledCount !== 1 ? 's' : ''} (paid)
              </div>
            </div>
          </div>

          {/* Filter Toolbar (Image 4) */}
          <div className="digital-bills-filter-bar">
            {/* Search */}
            <div className="search-input-wrap">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                className="search-input-field"
                placeholder="Search by Settlement ID or Restaurant name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Restaurant Filter */}
            <div>
              <select
                className="filter-select-pill"
                value={selectedResto}
                onChange={(e) => setSelectedResto(e.target.value)}
              >
                <option value="all">All Restaurants</option>
                <option value="resto_001">Monkey Bhai</option>
                <option value="resto_002">Hungry Bite Café</option>
                <option value="resto_003">Spice Lounge</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="filter-select-pill"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="settled">Settled</option>
              </select>
            </div>

            {/* Settlement Period Filter */}
            <div>
              <select
                className="filter-select-pill"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
              >
                <option value="all">All Settlement Periods</option>
                <option value="current">Current Settlement Period</option>
                {distinctPeriods.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {periodFilter === 'custom' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="date"
                  className="filter-select-pill"
                  style={{ padding: '6px 8px', fontSize: 12 }}
                  value={customPeriodFrom}
                  onChange={(e) => setCustomPeriodFrom(e.target.value)}
                  title="From Date"
                />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>to</span>
                <input
                  type="date"
                  className="filter-select-pill"
                  style={{ padding: '6px 8px', fontSize: 12 }}
                  value={customPeriodTo}
                  onChange={(e) => setCustomPeriodTo(e.target.value)}
                  title="To Date"
                />
                {(customPeriodFrom || customPeriodTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPeriodFrom('');
                      setCustomPeriodTo('');
                    }}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      borderRadius: 5,
                      padding: '4px 8px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Clear custom range"
                  >
                    <X size={12} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            )}

            {/* Live Real-Time Indicator (100% Live Database State) */}
            <div className="reference-date-pill" title="100% Live System Time & Supabase Multi-Tenant Data" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', cursor: 'default' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
                Live Time: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Weekly Settlement Data Table (Image 4) */}
          <div className="digital-bills-table-card">
            <table className="digital-bills-table">
              <thead>
                <tr>
                  <th>Settlement ID</th>
                  <th>Restaurant</th>
                  <th>Settlement Period</th>
                  <th>Total Orders</th>
                  <th>Gross Order Volume</th>
                  <th>Accrued Fee (৳5/bill)</th>
                  <th>Payment Due Date</th>
                  <th>Settlement Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCycles.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                      No settlement cycles match the selected search, status, or date range.
                    </td>
                  </tr>
                ) : (
                  filteredCycles.map(cycle => {
                    const status = computeSettlementStatus(cycle, effectiveRefDate);

                    return (
                      <tr key={cycle.id + cycle.restaurantId}>
                        {/* Settlement ID */}
                        <td>
                          <span className="settlement-id-badge">{cycle.id}</span>
                        </td>

                        {/* Restaurant */}
                        <td>
                          <div className="resto-name-cell">
                            <div className="resto-icon-wrap">
                              <Store size={14} />
                            </div>
                            <span>{cycle.restaurantName}</span>
                          </div>
                        </td>

                        {/* Settlement Period */}
                        <td>
                          <div className="period-cell">
                            <Calendar size={14} className="text-slate-400" />
                            <span>{cycle.periodLabel}</span>
                            {cycle.isCurrentCycle && (
                              <span className="current-cycle-tag">Current Cycle</span>
                            )}
                          </div>
                        </td>

                        {/* Total Orders */}
                        <td>
                          <span style={{ fontWeight: 600 }}>{cycle.totalOrders}</span>
                        </td>

                        {/* Gross Order Volume */}
                        <td>
                          <span style={{ fontWeight: 600 }}>
                            ৳{cycle.grossOrderVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Accrued Fee (৳5/bill) */}
                        <td>
                          <span className="fee-accrued-text">
                            ৳{cycle.accruedFee.toLocaleString()}
                          </span>
                        </td>

                        {/* Payment Due Date */}
                        <td>
                          <span className="due-date-text">
                            {formatDateDisplay(cycle.paymentDueDate)}
                          </span>
                        </td>

                        {/* Settlement Status */}
                        <td>
                          {status === 'in_progress' && (
                            <span className="status-pill status-in-progress">
                              <RefreshCw size={12} className="animate-spin" /> In Progress
                            </span>
                          )}
                          {status === 'pending' && (
                            <span className="status-pill status-pending">
                              <Clock size={12} /> Pending
                            </span>
                          )}
                          {status === 'overdue' && (
                            <span className="status-pill status-overdue">
                              <AlertTriangle size={12} /> Overdue
                            </span>
                          )}
                          {status === 'settled' && (
                            <span className="status-pill status-settled">
                              <CheckCircle2 size={12} /> Settled
                            </span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-buttons-wrap" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn-view-details"
                              onClick={() => {
                                setSelectedCycleId(cycle.id);
                                setDetailsTab('orders');
                              }}
                            >
                              View Details
                            </button>

                            <button
                              type="button"
                              className="btn-three-dots"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === cycle.id + cycle.restaurantId ? null : cycle.id + cycle.restaurantId);
                              }}
                              title="Quick Actions"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {/* Context Menu Dropdown */}
                            {openMenuId === cycle.id + cycle.restaurantId && (
                              <div className="action-context-menu" onClick={(e) => e.stopPropagation()}>
                                {/* Options depending on status (Image 5) */}
                                {status === 'in_progress' && (
                                  <>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        setSelectedCycleId(cycle.id);
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <Eye size={14} />
                                      <span>View Settlement</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        setSelectedCycleId(cycle.id);
                                        setDetailsTab('orders');
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <Receipt size={14} />
                                      <span>View Digital Bills</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        handleExportCSV(cycle);
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <Download size={14} />
                                      <span>Export Ledger</span>
                                    </button>
                                  </>
                                )}

                                {status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => handleOpenRecordPayment(cycle)}
                                    >
                                      <CreditCard size={14} className="text-orange-600" />
                                      <span style={{ fontWeight: 700, color: '#ea580c' }}>Record Payment</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        recordCyclePayment({
                                          cycleId: cycle.id,
                                          restaurantId: cycle.restaurantId,
                                          amount: cycle.accruedFee,
                                          paymentMethod: 'Direct Settlement',
                                          notes: 'Manually marked as settled'
                                        });
                                        setCycles(getStoredSettlementCycles());
                                        setOpenMenuId(null);
                                        showToast(`Marked ${cycle.id} as Settled.`);
                                      }}
                                    >
                                      <CheckCircle2 size={14} className="text-emerald-600" />
                                      <span>Mark as Settled</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => handleSendReminder(cycle, 'Payment Reminder')}
                                    >
                                      <Send size={14} />
                                      <span>Send Reminder</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        setInvoiceModalCycle(cycle);
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <FileText size={14} />
                                      <span>Download Invoice</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        setSelectedCycleId(cycle.id);
                                        setDetailsTab('orders');
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <ShoppingBag size={14} />
                                      <span>View Orders</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        setSelectedCycleId(cycle.id);
                                        setDetailsTab('activities');
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <History size={14} />
                                      <span>View Activity Log</span>
                                    </button>
                                  </>
                                )}

                                {status === 'overdue' && (
                                  <>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => handleOpenRecordPayment(cycle)}
                                    >
                                      <CreditCard size={14} className="text-red-600" />
                                      <span style={{ fontWeight: 700, color: '#dc2626' }}>Record Payment</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        recordCyclePayment({
                                          cycleId: cycle.id,
                                          restaurantId: cycle.restaurantId,
                                          amount: cycle.accruedFee,
                                          paymentMethod: 'Overdue Clearance',
                                          notes: 'Manually cleared from overdue'
                                        });
                                        setCycles(getStoredSettlementCycles());
                                        setOpenMenuId(null);
                                        showToast(`Cleared overdue settlement ${cycle.id}.`);
                                      }}
                                    >
                                      <CheckCircle2 size={14} className="text-emerald-600" />
                                      <span>Mark as Settled</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => handleSendReminder(cycle, 'Overdue Alert')}
                                    >
                                      <Bell size={14} className="text-red-600" />
                                      <span>Send Overdue Reminder</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        setInvoiceModalCycle(cycle);
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <FileText size={14} />
                                      <span>Download Invoice</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        setSelectedCycleId(cycle.id);
                                        setDetailsTab('orders');
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <ShoppingBag size={14} />
                                      <span>View Orders</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        setSelectedCycleId(cycle.id);
                                        setDetailsTab('activities');
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <History size={14} />
                                      <span>View Activity Log</span>
                                    </button>
                                  </>
                                )}

                                {status === 'settled' && (
                                  <>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        setSelectedCycleId(cycle.id);
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <Eye size={14} />
                                      <span>View Settlement</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        setSelectedCycleId(cycle.id);
                                        setDetailsTab('payments');
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <CreditCard size={14} />
                                      <span>Payment History</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        setInvoiceModalCycle(cycle);
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <FileText size={14} />
                                      <span>Download Receipt</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        handleExportCSV(cycle);
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <Download size={14} />
                                      <span>Export Ledger</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => {
                                        setSelectedCycleId(cycle.id);
                                        setDetailsTab('activities');
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <History size={14} />
                                      <span>View Activity Log</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      {recordPaymentModalCycle && (
        <div className="db-modal-overlay" onClick={() => setRecordPaymentModalCycle(null)}>
          <div className="db-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-header">
              <h3>Record Settlement Payment ({recordPaymentModalCycle.id})</h3>
              <button
                type="button"
                className="db-modal-close-btn"
                onClick={() => setRecordPaymentModalCycle(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div className="db-modal-body">
                <div className="db-form-group">
                  <span className="db-form-label">Restaurant</span>
                  <input
                    type="text"
                    className="db-form-input"
                    value={`${recordPaymentModalCycle.restaurantName} (${recordPaymentModalCycle.restaurantCode})`}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b' }}
                  />
                </div>

                <div className="db-form-group">
                  <span className="db-form-label">Settlement Period & Accrued Fee</span>
                  <input
                    type="text"
                    className="db-form-input"
                    value={`${recordPaymentModalCycle.periodLabel} — Accrued Fee: ৳${recordPaymentModalCycle.accruedFee.toFixed(2)}`}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b' }}
                  />
                </div>

                <div className="db-form-group">
                  <label className="db-form-label">Amount to Record (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="db-form-input"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="db-form-group">
                  <label className="db-form-label">Payment Method *</label>
                  <select
                    className="db-form-select"
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  >
                    <option value="bKash Merchant Pay">bKash Merchant Pay</option>
                    <option value="Nagad Business">Nagad Business</option>
                    <option value="Bank Transfer (EFT/NPSB)">Bank Transfer (EFT/NPSB)</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Cash Clearance">Cash Clearance</option>
                  </select>
                </div>

                <div className="db-form-group">
                  <label className="db-form-label">Transaction ID / Reference Number *</label>
                  <input
                    type="text"
                    className="db-form-input"
                    value={paymentForm.transactionRef}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                    placeholder="e.g. TRX-BK-918231"
                    required
                  />
                </div>

                <div className="db-form-group">
                  <label className="db-form-label">Payment Date</label>
                  <input
                    type="date"
                    className="db-form-input"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  />
                </div>

                <div className="db-form-group">
                  <label className="db-form-label">Admin Notes</label>
                  <textarea
                    className="db-form-input"
                    rows={2}
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Optional remarks or receipt references..."
                  />
                </div>
              </div>

              <div className="db-modal-footer">
                <button
                  type="button"
                  className="btn-secondary-tool"
                  onClick={() => setRecordPaymentModalCycle(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-record"
                >
                  Confirm & Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice / Statement Modal */}
      {invoiceModalCycle && (
        <div className="db-modal-overlay" onClick={() => setInvoiceModalCycle(null)}>
          <div className="db-modal-box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-header">
              <h3>PhoneMenu Platform Fee Statement</h3>
              <button
                type="button"
                className="db-modal-close-btn"
                onClick={() => setInvoiceModalCycle(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="db-modal-body" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, color: '#fd6e00', fontWeight: 900 }}>PhoneMenu SaaS</h2>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>3D AR Digital Menu & Table Ordering Platform</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>STATEMENT #{invoiceModalCycle.id}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Date: {formatDateDisplay(new Date())}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Billed To:</span>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', marginTop: 2 }}>{invoiceModalCycle.restaurantName}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>Account ID: {invoiceModalCycle.restaurantCode}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>Category: {invoiceModalCycle.restaurantType}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Billing Period:</span>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginTop: 2 }}>{invoiceModalCycle.periodLabel}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>Due Date: {formatDateDisplay(invoiceModalCycle.paymentDueDate)}</div>
                </div>
              </div>

              <div style={{ marginTop: 20, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>Description</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Total Bills</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Rate</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '12px 14px' }}>
                        <strong>DGM Platform Service Fee</strong>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Weekly table ordering fee (৳5 per confirmed digital bill)</div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                        {invoiceModalCycle.totalOrders}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        ৳5.00
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#ea580c' }}>
                        ৳{invoiceModalCycle.accruedFee.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, padding: '14px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa' }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#9a3412' }}>Status:</span>
                  <span style={{ marginLeft: 6, fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', fontSize: 12 }}>
                    {computeSettlementStatus(invoiceModalCycle, effectiveRefDate)}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: '#64748b', marginRight: 8 }}>Total Payable:</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>
                    ৳{invoiceModalCycle.accruedFee.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="db-modal-footer">
              <button
                type="button"
                className="btn-secondary-tool"
                onClick={() => window.print()}
              >
                <Printer size={14} />
                <span>Print Statement</span>
              </button>
              <button
                type="button"
                className="btn-primary-record"
                onClick={() => setInvoiceModalCycle(null)}
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
