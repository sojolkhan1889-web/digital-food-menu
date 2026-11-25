import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Store,
  AlertCircle,
  Clock,
  History,
  Send
} from 'lucide-react';
import { computeSettlementStatus, recordCyclePayment } from './digitalBillsStore';
import {
  formatDhakaDate,
  formatDhakaDateTime,
  exportFinancialReportFile,
  downloadPaymentReceipt,
  getPaymentAuditLogs,
  updatePaymentStatusInSupabase
} from './revenueSettlementService';

/**
 * Shared Record Settlement Payment Modal
 * Reuses centralized recordCyclePayment() from digitalBillsStore.js so Digital Bills,
 * Revenue Overview, Restaurant Dues, Payment Transactions, and Dashboard stay 100% synced.
 */
export function RecordPaymentModal({
  isOpen,
  onClose,
  restaurants = [],
  cycles = [],
  effectiveRefDate = new Date(),
  initialRestaurantId = '',
  initialCycleId = '',
  onPaymentRecorded
}) {
  const [selectedRestoId, setSelectedRestoId] = useState(initialRestaurantId || '');
  const [selectedCycleId, setSelectedCycleId] = useState(initialCycleId || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bKash Merchant Pay');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Available unpaid cycles (pending / overdue / any with remaining > 0) for selected restaurant
  const unpaidCyclesForResto = useMemo(() => {
    if (!selectedRestoId) return [];
    return (cycles || [])
      .map(c => {
        const status = computeSettlementStatus(c, effectiveRefDate);
        const remaining = Math.max(0, Number(c.accruedFee || 0) - Number(c.paidAmount || 0));
        return { ...c, computedStatus: status, remaining };
      })
      .filter(
        c =>
          c.restaurantId === selectedRestoId &&
          c.remaining > 0 &&
          (c.computedStatus === 'pending' || c.computedStatus === 'overdue')
      );
  }, [cycles, selectedRestoId, effectiveRefDate]);

  // Restaurants that have unpaid cycles listed first, followed by all restaurants
  const orderedRestaurants = useMemo(() => {
    const unpaidRestoIds = new Set(
      (cycles || [])
        .filter(c => {
          const st = computeSettlementStatus(c, effectiveRefDate);
          const rem = Math.max(0, Number(c.accruedFee || 0) - Number(c.paidAmount || 0));
          return rem > 0 && (st === 'pending' || st === 'overdue');
        })
        .map(c => c.restaurantId)
    );
    return [...(restaurants || [])].sort((a, b) => {
      const aHas = unpaidRestoIds.has(a.id) ? 0 : 1;
      const bHas = unpaidRestoIds.has(b.id) ? 0 : 1;
      return aHas - bHas;
    });
  }, [restaurants, cycles, effectiveRefDate]);

  useEffect(() => {
    if (!isOpen) return;
    const defaultResto = initialRestaurantId || orderedRestaurants[0]?.id || '';
    setSelectedRestoId(defaultResto);
    setSelectedCycleId(initialCycleId || '');
    setPaymentMethod('bKash Merchant Pay');
    setTransactionRef(`TRX-${Date.now().toString().slice(-6)}`);
    setPaymentDate(new Date().toISOString().slice(0, 16));
    setNotes('');
    setConfirmed(false);
    setErrorMsg('');
  }, [isOpen, initialRestaurantId, initialCycleId, orderedRestaurants]);

  // Auto-select first unpaid cycle when restaurant changes
  useEffect(() => {
    if (!isOpen) return;
    if (initialCycleId && unpaidCyclesForResto.some(c => c.id === initialCycleId)) {
      setSelectedCycleId(initialCycleId);
    } else if (unpaidCyclesForResto.length > 0) {
      setSelectedCycleId(unpaidCyclesForResto[0].id);
    } else {
      setSelectedCycleId('');
      setAmount('');
    }
  }, [selectedRestoId, unpaidCyclesForResto, isOpen, initialCycleId]);

  const activeCycle = useMemo(
    () => unpaidCyclesForResto.find(c => c.id === selectedCycleId) || null,
    [unpaidCyclesForResto, selectedCycleId]
  );

  useEffect(() => {
    if (activeCycle) {
      setAmount(activeCycle.remaining.toFixed(2));
      setNotes(`Settlement clearance for ${activeCycle.id} (${activeCycle.periodLabel})`);
    }
  }, [activeCycle]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');

    if (!selectedRestoId) {
      setErrorMsg('Please select a restaurant.');
      return;
    }
    if (!activeCycle) {
      setErrorMsg('This restaurant has no Pending or Overdue settlement balance to record.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid positive payment amount.');
      return;
    }
    if (parsedAmount > activeCycle.remaining + 0.01) {
      setErrorMsg(`Amount cannot exceed Outstanding Payable Balance (৳${activeCycle.remaining.toFixed(2)}).`);
      return;
    }
    if (!transactionRef.trim()) {
      setErrorMsg('Transaction / Reference ID is required to prevent duplicate entries.');
      return;
    }
    if (!confirmed) {
      setErrorMsg('Please confirm that the payment has been received and verified.');
      return;
    }

    setIsSubmitting(true);
    try {
      const hasOtherUnpaidCycles = unpaidCyclesForResto.some(c => c.id !== activeCycle.id);
      const res = await recordCyclePayment({
        cycleId: activeCycle.id,
        restaurantId: selectedRestoId,
        amount: parsedAmount,
        paymentMethod,
        transactionRef: transactionRef.trim(),
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        notes: notes.trim(),
        remainingBalance: activeCycle.remaining,
        expectedAccruedFee: activeCycle.accruedFee,
        periodStart: activeCycle.start_at,
        periodEnd: activeCycle.endInclusive || activeCycle.periodEnd,
        ordersCount: activeCycle.totalOrders || 0,
        hasOtherUnpaidCycles
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Could not record payment.');
        setIsSubmitting(false);
        return;
      }

      if (onPaymentRecorded) {
        await onPaymentRecorded(res, activeCycle, parsedAmount);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Unexpected error recording payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rs-modal-overlay" onClick={onClose}>
      <div className="rs-modal" onClick={e => e.stopPropagation()}>
        <div className="rs-modal-head">
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Record Settlement Payment</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
              Record a verified payment received from a restaurant.
            </p>
          </div>
          <button type="button" className="rs-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div className="rs-error-banner" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="rs-field">
            <label className="rs-label">Select Restaurant</label>
            <select
              className="rs-input"
              value={selectedRestoId}
              onChange={e => setSelectedRestoId(e.target.value)}
            >
              {orderedRestaurants.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rs-field">
            <label className="rs-label">Select Settlement</label>
            {unpaidCyclesForResto.length === 0 ? (
              <div className="rs-balance-box" style={{ fontSize: 12.5, color: '#16A34A', fontWeight: 600 }}>
                ✓ No Pending or Overdue settlement cycles for this restaurant. All dues are settled!
              </div>
            ) : (
              <select
                className="rs-input"
                value={selectedCycleId}
                onChange={e => setSelectedCycleId(e.target.value)}
              >
                {unpaidCyclesForResto.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.id} ({c.periodLabel}) — {c.computedStatus === 'overdue' ? 'Overdue' : 'Pending'} (Due: ৳{c.remaining.toFixed(2)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {activeCycle && (
            <div className="rs-balance-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Outstanding Payable Balance</span>
                <span className={`rs-pill ${activeCycle.computedStatus}`}>
                  {activeCycle.computedStatus === 'overdue' ? 'Overdue' : 'Pending'}
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                ৳{activeCycle.remaining.toFixed(2)}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3 }}>
                Period: {activeCycle.periodLabel} · Accrued: ৳{activeCycle.accruedFee.toFixed(2)} · Paid: ৳{activeCycle.paidAmount.toFixed(2)}
              </div>
            </div>
          )}

          <div className="rs-field">
            <label className="rs-label">Payment Amount (৳)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={activeCycle ? activeCycle.remaining : undefined}
              className="rs-input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="৳ 0.00"
              disabled={!activeCycle}
              required
            />
          </div>

          <div className="rs-field">
            <label className="rs-label">Payment Method</label>
            <select
              className="rs-input"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
            >
              <option value="bKash Merchant Pay">bKash Merchant Pay</option>
              <option value="Nagad Merchant">Nagad Merchant</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <div className="rs-field">
            <label className="rs-label">Transaction / Reference ID</label>
            <input
              type="text"
              className="rs-input"
              value={transactionRef}
              onChange={e => setTransactionRef(e.target.value)}
              placeholder="Enter transaction reference"
              required
            />
          </div>

          <div className="rs-field">
            <label className="rs-label">Payment Date & Time</label>
            <input
              type="datetime-local"
              className="rs-input"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div className="rs-field">
            <label className="rs-label">Payment Note (Optional)</label>
            <input
              type="text"
              className="rs-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Enter payment note..."
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 18, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
            />
            <span>I confirm that the payment has been received and verified.</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="rs-btn rs-btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="rs-btn rs-btn-green"
              disabled={!activeCycle || isSubmitting}
            >
              <CheckCircle2 size={15} />
              <span>{isSubmitting ? 'Recording...' : 'Confirm & Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Shared Export Revenue / Dues Report Modal
 */
export function ExportReportModal({
  isOpen,
  onClose,
  defaultReportType = 'Complete Revenue Report',
  defaultDateRange = 'All Time (Live)',
  filteredSummary,
  liveBalanceSummary,
  trendBuckets,
  transactions,
  duesRows = null,
  onExported
}) {
  const [reportType, setReportType] = useState(defaultReportType);
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [fileFormat, setFileFormat] = useState('pdf');
  const [sections, setSections] = useState({
    revenueSummary: true,
    settlementBalanceSummary: true,
    revenueTrend: true,
    paymentTransactions: true
  });

  useEffect(() => {
    if (isOpen) {
      setReportType(defaultReportType);
      setDateRange(defaultDateRange);
    }
  }, [isOpen, defaultReportType, defaultDateRange]);

  if (!isOpen) return null;

  const handleExport = () => {
    exportFinancialReportFile({
      format: fileFormat,
      reportTitle: reportType,
      dateRangeLabel: dateRange,
      includeSections: sections,
      filteredSummary,
      liveBalanceSummary,
      trendBuckets,
      transactions,
      duesRows
    });
    if (onExported) onExported(fileFormat.toUpperCase());
    onClose();
  };

  return (
    <div className="rs-modal-overlay" onClick={onClose}>
      <div className="rs-modal" onClick={e => e.stopPropagation()}>
        <div className="rs-modal-head">
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Export Revenue Report</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
              Select report preferences
            </p>
          </div>
          <button type="button" className="rs-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="rs-field">
          <label className="rs-label">Report Type</label>
          <select className="rs-input" value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="Complete Revenue Report">Complete Revenue Report</option>
            <option value="Accrued Fees Summary">Accrued Fees Summary</option>
            <option value="Payment Collections Report">Payment Collections Report</option>
            <option value="Outstanding Dues Statement">Outstanding Dues Statement</option>
          </select>
        </div>

        <div className="rs-field">
          <label className="rs-label">Date Range</label>
          <select className="rs-input" value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="All Time (Live)">All Time</option>
            <option value="Today">Today</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="This Month">This Month</option>
          </select>
        </div>

        <div className="rs-field">
          <label className="rs-label">File Format</label>
          <div className="rs-format-grid">
            <button
              type="button"
              className={`rs-format-card ${fileFormat === 'pdf' ? 'selected' : ''}`}
              onClick={() => setFileFormat('pdf')}
            >
              <FileText size={20} color="#EF4444" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              className={`rs-format-card ${fileFormat === 'excel' ? 'selected' : ''}`}
              onClick={() => setFileFormat('excel')}
            >
              <FileSpreadsheet size={20} color="#16A34A" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              className={`rs-format-card ${fileFormat === 'csv' ? 'selected' : ''}`}
              onClick={() => setFileFormat('csv')}
            >
              <File size={20} color="#64748B" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div className="rs-field" style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
          <label className="rs-label" style={{ marginBottom: 10 }}>Include in report</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            {[
              ['revenueSummary', 'Revenue Summary (Date-filtered)'],
              ['settlementBalanceSummary', 'Settlement Balance Summary (As of Today)'],
              ['revenueTrend', 'Revenue Trend'],
              ['paymentTransactions', 'Payment Transactions']
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sections[key]}
                  onChange={e => setSections(prev => ({ ...prev, [key]: e.target.checked }))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button type="button" className="rs-btn rs-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="rs-btn rs-btn-orange" onClick={handleExport}>
            <Download size={15} />
            <span>Export Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Shared Payment Details Modal (with authorized Reversal/Verify/Activity Log support)
 */
export function PaymentDetailsModal({
  transaction,
  onClose,
  onStatusUpdated
}) {
  const [showReversalForm, setShowReversalForm] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  if (!transaction) return null;

  const auditLogs = getPaymentAuditLogs(transaction.id);

  const handleStatusChange = async (newStatus) => {
    setActionError('');
    if (newStatus === 'reversed' && !reversalReason.trim()) {
      setActionError('Please enter an audit reason for reversing this payment.');
      return;
    }
    setIsUpdating(true);
    const res = await updatePaymentStatusInSupabase({
      transaction,
      newStatus,
      reason: reversalReason.trim()
    });
    setIsUpdating(false);
    if (!res.success) {
      setActionError(res.error || 'Status update failed.');
      return;
    }
    setShowReversalForm(false);
    if (onStatusUpdated) await onStatusUpdated(newStatus);
    onClose();
  };

  const statusLabels = {
    verified: 'Verified Payment',
    pending_verification: 'Pending Verification',
    failed: 'Failed Payment',
    rejected: 'Rejected Payment',
    refunded: 'Refunded Payment',
    reversed: 'Reversed Payment'
  };

  return (
    <div className="rs-modal-overlay" onClick={onClose}>
      <div className="rs-modal" onClick={e => e.stopPropagation()}>
        <div className="rs-modal-head">
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Payment Details</h3>
          <button type="button" className="rs-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            background: transaction.status === 'verified' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${transaction.status === 'verified' ? '#BBF7D0' : '#FECACA'}`,
            borderRadius: 10,
            padding: '18px 16px',
            textAlign: 'center',
            marginBottom: 16
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: transaction.status === 'verified' ? '#15803D' : '#B91C1C' }}>
            <CheckCircle2 size={16} />
            <span>{statusLabels[transaction.status] || 'Payment Record'}</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: transaction.status === 'verified' ? '#16A34A' : '#DC2626', marginTop: 4 }}>
            ৳{Number(transaction.amount).toFixed(2)}
          </div>
        </div>

        <div>
          <div className="rs-detail-row"><span style={{ color: '#64748B' }}>Payment ID</span><strong>{transaction.paymentId}</strong></div>
          <div className="rs-detail-row"><span style={{ color: '#64748B' }}>Restaurant</span><strong>{transaction.restaurantName}</strong></div>
          <div className="rs-detail-row"><span style={{ color: '#64748B' }}>Payment Method</span><strong>{transaction.method}</strong></div>
          <div className="rs-detail-row"><span style={{ color: '#64748B' }}>Reference ID</span><strong>{transaction.transactionRef}</strong></div>
          <div className="rs-detail-row"><span style={{ color: '#64748B' }}>Payment Date</span><strong>{transaction.paymentDateFormatted}</strong></div>
          <div className="rs-detail-row"><span style={{ color: '#64748B' }}>Payment Time</span><strong>{transaction.paymentTimeFormatted}</strong></div>
          <div className="rs-detail-row"><span style={{ color: '#64748B' }}>Payment Source</span><strong>{transaction.paymentSource}</strong></div>
          <div className="rs-detail-row" style={{ borderBottom: 'none' }}><span style={{ color: '#64748B' }}>Verified By</span><strong>{transaction.verifiedBy}</strong></div>
        </div>

        <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 12, paddingTop: 12 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>Settlement Allocation</div>
          {transaction.allocations && transaction.allocations.length > 0 ? (
            transaction.allocations.map((al, idx) => (
              <div key={idx} className="rs-detail-row" style={{ fontSize: 12.5 }}>
                <span><strong>{al.cycleId}</strong> ({al.periodLabel})</span>
                <strong style={{ color: '#16A34A' }}>৳{Number(al.amount).toFixed(2)}</strong>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12.5, color: '#64748B' }}>
              {transaction.settlementPeriod} — <strong>৳{Number(transaction.amount).toFixed(2)}</strong>
            </div>
          )}
        </div>

        {actionError && (
          <div className="rs-error-banner" style={{ marginTop: 12 }}>
            <span>{actionError}</span>
          </div>
        )}

        {showReversalForm && (
          <div className="rs-balance-box" style={{ marginTop: 14 }}>
            <label className="rs-label" style={{ color: '#DC2626' }}>
              Authorized Reversal Reason (Preserves Audit Trail)
            </label>
            <input
              type="text"
              className="rs-input"
              value={reversalReason}
              onChange={e => setReversalReason(e.target.value)}
              placeholder="e.g. Incorrect amount / Bank bounceback..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button type="button" className="rs-btn rs-btn-outline rs-btn-sm" onClick={() => setShowReversalForm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rs-btn rs-btn-sm"
                style={{ background: '#DC2626', color: '#fff' }}
                disabled={isUpdating}
                onClick={() => handleStatusChange('reversed')}
              >
                {isUpdating ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        )}

        {showLogs && (
          <div className="rs-balance-box" style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>Activity & Audit Log</div>
            {auditLogs.length === 0 ? (
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Verified & recorded at {transaction.paymentDateTimeFormatted} by {transaction.verifiedBy}.
              </div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px dashed #E2E8F0' }}>
                  <strong>{log.action}</strong> — {log.reason}
                  <div style={{ fontSize: 11, color: '#64748B' }}>{formatDhakaDateTime(log.timestamp)} · {log.actor}</div>
                </div>
              ))
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="rs-btn rs-btn-outline rs-btn-sm" onClick={() => setShowLogs(v => !v)}>
              <History size={14} />
              <span>Activity Log</span>
            </button>
            {transaction.status === 'verified' && !showReversalForm && (
              <button
                type="button"
                className="rs-btn rs-btn-outline rs-btn-sm"
                style={{ color: '#DC2626' }}
                onClick={() => setShowReversalForm(true)}
              >
                Reverse Payment
              </button>
            )}
            {transaction.status === 'pending_verification' && (
              <button
                type="button"
                className="rs-btn rs-btn-green rs-btn-sm"
                disabled={isUpdating}
                onClick={() => handleStatusChange('verified')}
              >
                Verify Payment
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="rs-btn rs-btn-outline" onClick={onClose}>
              Close
            </button>
            <button type="button" className="rs-btn rs-btn-orange" onClick={() => downloadPaymentReceipt(transaction)}>
              <Download size={15} />
              <span>Download Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * View Dues Modal for Restaurant Dues Page (PDF Page 5)
 */
export function ViewDuesModal({
  dueRow,
  onClose,
  onRecordPayment,
  onSendReminder
}) {
  if (!dueRow) return null;

  return (
    <div className="rs-modal-overlay" onClick={onClose}>
      <div className="rs-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="rs-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="rs-resto-badge" style={{ width: 40, height: 40 }}>
              <Store size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{dueRow.restaurantName} — Due Details</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748B' }}>
                {dueRow.unpaidSettlementsCount} unpaid settlement{dueRow.unpaidSettlementsCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button type="button" className="rs-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* 3 Summary Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <div className="rs-balance-box" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 11.5, color: '#64748B' }}>Pending</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#D97706', marginTop: 2 }}>
              ৳{dueRow.pendingAmount.toLocaleString()}
            </div>
          </div>
          <div className="rs-balance-box" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 11.5, color: '#64748B' }}>Overdue</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#DC2626', marginTop: 2 }}>
              ৳{dueRow.overdueAmount.toLocaleString()}
            </div>
          </div>
          <div className="rs-balance-box" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 11.5, color: '#64748B' }}>Total Due</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
              ৳{dueRow.totalPayableDue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* List of Unpaid Cycles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dueRow.unpaidCycles.map(c => (
            <div
              key={c.id}
              style={{
                border: '1px solid #DCE4EF',
                borderRadius: 10,
                padding: 16
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong style={{ fontSize: 14 }}>{c.id}</strong>
                <span className={`rs-pill ${c.status}`}>
                  • {c.status === 'overdue' ? 'Overdue' : 'Pending'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                Settlement Period: {c.periodLabel}
              </div>

              <div className="rs-detail-row">
                <span style={{ color: '#64748B' }}>Payment Due Date</span>
                <strong>{formatDhakaDate(c.paymentDueDate)}</strong>
              </div>
              <div className="rs-detail-row">
                <span style={{ color: '#64748B' }}>Accrued Fee</span>
                <strong>৳{c.accruedFee.toLocaleString()}</strong>
              </div>
              <div className="rs-detail-row">
                <span style={{ color: '#64748B' }}>Paid Amount</span>
                <strong style={{ color: '#16A34A' }}>৳{c.paidAmount.toLocaleString()}</strong>
              </div>
              <div className="rs-detail-row">
                <span style={{ color: '#64748B' }}>Remaining Due</span>
                <strong style={{ color: '#DC2626' }}>৳{c.remainingDue.toLocaleString()}</strong>
              </div>
              <div className="rs-detail-row" style={{ borderBottom: 'none' }}>
                <span style={{ color: '#64748B' }}>Days Overdue</span>
                <strong style={{ color: c.daysOverdue > 0 ? '#DC2626' : '#64748B' }}>
                  {c.daysOverdue > 0 ? `${c.daysOverdue} day${c.daysOverdue === 1 ? '' : 's'}` : 'Within grace period'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="rs-btn rs-btn-outline rs-btn-sm"
                  onClick={() => onSendReminder(dueRow)}
                >
                  <Send size={13} />
                  <span>Send Reminder</span>
                </button>
                <button
                  type="button"
                  className="rs-btn rs-btn-green rs-btn-sm"
                  onClick={() => onRecordPayment(dueRow.restaurantId, c.id)}
                >
                  <CheckCircle2 size={14} />
                  <span>Record Payment</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
