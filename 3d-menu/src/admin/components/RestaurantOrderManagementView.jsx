import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  User,
  Clock,
  ChevronDown,
  Eye,
  Info,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Receipt
} from 'lucide-react';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' }
];

const getStatusPillClasses = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'preparing':
      return 'bg-[#1D63D0] hover:bg-[#1751B0] text-white border-[#1D63D0]';
    case 'completed':
      return 'bg-[#16A34A] hover:bg-[#15803D] text-white border-[#16A34A]';
    case 'cancelled':
      return 'bg-rose-600 hover:bg-rose-500 text-white border-rose-600';
    case 'confirmed':
      return 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600';
    default:
      return 'bg-[#E57B00] hover:bg-[#CC6D00] text-white border-[#E57B00]';
  }
};

export default function RestaurantOrderManagementView({
  orders = [],
  currency = '৳',
  isDark = false,
  onUpdateOrderStatus
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const pageSize = 6;

  // Live counts per status tab
  const statusCounts = useMemo(() => {
    const counts = { all: orders.length, pending: 0, preparing: 0, completed: 0, cancelled: 0 };
    orders.forEach((o) => {
      const st = String(o.orderStatus || 'pending').toLowerCase();
      if (st === 'pending' || st === 'confirmed') counts.pending += 1;
      else if (st === 'preparing') counts.preparing += 1;
      else if (st === 'completed') counts.completed += 1;
      else if (st === 'cancelled') counts.cancelled += 1;
    });
    return counts;
  }, [orders]);

  // Filter by status tab & search query (Order ID, Table/QR, Customer, or Item Name)
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      const st = String(o.orderStatus || 'pending').toLowerCase();
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          if (st !== 'pending' && st !== 'confirmed') return false;
        } else if (st !== statusFilter) {
          return false;
        }
      }
      if (q) {
        const matchOrderId = String(o.orderNumber || '').toLowerCase().includes(q);
        const matchTable = String(o.tableNumber || '').toLowerCase().includes(q);
        const matchCustomer = String(o.customerName || '').toLowerCase().includes(q);
        const matchItem = Array.isArray(o.items)
          ? o.items.some((it) =>
              String(it.name || it.title || '').toLowerCase().includes(q)
            )
          : false;
        if (!matchOrderId && !matchTable && !matchCustomer && !matchItem) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleStatusChange = (orderId, newStatus) => {
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, newStatus);
    }
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: newStatus } : prev));
    }
  };

  const cardSurface = isDark
    ? 'bg-[#111827] border-slate-800 text-slate-100'
    : 'bg-white border-slate-200/90 text-slate-900';

  const subtleText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/60 flex items-center justify-center text-orange-600 shrink-0 shadow-xs">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight">
            Order Management
          </h2>
          <p className={`text-xs sm:text-sm ${subtleText}`}>
            Track, fulfill, and monitor customer table orders
          </p>
        </div>
      </div>

      {/* Status Tabs & Search Bar */}
      <div className={`rounded-2xl border p-3 sm:p-3.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${cardSurface}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.key;
            const count = statusCounts[tab.key] ?? 0;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#EA580C] text-white shadow-xs'
                    : isDark
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72 shrink-0">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${subtleText}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search order ID, table, item name..."
            className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs sm:text-sm outline-none focus:ring-2 focus:ring-orange-500/30 ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500'
                : 'bg-slate-50/70 border-slate-200 text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>
      </div>

      {/* 2-Column Order Cards Grid */}
      {paginatedOrders.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center shadow-xs ${cardSurface}`}>
          <ShoppingBag className={`w-10 h-10 mx-auto mb-2.5 opacity-40 ${subtleText}`} />
          <p className="font-bold text-sm">No orders match the selected filter.</p>
          <p className={`text-xs mt-1 ${subtleText}`}>
            New customer table orders will appear here automatically in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {paginatedOrders.map((ord) => {
            const st = String(ord.orderStatus || 'pending').toLowerCase();
            const selectVal = st === 'confirmed' ? 'pending' : st;

            return (
              <div
                key={ord.id}
                className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs transition-all hover:shadow-md ${cardSurface}`}
              >
                {/* Card Top Header */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="font-mono font-extrabold text-[#EA580C] text-base tracking-tight">
                      {ord.orderNumber}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${subtleText}`}>
                      <User className="w-3.5 h-3.5" />
                      <span>{ord.tableNumber || 'Customer QR'}</span>
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${subtleText}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{ord.displayTime || 'Recent'}</span>
                    </span>
                  </div>

                  {/* Status Pill Dropdown */}
                  <div className="relative inline-block shrink-0">
                    <select
                      value={selectVal}
                      onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                      className={`appearance-none pl-3.5 pr-7 py-1.5 rounded-lg border text-xs font-bold focus:outline-none cursor-pointer transition-colors ${getStatusPillClasses(selectVal)}`}
                    >
                      <option value="pending" className="bg-white text-slate-900">Pending</option>
                      <option value="preparing" className="bg-white text-slate-900">Preparing</option>
                      <option value="completed" className="bg-white text-slate-900">Completed</option>
                      <option value="cancelled" className="bg-white text-slate-900">Cancelled</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 text-xs sm:text-[13px] min-h-[44px]">
                  {Array.isArray(ord.items) && ord.items.length > 0 ? (
                    ord.items.map((it, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-3">
                        <span className="font-medium leading-snug">
                          {it.quantity || 1}x {it.name || it.title || 'Item'}{' '}
                          <span className={subtleText}>
                            ({it.portion || 'Standard'})
                            {it.addons ? ` · ${it.addons}` : ''}
                          </span>
                        </span>
                        <span className="font-mono font-bold shrink-0">
                          {currency}{Number(it.price || 0).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className={`text-xs italic ${subtleText}`}>
                      QR session active — awaiting food item selection
                    </div>
                  )}
                </div>

                {/* Total Amount */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-xs sm:text-sm font-extrabold">Total Amount:</span>
                  <span className="text-[#EA580C] font-mono font-extrabold text-base">
                    {currency}{Number(ord.totalAmount || 0).toFixed(2)}
                  </span>
                </div>

                {/* Card Footer: View Details + Workflow Hint */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(ord)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                      isDark
                        ? 'border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  {selectVal === 'completed' ? (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Order completed &amp; fulfilled</span>
                    </span>
                  ) : selectVal === 'cancelled' ? (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-rose-500">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Order cancelled</span>
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 text-[11.5px] italic ${subtleText}`}>
                      <Info className="w-3.5 h-3.5" />
                      <span>Update status to continue workflow</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs ${subtleText}`}>
        <div>
          Showing{' '}
          <strong>
            {filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredOrders.length)}
          </strong>{' '}
          of <strong>{filteredOrders.length}</strong> orders
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`p-1.5 rounded-lg border disabled:opacity-40 cursor-pointer ${
              isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }).map((_, idx) => {
            const pNum = idx + 1;
            const active = pNum === currentPage;
            return (
              <button
                key={pNum}
                type="button"
                onClick={() => setPage(pNum)}
                className={`w-7 h-7 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#EA580C] text-white'
                    : isDark
                    ? 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={`p-1.5 rounded-lg border disabled:opacity-40 cursor-pointer ${
              isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${cardSurface}`}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-[#EA580C]" />
                <div>
                  <h3 className="font-extrabold text-base font-mono">{selectedOrder.orderNumber}</h3>
                  <p className={`text-xs ${subtleText}`}>
                    {selectedOrder.tableNumber || 'Customer QR'} · {selectedOrder.displayTime || 'Recent'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className={subtleText}>Workflow Status</span>
                <select
                  value={String(selectedOrder.orderStatus || 'pending').toLowerCase() === 'confirmed' ? 'pending' : String(selectedOrder.orderStatus || 'pending').toLowerCase()}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${getStatusPillClasses(selectedOrder.orderStatus)}`}
                >
                  <option value="pending" className="bg-white text-slate-900">Pending</option>
                  <option value="preparing" className="bg-white text-slate-900">Preparing</option>
                  <option value="completed" className="bg-white text-slate-900">Completed</option>
                  <option value="cancelled" className="bg-white text-slate-900">Cancelled</option>
                </select>
              </div>

              <div className={`rounded-xl border p-3.5 space-y-2 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#EA580C]">
                  Ordered Dishes ({selectedOrder.items?.length || 0})
                </div>
                {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 py-1 border-b last:border-b-0 border-slate-200/70 dark:border-slate-800">
                      <div>
                        <div className="font-bold">
                          {it.quantity || 1}x {it.name || it.title || 'Item'}
                        </div>
                        <div className={`text-[11px] ${subtleText}`}>
                          {it.portion || 'Standard'}{it.addons ? ` · ${it.addons}` : ''}
                        </div>
                      </div>
                      <span className="font-mono font-bold shrink-0">
                        {currency}{Number(it.price || 0).toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className={`text-xs italic ${subtleText}`}>No food items recorded yet.</div>
                )}
              </div>

              <div className="space-y-1.5 pt-1 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className={subtleText}>Subtotal</span>
                  <span className="font-mono font-semibold">{currency}{Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={subtleText}>VAT</span>
                  <span className="font-mono font-semibold">{currency}{Number(selectedOrder.vat || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={subtleText}>Service Fee</span>
                  <span className="font-mono font-semibold">{currency}{Number(selectedOrder.serviceFee || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-extrabold text-sm sm:text-base">
                  <span>Total Amount</span>
                  <span className="font-mono text-[#EA580C]">{currency}{Number(selectedOrder.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className={`px-5 py-3.5 border-t flex justify-end ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
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
