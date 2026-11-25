import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Wallet,
  Calendar,
  Coins,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  FileText,
  UploadCloud,
  Info,
  Send,
  Trash2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { compressImage } from '../../lib/imageCompressor';
import { uploadMediaFile } from '../../lib/mediaStorageService';
import {
  formatDhakaDate,
  formatDhakaDateTime,
  submitRestaurantPaymentProof
} from '../super/revenueSettlementService';

/**
 * Redesigned Platform Fee Due Settlement Modal (Traditional Professional SaaS UI)
 * Supports both Method 01 (Restaurant Panel QR) & Method 02 (Physical QR Stand proof submission)
 * with mandatory Payment Mobile, Transaction ID, Paid Amount, Payment Date & Time, and Screenshot.
 */
export default function RestaurantDueSettlementModal({
  isOpen,
  onClose,
  isDark = false,
  restaurantId,
  restaurantName = 'Restaurant',
  unpaidCycles = [],
  allSubmittedTransactions = [],
  initialCycleId = '',
  merchantQRConfig = {
    merchantNumber: '01854386847',
    merchantName: 'PhoneMenu bKash Merchant',
    paymentMethod: 'bKash Merchant QR',
    qrImageUrl: ''
  },
  onSubmitted
}) {
  const [selectedCycleId, setSelectedCycleId] = useState(initialCycleId || '');
  const [paymentMobile, setPaymentMobile] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotName, setScreenshotName] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const defaultCycle =
      (initialCycleId && unpaidCycles.find(c => c.id === initialCycleId)) ||
      unpaidCycles[0] ||
      null;
    setSelectedCycleId(defaultCycle?.id || '');
    setPaymentMobile('');
    setTransactionRef('');
    setPaymentNote('');
    setScreenshotUrl('');
    setScreenshotName('');
    setErrorMsg('');
    // Default local datetime-local format YYYY-MM-DDTHH:mm
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    const localIso = new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16);
    setPaymentDate(localIso);
  }, [isOpen, initialCycleId, unpaidCycles]);

  const activeCycle = useMemo(
    () => unpaidCycles.find(c => c.id === selectedCycleId) || unpaidCycles[0] || null,
    [unpaidCycles, selectedCycleId]
  );

  // Sync default paidAmount to submittableRemaining when activeCycle changes
  useEffect(() => {
    if (activeCycle) {
      const targetAmt = activeCycle.submittableRemaining > 0
        ? activeCycle.submittableRemaining
        : activeCycle.remainingDue;
      setPaidAmount(Number(targetAmt || 0).toFixed(2));
    } else {
      setPaidAmount('0.00');
    }
  }, [activeCycle?.id, activeCycle?.submittableRemaining]);

  if (!isOpen) return null;

  const merchantNum = merchantQRConfig?.merchantNumber || '01854386847';
  const isAllSettled = unpaidCycles.length === 0;
  const isLockedPendingVerification = Boolean(
    activeCycle && activeCycle.submittableRemaining <= 0 && activeCycle.latestPendingTxn
  );
  const displayDue = activeCycle ? Number(activeCycle.remainingDue || 0) : 0;

  const handleCopyMerchant = () => {
    try {
      navigator.clipboard.writeText(merchantNum);
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMsg('Screenshot file exceeds 5 MB limit. Please upload a smaller image or PDF.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Only JPG, PNG, WebP or PDF files are accepted.');
      return;
    }

    setIsUploadingProof(true);
    try {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = () => {
          setScreenshotUrl(String(reader.result || ''));
          setScreenshotName(file.name);
          setIsUploadingProof(false);
        };
        reader.onerror = () => {
          setErrorMsg('Failed reading PDF file.');
          setIsUploadingProof(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Compress receipt screenshot cleanly before uploading to server/fallback
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const compressed = await compressImage(String(reader.result || ''), {
            maxWidth: 720,
            maxHeight: 900,
            quality: 0.72,
            preferWebP: true
          });
          const uploaded = await uploadMediaFile(compressed.dataUrl, {
            filename: `proof_${restaurantId}_${Date.now()}`,
            folder: 'payment_proofs'
          });
          setScreenshotUrl(uploaded.url || compressed.dataUrl);
          setScreenshotName(file.name);
        } catch (compErr) {
          setErrorMsg('Could not process screenshot image. Please try a different image.');
        } finally {
          setIsUploadingProof(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setErrorMsg('Failed processing screenshot file.');
      setIsUploadingProof(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isUploadingProof || !activeCycle || isLockedPendingVerification) return;
    setErrorMsg('');

    const res = await (() => {
      setIsSubmitting(true);
      return submitRestaurantPaymentProof({
        restaurantId,
        restaurantName,
        cycleId: activeCycle.id,
        periodLabel: activeCycle.periodLabel,
        periodStart: activeCycle.start_at,
        periodEnd: activeCycle.endInclusive || activeCycle.periodEnd,
        ordersCount: activeCycle.totalOrders || 0,
        submittableRemaining: activeCycle.submittableRemaining,
        paymentMobile,
        transactionRef,
        amount: parseFloat(paidAmount),
        paymentDate,
        screenshotUrl,
        paymentNote,
        paymentMethod: merchantQRConfig?.paymentMethod || 'bKash Merchant QR'
      });
    })();

    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Could not submit payment proof.');
      return;
    }

    if (onSubmitted) {
      await onSubmitted(parseFloat(paidAmount), activeCycle);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-[2px]">
      <div
        className={`w-full max-w-[900px] max-h-[92vh] overflow-y-auto rounded-[12px] border shadow-2xl transition-colors ${
          isDark
            ? 'bg-[#0F172A] border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 sm:px-6 py-4 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#F97316]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                Platform Fee Due Settlement
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Pay your due with bKash, then submit your payment details.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* If all dues settled -> show clean Settled summary + recent payment history */}
          {isAllSettled ? (
            <div className="space-y-4">
              <div
                className={`p-5 rounded-[10px] border flex items-center justify-between flex-wrap gap-3 ${
                  isDark ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-[#F0FDF4] border-[#BBF7D0]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-7 h-7 text-[#16A34A] shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-[#15803D] dark:text-emerald-400">
                      All Platform Fee Dues Settled (৳0 Balance)
                    </div>
                    <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      You have no Pending or Overdue settlement cycles at this time.
                    </div>
                  </div>
                </div>
              </div>

              {allSubmittedTransactions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Recent Payment History
                  </h4>
                  <div className={`rounded-[10px] border divide-y ${isDark ? 'border-slate-800 divide-slate-800' : 'border-slate-200 divide-slate-100'}`}>
                    {allSubmittedTransactions.slice(0, 6).map(txn => (
                      <div key={txn.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold">
                            {txn.paymentId} · {txn.settlementPeriod}
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            TrxID: <span className="font-mono">{txn.transactionRef}</span> · {txn.paymentDateTimeFormatted}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#16A34A]">৳{Number(txn.amount).toFixed(2)}</div>
                          <div className="text-[11px] font-semibold capitalize text-slate-500">
                            {txn.status.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-[8px] border text-xs font-semibold cursor-pointer ${
                    isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Top Metadata Summary Strip */}
              <div
                className={`rounded-[10px] border px-4 py-3 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center ${
                  isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-[#F8FAFC] border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#F97316] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-slate-500">Settlement period</div>
                    {unpaidCycles.length > 1 ? (
                      <select
                        value={activeCycle?.id || ''}
                        onChange={e => setSelectedCycleId(e.target.value)}
                        className={`mt-0.5 text-xs font-bold bg-transparent border-b border-dashed focus:outline-none w-full ${
                          isDark ? 'border-slate-600 text-white' : 'border-slate-400 text-slate-900'
                        }`}
                      >
                        {unpaidCycles.map(c => (
                          <option key={c.id} value={c.id} className="text-slate-900">
                            {c.periodLabel} (৳{c.remainingDue.toFixed(0)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-xs font-bold truncate">{activeCycle?.periodLabel}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <div className="text-[11px] text-slate-500">Due date</div>
                    <div className="text-xs font-bold">{formatDhakaDate(activeCycle?.paymentDueDate)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Coins className="w-4 h-4 text-[#F97316] shrink-0" />
                  <div>
                    <div className="text-[11px] text-slate-500">Total due</div>
                    <div className="text-sm font-extrabold text-[#EA580C]">৳{displayDue.toFixed(2)}</div>
                  </div>
                </div>

                <div className="sm:text-right">
                  {isLockedPendingVerification ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                      <Info className="w-3.5 h-3.5" /> Verification Pending
                    </span>
                  ) : activeCycle?.status === 'overdue' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                      <AlertTriangle className="w-3.5 h-3.5" /> Overdue ({activeCycle.daysOverdue}d)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF7ED] text-[#D97706] border border-[#FED7AA]">
                      <Clock className="w-3.5 h-3.5" /> Pending payment
                    </span>
                  )}
                </div>
              </div>

              {/* Main 2-Column Body */}
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6">
                {/* LEFT COLUMN — 1 Pay with bKash */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#F97316] text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h4 className="text-sm font-bold">Pay with bKash</h4>
                  </div>

                  <div
                    className={`rounded-[12px] border p-4 flex flex-col items-center text-center ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* bKash + BANGLA QR Brand Header */}
                    <div className="mb-2.5 flex flex-col items-center">
                      <div className="flex items-center gap-1.5 text-[#E2136E] font-extrabold text-lg tracking-tight">
                        <span>বিকাশ</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#E2136E">
                          <path d="M12 2L4 9l8 4 8-4-8-7zm0 11l-8 4 8 5 8-5-8-4z" />
                        </svg>
                      </div>
                      <div className="text-[11px] font-extrabold tracking-widest text-slate-600 dark:text-slate-300 mt-0.5">
                        BANGLA <span className="text-[#E2136E]">QR</span>
                      </div>
                    </div>

                    {/* QR Card Frame */}
                    <div className="p-2.5 rounded-[14px] bg-[#E2136E] shadow-sm w-full max-w-[215px]">
                      <div className="bg-white rounded-[10px] p-2.5 flex flex-col items-center">
                        {merchantQRConfig?.qrImageUrl ? (
                          <img
                            src={merchantQRConfig.qrImageUrl}
                            alt="bKash Merchant QR"
                            className="w-40 h-40 object-contain rounded"
                          />
                        ) : (
                          <QRCodeSVG
                            value={`bKash://payment?merchant=${merchantNum}&amount=${paidAmount || displayDue}`}
                            size={156}
                            level="M"
                            bgColor="#FFFFFF"
                            fgColor="#0F172A"
                          />
                        )}
                        <div className="mt-2 pt-1.5 border-t border-slate-200 w-full text-slate-900 font-bold text-sm tracking-wider font-mono">
                          {merchantNum}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-2">
                      {merchantQRConfig?.qrImageUrl ? 'Official Merchant QR' : 'Merchant QR Preview'}
                    </div>

                    {/* Merchant Number Copy Row */}
                    <div
                      className={`mt-3 w-full rounded-[8px] border px-3 py-2 flex items-center justify-between text-xs ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className="text-slate-500">Merchant number</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="font-mono">{merchantNum}</strong>
                        <button
                          type="button"
                          onClick={handleCopyMerchant}
                          className={`p-1 rounded border cursor-pointer ${
                            isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-white'
                          }`}
                          title="Copy Merchant Number"
                        >
                          {copiedNumber ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Orange Instruction Strip */}
                    <div
                      className={`mt-2.5 w-full rounded-[8px] border px-2.5 py-2 text-[11.5px] font-semibold ${
                        isDark
                          ? 'bg-orange-950/40 border-orange-800/50 text-orange-300'
                          : 'bg-[#FFF7ED] border-[#FED7AA] text-[#C2410C]'
                      }`}
                    >
                      Open bKash → Scan QR → Pay ৳{Number(paidAmount || displayDue).toFixed(2)}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2.5 leading-snug">
                      Complete the payment before submitting. Already paid via physical QR Stand? Enter details on the right.
                    </p>
                  </div>
                </div>

                {/* RIGHT COLUMN — 2 Submit payment details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#F97316] text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <h4 className="text-sm font-bold leading-tight">Submit payment details</h4>
                      <p className="text-[11.5px] text-slate-500">
                        Enter the details from your payment receipt.
                      </p>
                    </div>
                  </div>

                  {/* Case A: Locked while Pending Verification */}
                  {isLockedPendingVerification ? (
                    <div
                      className={`rounded-[10px] border p-4 space-y-3 ${
                        isDark ? 'bg-blue-950/30 border-blue-800/60' : 'bg-[#EFF6FF] border-[#BFDBFE]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-bold text-[#1E3A8A] dark:text-blue-300">
                            Payment Verification in Progress
                          </div>
                          <p className="text-xs text-[#1D4ED8] dark:text-blue-200 mt-1">
                            Your payment of <strong>৳{Number(activeCycle.latestPendingTxn.amount).toFixed(2)}</strong> has been submitted for verification. Please do not pay again.
                          </p>
                        </div>
                      </div>

                      <div
                        className={`rounded-[8px] border p-3 text-xs space-y-1.5 ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-200'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="text-slate-500">Transaction ID</span>
                          <strong className="font-mono">{activeCycle.latestPendingTxn.transactionRef}</strong>
                        </div>
                        {activeCycle.latestPendingTxn.paymentMobile && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Payment Mobile</span>
                            <strong>{activeCycle.latestPendingTxn.paymentMobile}</strong>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Submitted At</span>
                          <strong>{formatDhakaDateTime(activeCycle.latestPendingTxn.paymentDate)}</strong>
                        </div>
                        {activeCycle.latestPendingTxn.screenshotUrl && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                            <div className="text-slate-500 mb-1.5">Submitted Screenshot</div>
                            <img
                              src={activeCycle.latestPendingTxn.screenshotUrl}
                              alt="Submitted proof"
                              className="max-h-36 rounded border border-slate-200 dark:border-slate-700 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Rejection Notice if previously rejected */}
                      {activeCycle?.latestRejectedTxn && (
                        <div className="p-3 rounded-[8px] border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <strong>Previous submission rejected:</strong>{' '}
                            {activeCycle.latestRejectedTxn.rejectionReason || 'Details did not match.'}{' '}
                            If you already paid, do not pay again — resubmit the correct Transaction ID &amp; screenshot below.
                          </div>
                        </div>
                      )}

                      {errorMsg && (
                        <div className="p-3 rounded-[8px] border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-semibold">
                          {errorMsg}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Payment mobile number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="tel"
                              value={paymentMobile}
                              onChange={e => setPaymentMobile(e.target.value)}
                              placeholder="01XXXXXXXXX"
                              required
                              className={`w-full pl-9 pr-3 py-2 rounded-[8px] border text-xs ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            The bKash number you paid from.
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Transaction ID <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={transactionRef}
                              onChange={e => setTransactionRef(e.target.value.toUpperCase())}
                              placeholder="e.g. 9X8K7D3P6Q"
                              required
                              className={`w-full pl-9 pr-3 py-2 rounded-[8px] border text-xs font-mono ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Paid amount <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="text-xs font-bold text-slate-500 absolute left-3 top-1/2 -translate-y-1/2">৳</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={activeCycle?.submittableRemaining || displayDue}
                              value={paidAmount}
                              onChange={e => setPaidAmount(e.target.value)}
                              required
                              className={`w-full pl-7 pr-3 py-2 rounded-[8px] border text-xs font-bold ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Payment date &amp; time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="datetime-local"
                            value={paymentDate}
                            onChange={e => setPaymentDate(e.target.value)}
                            required
                            className={`w-full px-3 py-2 rounded-[8px] border text-xs ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Payment Screenshot Upload Box */}
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Payment screenshot <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={handleFileSelected}
                          className="hidden"
                        />

                        {screenshotUrl ? (
                          <div
                            className={`rounded-[10px] border p-3 flex items-center justify-between gap-3 ${
                              isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {screenshotUrl.startsWith('data:application/pdf') ? (
                                <FileText className="w-8 h-8 text-red-500 shrink-0" />
                              ) : (
                                <img
                                  src={screenshotUrl}
                                  alt="Receipt preview"
                                  className="w-14 h-14 rounded object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate">{screenshotName || 'Payment Receipt Attached'}</div>
                                <div className="text-[11px] text-[#16A34A] font-semibold">✓ Ready for verification</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 text-[11px] font-semibold cursor-pointer"
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                onClick={() => { setScreenshotUrl(''); setScreenshotName(''); }}
                                className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                title="Remove file"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`rounded-[10px] border-2 border-dashed p-5 text-center cursor-pointer transition-colors ${
                              isDark
                                ? 'border-slate-700 hover:border-[#F97316] bg-slate-900/40'
                                : 'border-slate-300 hover:border-[#F97316] bg-[#FAFAFA]'
                            }`}
                          >
                            <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                            <div className="text-xs font-bold">
                              {isUploadingProof ? 'Compressing & uploading screenshot...' : 'Upload payment receipt'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">JPG, PNG or PDF · Max 5 MB</div>
                            <span
                              className={`inline-block mt-2.5 px-3 py-1 rounded-[6px] border text-xs font-semibold ${
                                isDark ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-slate-300 bg-white text-slate-700'
                              }`}
                            >
                              Choose file
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Optional Note */}
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Payment note <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                          rows={2}
                          value={paymentNote}
                          onChange={e => setPaymentNote(e.target.value)}
                          placeholder="Add a note about this payment"
                          className={`w-full px-3 py-2 rounded-[8px] border text-xs ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      {/* Verification Notice Strip */}
                      <div
                        className={`rounded-[8px] border px-3 py-2 text-[11.5px] flex items-center gap-2 ${
                          isDark
                            ? 'bg-blue-950/30 border-blue-800/50 text-blue-300'
                            : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
                        }`}
                      >
                        <Info className="w-4 h-4 shrink-0" />
                        <span>Your payment will be verified by our admin. You&apos;ll be notified once confirmed.</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Modal Footer */}
                <div
                  className={`lg:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <span className="text-xs text-slate-500">
                    {isLockedPendingVerification ? 'Verification status updates live automatically.' : 'Check your details before submitting.'}
                  </span>
                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className={`px-4 py-2 rounded-[8px] border text-xs font-semibold cursor-pointer ${
                        isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      Cancel
                    </button>
                    {!isLockedPendingVerification && (
                      <button
                        type="submit"
                        disabled={isSubmitting || isUploadingProof}
                        className="px-4 py-2 rounded-[8px] bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-55 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'Submitting...' : 'Submit for Verification'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
