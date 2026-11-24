import { supabase } from '../../lib/supabaseClient.js';

const STORAGE_KEY = 'phonemenu_digital_bills_settlements';

/**
 * Default Reference Date for demo simulation: 23 Dec 2026
 * Allows matching target specifications 100% while supporting live current date as well.
 */
export const DEFAULT_DEMO_REFERENCE_DATE = '2026-12-23';

/**
 * Initial weekly settlement cycles data matching user mockup Image 4 & Image 5.
 */
export const INITIAL_SETTLEMENT_CYCLES = [
  // 1. Monkey Bhai - Cycle 6 (Current Cycle)
  {
    id: 'ST-2026-006',
    restaurantId: 'resto_001',
    restaurantName: 'Monkey Bhai',
    restaurantCode: 'RST-1024',
    restaurantType: 'Fine Dine',
    periodStart: '2026-12-22T00:00:00.000Z',
    periodEnd: '2026-12-28T23:59:59.000Z',
    periodLabel: '22 – 28 Dec 2026',
    isCurrentCycle: true,
    totalOrders: 160,
    grossOrderVolume: 36890.00,
    feePerBill: 5.0,
    accruedFee: 800.00,
    paidAmount: 0.00,
    paymentDueDate: '2026-12-31T23:59:59.000Z',
    overdueStartDate: '2027-01-01T00:00:00.000Z',
    createdAt: '2026-12-22T00:00:00.000Z',
    lastUpdatedAt: '2026-12-23T10:30:00.000Z',
    isPaid: false,
    payments: [],
    activities: [
      {
        id: 'act_006_1',
        timestamp: '2026-12-22T00:00:00.000Z',
        title: 'Settlement Cycle Created',
        description: 'Weekly 7-day settlement cycle initialized automatically. Fee collection ongoing.',
        type: 'info'
      }
    ],
    orders: [
      { id: 'ORD-93101', date: '2026-12-22T13:10:00.000Z', amount: 540.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-93102', date: '2026-12-22T14:25:00.000Z', amount: 890.00, fee: 5.00, customer: 'Dine-in Customer', type: 'Dine-in' },
      { id: 'ORD-93103', date: '2026-12-22T19:40:00.000Z', amount: 1250.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-93104', date: '2026-12-23T12:15:00.000Z', amount: 420.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-93105', date: '2026-12-23T15:30:00.000Z', amount: 780.00, fee: 5.00, customer: 'Table 02 Guest', type: 'Dine-in' }
    ]
  },

  // 2. Monkey Bhai - Cycle 5 (Pending)
  {
    id: 'ST-2026-005',
    restaurantId: 'resto_001',
    restaurantName: 'Monkey Bhai',
    restaurantCode: 'RST-1024',
    restaurantType: 'Fine Dine',
    periodStart: '2026-12-15T00:00:00.000Z',
    periodEnd: '2026-12-21T23:59:59.000Z',
    periodLabel: '15 – 21 Dec 2026',
    isCurrentCycle: false,
    totalOrders: 97,
    grossOrderVolume: 22310.00,
    feePerBill: 5.0,
    accruedFee: 485.00,
    paidAmount: 0.00,
    paymentDueDate: '2026-12-24T23:59:59.000Z',
    overdueStartDate: '2026-12-25T00:00:00.000Z',
    createdAt: '2026-12-15T00:00:00.000Z',
    lastUpdatedAt: '2026-12-21T23:59:59.000Z',
    isPaid: false,
    payments: [],
    activities: [
      {
        id: 'act_005_1',
        timestamp: '2026-12-15T00:00:00.000Z',
        title: 'Settlement Cycle Created',
        description: 'Cycle ST-2026-005 initialized for weekly billing period.',
        type: 'info'
      },
      {
        id: 'act_005_2',
        timestamp: '2026-12-21T23:59:59.000Z',
        title: 'Fee Collection Closed',
        description: '7-day collection completed with 97 total orders. ৳485 accrued fee entered 3-day grace period.',
        type: 'warning'
      },
      {
        id: 'act_005_3',
        timestamp: '2026-12-22T10:00:00.000Z',
        title: 'Payment Invoice Dispatched',
        description: 'Automatic settlement statement generated and sent to restaurant owner.',
        type: 'info'
      }
    ],
    orders: [
      { id: 'ORD-92841', date: '2026-12-15T13:24:00.000Z', amount: 420.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-92842', date: '2026-12-15T14:18:00.000Z', amount: 680.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-92843', date: '2026-12-15T18:07:00.000Z', amount: 310.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-92844', date: '2026-12-16T12:41:00.000Z', amount: 550.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-92845', date: '2026-12-17T15:20:00.000Z', amount: 920.00, fee: 5.00, customer: 'Dine-in Customer', type: 'Dine-in' },
      { id: 'ORD-92846', date: '2026-12-18T19:35:00.000Z', amount: 1450.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-92847', date: '2026-12-19T20:10:00.000Z', amount: 780.00, fee: 5.00, customer: 'Table 01 Guest', type: 'Dine-in' },
      { id: 'ORD-92848', date: '2026-12-20T14:50:00.000Z', amount: 630.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-92849', date: '2026-12-21T21:15:00.000Z', amount: 1100.00, fee: 5.00, customer: 'Table 04 Guest', type: 'Dine-in' }
    ]
  },

  // 3. Monkey Bhai - Cycle 4 (Overdue)
  {
    id: 'ST-2026-004',
    restaurantId: 'resto_001',
    restaurantName: 'Monkey Bhai',
    restaurantCode: 'RST-1024',
    restaurantType: 'Fine Dine',
    periodStart: '2026-12-08T00:00:00.000Z',
    periodEnd: '2026-12-14T23:59:59.000Z',
    periodLabel: '8 – 14 Dec 2026',
    isCurrentCycle: false,
    totalOrders: 31,
    grossOrderVolume: 7630.92,
    feePerBill: 5.0,
    accruedFee: 155.00,
    paidAmount: 0.00,
    paymentDueDate: '2026-12-17T23:59:59.000Z',
    overdueStartDate: '2026-12-18T00:00:00.000Z',
    createdAt: '2026-12-08T00:00:00.000Z',
    lastUpdatedAt: '2026-12-18T00:00:00.000Z',
    isPaid: false,
    payments: [],
    activities: [
      {
        id: 'act_004_1',
        timestamp: '2026-12-08T00:00:00.000Z',
        title: 'Settlement Cycle Created',
        description: 'Cycle ST-2026-004 initialized for weekly period 8 – 14 Dec.',
        type: 'info'
      },
      {
        id: 'act_004_2',
        timestamp: '2026-12-17T23:59:59.000Z',
        title: 'Grace Period Expired',
        description: '3-day payment grace period ended without received payment.',
        type: 'warning'
      },
      {
        id: 'act_004_3',
        timestamp: '2026-12-18T00:00:00.000Z',
        title: 'Settlement Marked Overdue',
        description: 'Automatic transition to Overdue status. Late payment tracking active.',
        type: 'danger'
      }
    ],
    orders: [
      { id: 'ORD-91920', date: '2026-12-08T13:00:00.000Z', amount: 350.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-91921', date: '2026-12-10T19:15:00.000Z', amount: 1200.00, fee: 5.00, customer: 'Table 03 Guest', type: 'Dine-in' },
      { id: 'ORD-91922', date: '2026-12-12T20:30:00.000Z', amount: 890.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-91923', date: '2026-12-14T21:00:00.000Z', amount: 640.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' }
    ]
  },

  // 4. Monkey Bhai - Cycle 3 (Settled)
  {
    id: 'ST-2026-003',
    restaurantId: 'resto_001',
    restaurantName: 'Monkey Bhai',
    restaurantCode: 'RST-1024',
    restaurantType: 'Fine Dine',
    periodStart: '2026-12-01T00:00:00.000Z',
    periodEnd: '2026-12-07T23:59:59.000Z',
    periodLabel: '1 – 7 Dec 2026',
    isCurrentCycle: false,
    totalOrders: 80,
    grossOrderVolume: 18900.00,
    feePerBill: 5.0,
    accruedFee: 400.00,
    paidAmount: 400.00,
    paymentDueDate: '2026-12-10T23:59:59.000Z',
    overdueStartDate: '2026-12-11T00:00:00.000Z',
    createdAt: '2026-12-01T00:00:00.000Z',
    lastUpdatedAt: '2026-12-10T14:30:00.000Z',
    isPaid: true,
    settledAt: '2026-12-10T14:30:00.000Z',
    payments: [
      {
        id: 'pmt_003_1',
        date: '2026-12-10T14:30:00.000Z',
        amount: 400.00,
        method: 'bKash Merchant Pay',
        transactionRef: 'TRX-BK-918231',
        notes: 'Full weekly settlement fee cleared on time',
        recordedBy: 'Super Admin'
      }
    ],
    activities: [
      {
        id: 'act_003_1',
        timestamp: '2026-12-01T00:00:00.000Z',
        title: 'Settlement Cycle Created',
        description: 'First December settlement cycle started.',
        type: 'info'
      },
      {
        id: 'act_003_2',
        timestamp: '2026-12-07T23:59:59.000Z',
        title: 'Fee Collection Closed',
        description: '80 orders collected. Total ৳400.00 due for settlement.',
        type: 'info'
      },
      {
        id: 'act_003_3',
        timestamp: '2026-12-10T14:30:00.000Z',
        title: 'Payment Received & Settled',
        description: 'Payment of ৳400.00 received via bKash. Settlement successfully marked as Settled.',
        type: 'success'
      }
    ],
    orders: [
      { id: 'ORD-90801', date: '2026-12-01T13:40:00.000Z', amount: 480.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-90802', date: '2026-12-03T18:20:00.000Z', amount: 950.00, fee: 5.00, customer: 'Table 01 Guest', type: 'Dine-in' },
      { id: 'ORD-90803', date: '2026-12-05T20:10:00.000Z', amount: 1320.00, fee: 5.00, customer: 'Walk-in', type: 'Dine-in' },
      { id: 'ORD-90804', date: '2026-12-07T21:30:00.000Z', amount: 740.00, fee: 5.00, customer: 'Table 04 Guest', type: 'Dine-in' }
    ]
  },

  // 5. Hungry Bite Café - Cycle 5 (Pending)
  {
    id: 'ST-2026-005',
    restaurantId: 'resto_002',
    restaurantName: 'Hungry Bite Café',
    restaurantCode: 'RST-1025',
    restaurantType: 'Standard Cafe',
    periodStart: '2026-12-15T00:00:00.000Z',
    periodEnd: '2026-12-21T23:59:59.000Z',
    periodLabel: '15 – 21 Dec 2026',
    isCurrentCycle: false,
    totalOrders: 42,
    grossOrderVolume: 10920.00,
    feePerBill: 5.0,
    accruedFee: 210.00,
    paidAmount: 0.00,
    paymentDueDate: '2026-12-24T23:59:59.000Z',
    overdueStartDate: '2026-12-25T00:00:00.000Z',
    createdAt: '2026-12-15T00:00:00.000Z',
    lastUpdatedAt: '2026-12-21T23:59:59.000Z',
    isPaid: false,
    payments: [],
    activities: [
      {
        id: 'act_hb_005_1',
        timestamp: '2026-12-15T00:00:00.000Z',
        title: 'Settlement Cycle Created',
        description: 'Weekly settlement cycle initialized for Hungry Bite Café.',
        type: 'info'
      },
      {
        id: 'act_hb_005_2',
        timestamp: '2026-12-21T23:59:59.000Z',
        title: 'Fee Collection Closed',
        description: '42 customer bills recorded. ৳210 awaiting settlement.',
        type: 'warning'
      }
    ],
    orders: [
      { id: 'ORD-88101', date: '2026-12-15T12:00:00.000Z', amount: 280.00, fee: 5.00, customer: 'Customer #1', type: 'Dine-in' },
      { id: 'ORD-88102', date: '2026-12-17T17:30:00.000Z', amount: 560.00, fee: 5.00, customer: 'Customer #2', type: 'Dine-in' },
      { id: 'ORD-88103', date: '2026-12-19T19:45:00.000Z', amount: 720.00, fee: 5.00, customer: 'Customer #3', type: 'Dine-in' }
    ]
  },

  // 6. Hungry Bite Café - Cycle 4 (Overdue)
  {
    id: 'ST-2026-004',
    restaurantId: 'resto_002',
    restaurantName: 'Hungry Bite Café',
    restaurantCode: 'RST-1025',
    restaurantType: 'Standard Cafe',
    periodStart: '2026-12-08T00:00:00.000Z',
    periodEnd: '2026-12-14T23:59:59.000Z',
    periodLabel: '8 – 14 Dec 2026',
    isCurrentCycle: false,
    totalOrders: 8,
    grossOrderVolume: 2160.00,
    feePerBill: 5.0,
    accruedFee: 40.00,
    paidAmount: 0.00,
    paymentDueDate: '2026-12-17T23:59:59.000Z',
    overdueStartDate: '2026-12-18T00:00:00.000Z',
    createdAt: '2026-12-08T00:00:00.000Z',
    lastUpdatedAt: '2026-12-18T00:00:00.000Z',
    isPaid: false,
    payments: [],
    activities: [
      {
        id: 'act_hb_004_1',
        timestamp: '2026-12-08T00:00:00.000Z',
        title: 'Settlement Cycle Created',
        description: 'Cycle ST-2026-004 initialized.',
        type: 'info'
      },
      {
        id: 'act_hb_004_2',
        timestamp: '2026-12-18T00:00:00.000Z',
        title: 'Payment Overdue',
        description: '৳40 platform fee overdue since 18 Dec.',
        type: 'danger'
      }
    ],
    orders: [
      { id: 'ORD-87001', date: '2026-12-09T14:10:00.000Z', amount: 320.00, fee: 5.00, customer: 'Customer #4', type: 'Dine-in' },
      { id: 'ORD-87002', date: '2026-12-13T16:20:00.000Z', amount: 480.00, fee: 5.00, customer: 'Customer #5', type: 'Dine-in' }
    ]
  },

  // 7. Spice Lounge - Cycle 6 (Current Cycle)
  {
    id: 'ST-2026-006',
    restaurantId: 'resto_003',
    restaurantName: 'Spice Lounge',
    restaurantCode: 'RST-1026',
    restaurantType: 'Fine Dine',
    periodStart: '2026-12-22T00:00:00.000Z',
    periodEnd: '2026-12-28T23:59:59.000Z',
    periodLabel: '22 – 28 Dec 2026',
    isCurrentCycle: true,
    totalOrders: 35,
    grossOrderVolume: 8750.00,
    feePerBill: 5.0,
    accruedFee: 175.00,
    paidAmount: 0.00,
    paymentDueDate: '2026-12-31T23:59:59.000Z',
    overdueStartDate: '2027-01-01T00:00:00.000Z',
    createdAt: '2026-12-22T00:00:00.000Z',
    lastUpdatedAt: '2026-12-23T10:30:00.000Z',
    isPaid: false,
    payments: [],
    activities: [
      {
        id: 'act_sl_006_1',
        timestamp: '2026-12-22T00:00:00.000Z',
        title: 'Settlement Cycle Created',
        description: 'Active 7-day cycle started for Spice Lounge.',
        type: 'info'
      }
    ],
    orders: [
      { id: 'ORD-76101', date: '2026-12-22T13:45:00.000Z', amount: 620.00, fee: 5.00, customer: 'Table 01 Guest', type: 'Dine-in' },
      { id: 'ORD-76102', date: '2026-12-23T19:30:00.000Z', amount: 980.00, fee: 5.00, customer: 'Table 03 Guest', type: 'Dine-in' }
    ]
  },

  // 8. Spice Lounge - Cycle 5 (Pending)
  {
    id: 'ST-2026-005',
    restaurantId: 'resto_003',
    restaurantName: 'Spice Lounge',
    restaurantCode: 'RST-1026',
    restaurantType: 'Fine Dine',
    periodStart: '2026-12-15T00:00:00.000Z',
    periodEnd: '2026-12-21T23:59:59.000Z',
    periodLabel: '15 – 21 Dec 2026',
    isCurrentCycle: false,
    totalOrders: 5,
    grossOrderVolume: 2367.20,
    feePerBill: 5.0,
    accruedFee: 25.00,
    paidAmount: 0.00,
    paymentDueDate: '2026-12-24T23:59:59.000Z',
    overdueStartDate: '2026-12-25T00:00:00.000Z',
    createdAt: '2026-12-15T00:00:00.000Z',
    lastUpdatedAt: '2026-12-21T23:59:59.000Z',
    isPaid: false,
    payments: [],
    activities: [
      {
        id: 'act_sl_005_1',
        timestamp: '2026-12-15T00:00:00.000Z',
        title: 'Settlement Cycle Created',
        description: 'Cycle ST-2026-005 created.',
        type: 'info'
      },
      {
        id: 'act_sl_005_2',
        timestamp: '2026-12-21T23:59:59.000Z',
        title: 'Fee Collection Closed',
        description: '5 orders recorded. ৳25.00 awaiting settlement.',
        type: 'warning'
      }
    ],
    orders: [
      { id: 'ORD-75001', date: '2026-12-16T14:15:00.000Z', amount: 520.00, fee: 5.00, customer: 'Table 01 Guest', type: 'Dine-in' },
      { id: 'ORD-75002', date: '2026-12-18T18:40:00.000Z', amount: 840.00, fee: 5.00, customer: 'Table 02 Guest', type: 'Dine-in' }
    ]
  }
];

/**
 * Load settlements from localStorage or fall back to INITIAL_SETTLEMENT_CYCLES
 */
export const getStoredSettlementCycles = () => {
  if (typeof window === 'undefined') return INITIAL_SETTLEMENT_CYCLES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SETTLEMENT_CYCLES));
      return INITIAL_SETTLEMENT_CYCLES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SETTLEMENT_CYCLES;
  } catch (err) {
    console.warn('Error reading stored settlement cycles:', err);
    return INITIAL_SETTLEMENT_CYCLES;
  }
};

/**
 * Save settlements to localStorage
 */
export const saveStoredSettlementCycles = (cycles) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cycles));
  } catch (err) {
    console.error('Error saving settlement cycles:', err);
  }
};

/**
 * Determine dynamic status of a cycle relative to reference date.
 * Lifecycle:
 * - Paid -> 'settled'
 * - Current refDate <= periodEnd -> 'in_progress'
 * - Current refDate > periodEnd AND refDate <= dueDate -> 'pending'
 * - Current refDate > dueDate -> 'overdue'
 */
export const computeSettlementStatus = (cycle, refDate = new Date(DEFAULT_DEMO_REFERENCE_DATE)) => {
  if (!cycle) return 'in_progress';
  if (cycle.isPaid || (cycle.paidAmount != null && cycle.paidAmount >= cycle.accruedFee)) {
    return 'settled';
  }

  const now = new Date(refDate).getTime();
  const end = new Date(cycle.periodEnd).getTime();
  const due = new Date(cycle.paymentDueDate).getTime();

  if (now <= end) {
    return 'in_progress';
  } else if (now <= due) {
    return 'pending';
  } else {
    return 'overdue';
  }
};

/**
 * Calculate Summary Metric Cards matching Image 4
 */
export const computeSettlementSummary = (cycles, refDate = new Date(DEFAULT_DEMO_REFERENCE_DATE)) => {
  let totalAccruedFee = 0;
  let currentCycleFee = 0;
  let currentCycleLabel = '22 – 28 Dec 2026 (In Progress)';
  let pendingFee = 0;
  let pendingCount = 0;
  let overdueFee = 0;
  let overdueCount = 0;
  let totalSettled = 0;
  let settledCount = 0;

  cycles.forEach(c => {
    const status = computeSettlementStatus(c, refDate);
    const fee = Number(c.accruedFee || 0);
    const paid = Number(c.paidAmount || 0);

    totalAccruedFee += fee;

    if (status === 'in_progress') {
      currentCycleFee += fee;
      if (c.periodLabel) currentCycleLabel = `${c.periodLabel} (In Progress)`;
    } else if (status === 'pending') {
      pendingFee += (fee - paid);
      pendingCount += 1;
    } else if (status === 'overdue') {
      overdueFee += (fee - paid);
      overdueCount += 1;
    } else if (status === 'settled') {
      totalSettled += paid || fee;
      settledCount += 1;
    }
  });

  return {
    totalAccruedFee,
    currentCycleFee,
    currentCycleLabel,
    pendingFee,
    pendingCount,
    overdueFee,
    overdueCount,
    totalSettled,
    settledCount
  };
};

/**
 * Record a payment for a settlement cycle and sync to Supabase
 */
export const recordCyclePayment = async ({
  cycleId,
  restaurantId,
  amount,
  paymentMethod = 'bKash',
  transactionRef = '',
  paymentDate = new Date().toISOString(),
  notes = ''
}) => {
  const cycles = getStoredSettlementCycles();
  const index = cycles.findIndex(c => c.id === cycleId && c.restaurantId === restaurantId);
  if (index === -1) {
    console.error('Cycle not found:', cycleId, restaurantId);
    return { success: false, reason: 'cycle_not_found' };
  }

  const cycle = { ...cycles[index] };
  const numAmount = Number(amount || 0);
  const newPaidAmount = (Number(cycle.paidAmount || 0) + numAmount);
  const isFullyPaid = newPaidAmount >= Number(cycle.accruedFee || 0);

  const paymentRecord = {
    id: `pmt_${Date.now()}`,
    date: paymentDate,
    amount: numAmount,
    method: paymentMethod,
    transactionRef: transactionRef || `TRX-${Date.now().toString().slice(-6)}`,
    notes: notes || `Settlement payment of ৳${numAmount.toFixed(2)} recorded by Super Admin`,
    recordedBy: 'Super Admin'
  };

  const activityRecord = {
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
    title: isFullyPaid ? 'Settlement Fully Paid & Settled' : 'Partial Payment Recorded',
    description: `৳${numAmount.toFixed(2)} recorded via ${paymentMethod} (${paymentRecord.transactionRef}). ${isFullyPaid ? 'Status marked as Settled.' : `Outstanding balance: ৳${(cycle.accruedFee - newPaidAmount).toFixed(2)}`}`,
    type: isFullyPaid ? 'success' : 'info'
  };

  cycle.paidAmount = newPaidAmount;
  cycle.isPaid = isFullyPaid;
  if (isFullyPaid) {
    cycle.settledAt = paymentDate;
  }
  cycle.lastUpdatedAt = new Date().toISOString();
  cycle.payments = [paymentRecord, ...(cycle.payments || [])];
  cycle.activities = [activityRecord, ...(cycle.activities || [])];

  cycles[index] = cycle;
  saveStoredSettlementCycles(cycles);

  // Sync to Supabase settlements table for audit & multi-tenant persistence
  try {
    await supabase.from('settlements').insert([
      {
        id: `stl_${Date.now()}`,
        restaurant_id: restaurantId,
        amount: numAmount,
        fee_per_bill: cycle.feePerBill || 5,
        orders_count: cycle.totalOrders || 0,
        payment_method: paymentMethod,
        transaction_ref: paymentRecord.transactionRef,
        status: isFullyPaid ? 'cleared' : 'partial',
        period_start: cycle.periodStart,
        period_end: cycle.periodEnd,
        notes: `${cycle.id} - ${notes || 'Weekly settlement paid'}`,
        cleared_at: paymentDate,
        created_at: new Date().toISOString()
      }
    ]);
  } catch (err) {
    console.warn('Supabase settlement sync warning (saved locally):', err);
  }

  return { success: true, updatedCycle: cycle };
};

/**
 * Log an activity reminder for a cycle
 */
export const recordCycleReminder = (cycleId, restaurantId, reminderType = 'Payment Reminder') => {
  const cycles = getStoredSettlementCycles();
  const index = cycles.findIndex(c => c.id === cycleId && c.restaurantId === restaurantId);
  if (index === -1) return false;

  const cycle = { ...cycles[index] };
  const activity = {
    id: `act_rem_${Date.now()}`,
    timestamp: new Date().toISOString(),
    title: `${reminderType} Sent`,
    description: `${reminderType} notification dispatched to restaurant owner via SMS & Email.`,
    type: 'warning'
  };

  cycle.activities = [activity, ...(cycle.activities || [])];
  cycle.lastUpdatedAt = new Date().toISOString();
  cycles[index] = cycle;
  saveStoredSettlementCycles(cycles);
  return true;
};
