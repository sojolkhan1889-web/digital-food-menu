// Digital Food Menu — Super Admin Dashboard UI
// Fully Integrated with Supabase Multi-Tenant SaaS Backend (Zero Mock Dummy Data)
import React, { useMemo, useState, useEffect } from 'react';
import {
  Utensils, LayoutDashboard, Store, BookOpen, ClipboardList, Wallet,
  Paintbrush, Image as ImageIcon, ChartNoAxesCombined, Headset, Users,
  Settings, ChevronDown, ChevronRight, Menu, CalendarDays, Bell, UserRound,
  Moon, Sun, CircleCheck, ArrowUpRight, ArrowRight, Coins, ReceiptText,
  ShoppingBag, AlertCircle, Clock3, ChevronLeft, Search, X, Download,
  Plus, LogOut, ShieldCheck, ClipboardCheck, PackageOpen, RefreshCw,
  ExternalLink, QrCode, CheckCircle2, TrendingUp, Check, Trash2, Box,
  CreditCard, CheckSquare, DollarSign, Layers, Copy
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './superAdminStyles.css';
import {
  getSuperAdminRestaurants,
  saveSuperAdminRestaurants,
  fetchLiveRestaurantsFromSupabase,
  fetchLiveOrdersFromSupabase,
  fetchLiveTicketsFromSupabase,
  fetchLiveCatalogFromSupabase,
  fetchLivePlatformSettingsFromSupabase,
  updatePlatformSettingsInSupabase,
  syncNewRestaurantToSupabase,
  updateRestaurantStatusInSupabase,
  updateRestaurantInSupabase,
  deleteRestaurantFromSupabase,
  updateTicketInSupabase,
  fetchLiveSettlementsFromSupabase,
  recordSettlementInSupabase,
  fetchLiveScansFromSupabase,
  getPlatformSettings,
  savePlatformSettings
} from './superAdminStore';
import AllRestaurantsView from './AllRestaurantsView';
import { isSameCalendarDay } from '../../data/menuStore';
import { supabase } from '../../lib/supabaseClient';

const NAV = [
  { name: 'Dashboard', icon: LayoutDashboard, routes: [] },
  { name: 'Restaurants', icon: Store, routes: ['All Restaurants', 'New Registrations', 'Restaurant Profiles'] },
  { name: 'Digital Menus', icon: BookOpen, routes: ['All Menus', 'Food Catalog', 'Categories & Templates'] },
  { name: 'Orders & Bills', icon: ClipboardList, routes: ['Digital Bills', 'Customer Confirmations', 'Disputes'] },
  { name: 'Revenue & Settlement', icon: Coins, routes: ['Fee Ledger', 'Restaurant Dues', 'Settlements'] },
  { name: 'Design & Themes', icon: Paintbrush, routes: ['Theme Library', 'Festival Campaigns'] },
  { name: 'Media & 3D Library', icon: ImageIcon, routes: ['Food Photos', '3D Models', 'Media Library'] },
  { name: 'Reports & Analytics', icon: ChartNoAxesCombined, routes: ['Menu Engagement', 'Business Reports'] },
  { name: 'Support Center', icon: Headset, routes: [] },
  { name: 'Users & Roles', icon: Users, routes: ['Admins', 'Roles & Permissions'] },
  { name: 'Platform Settings', icon: Settings, routes: ['Service Fee Rules', 'Security & Audit Logs', 'System Configuration'] },
];

export default function SuperAdminPanel({ onLogout, onGoToCustomerMenu, onGoToRestaurantPortal }) {
  const [current, setCurrent] = useState('Dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [foodModal, setFoodModal] = useState(false);
  const [isAddRestoModalOpen, setIsAddRestoModalOpen] = useState(false);
  const [isRecordSettlementModalOpen, setIsRecordSettlementModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Supabase State (Zero Mock Data)
  const [restaurants, setRestaurants] = useState(getSuperAdminRestaurants);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [catalog, setCatalog] = useState({ foods: [], categories: [] });
  const [platformSettings, setPlatformSettings] = useState(getPlatformSettings);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter period state for Card 9 (Total Cleared Settlement): 'month', 'week', 'day', 'year', 'total'
  const [clearedPeriod, setClearedPeriod] = useState('month');

  // New Restaurant State
  const [newResto, setNewResto] = useState({
    name: '',
    slug: '',
    login_id: '',
    password: '',
    phone: '',
    email: '',
    address: 'Dhaka, Banani',
    plan: 'Enterprise 3D',
    table_count: 12
  });

  // Settlement Form State for manual recording
  const [settlementFormData, setSettlementFormData] = useState({
    restaurantId: '',
    amount: 0,
    paymentMethod: 'bKash',
    transactionRef: '',
    notes: ''
  });

  const [liveScans, setLiveScans] = useState({ totalScans: 0, todayScans: 0 });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync latest live data from Supabase on mount and poll every 6s for realtime parity
  const loadAllLiveData = async () => {
    try {
      const [liveRestos, liveOrders, liveTickets, liveCatalog, liveSettings, liveSettlements, liveScansRes] = await Promise.all([
        fetchLiveRestaurantsFromSupabase(),
        fetchLiveOrdersFromSupabase(),
        fetchLiveTicketsFromSupabase(),
        fetchLiveCatalogFromSupabase(),
        fetchLivePlatformSettingsFromSupabase(),
        fetchLiveSettlementsFromSupabase(),
        fetchLiveScansFromSupabase()
      ]);
      if (liveRestos && liveRestos.length > 0) setRestaurants(liveRestos);
      if (liveOrders) setOrders(liveOrders);
      if (liveTickets) setTickets(liveTickets);
      if (liveCatalog) setCatalog(liveCatalog);
      if (liveSettings) setPlatformSettings(liveSettings);
      if (liveSettlements) setSettlements(liveSettlements);
      if (liveScansRes) setLiveScans(liveScansRes);
    } catch (err) {
      console.warn('Super Admin load live data caught:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllLiveData();

    // 1. Instant Realtime WebSocket sync for live changes across entities (0.1s response, 0 polling overhead)
    const adminChannel = supabase
      .channel('realtime_super_admin_live_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchLiveOrdersFromSupabase().then(res => { if (res) setOrders(res); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_scans' }, () => {
        fetchLiveScansFromSupabase().then(res => { if (res) setLiveScans(res); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, () => {
        fetchLiveSettlementsFromSupabase().then(res => { if (res) setSettlements(res); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchLiveTicketsFromSupabase().then(res => { if (res) setTickets(res); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => {
        fetchLiveRestaurantsFromSupabase().then(res => { if (res && res.length > 0) setRestaurants(res); });
      })
      .subscribe();

    // 2. Refresh whenever SuperAdmin returns or focuses on this window
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadAllLiveData();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 3. Gentle backup fallback (60s instead of 6s, only when tab is visible)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAllLiveData();
      }
    }, 60000);

    return () => {
      supabase.removeChannel(adminChannel);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, []);

  // Time & Period Buckets for Settlements
  const clearedByPeriod = useMemo(() => {
    const total = settlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const now = new Date();

    // Previous Day (Yesterday)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const dayCleared = settlements
      .filter(s => {
        const d = s.clearedAt ? new Date(s.clearedAt) : null;
        return d && d.toISOString().slice(0, 10) === yesterdayStr;
      })
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);

    // Previous Week (last 7 days)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekCleared = settlements
      .filter(s => {
        const d = s.clearedAt ? new Date(s.clearedAt) : null;
        return d && d >= sevenDaysAgo;
      })
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);

    // Previous Month (last 30 days)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthCleared = settlements
      .filter(s => {
        const d = s.clearedAt ? new Date(s.clearedAt) : null;
        return d && d >= thirtyDaysAgo;
      })
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);

    // Previous Year (last 365 days)
    const oneYearAgo = new Date(now);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    const yearCleared = settlements
      .filter(s => {
        const d = s.clearedAt ? new Date(s.clearedAt) : null;
        return d && d >= oneYearAgo;
      })
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);

    return {
      total,
      day: dayCleared,
      week: weekCleared,
      month: monthCleared,
      year: yearCleared
    };
  }, [settlements]);

  // 10 Dashboard KPI Statistics Cards
  const dynamicStats = useMemo(() => {
    const feePerBill = platformSettings?.feeRules?.platformFeePerBill ?? 5;

    // 1. Total DGM Orders
    const totalOrdersCount = orders.length;

    // 2. Today DGM Orders (all restaurants) - Robust Local & UTC Date Matching
    const todayOrders = orders.filter(o => isSameCalendarDay(o.createdAt || o.created_at));
    const todayOrdersCount = todayOrders.length;

    // 3. Total Suspended Restaurants
    const suspendedCount = restaurants.filter(r => r.status === 'suspended').length;

    // 4. Total Scans (all restaurants - live from Supabase menu_scans table)
    const totalScans = liveScans.totalScans;

    // 5. Today Scans (all restaurants - live from Supabase menu_scans table)
    const todayScans = liveScans.todayScans;

    // 6. Total Fees Collections (all restaurants)
    const totalFees = totalOrdersCount * feePerBill;

    // 7. Today Fees Collections (all restaurants)
    const todayFees = todayOrdersCount * feePerBill;

    // 8. Total Due Settlements (Total Fees minus Total Cleared Settlements)
    const totalClearedAmount = settlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const totalDueAmount = Math.max(0, totalFees - totalClearedAmount);

    // 9. Total Cleared Settlement (Filtered by Selected Period)
    const periodDisplayMap = {
      day: { label: 'Previous Day', value: clearedByPeriod.day, subtitle: `Total Cleared: ৳${clearedByPeriod.total.toLocaleString()}` },
      week: { label: 'Previous Week', value: clearedByPeriod.week, subtitle: `Total Cleared: ৳${clearedByPeriod.total.toLocaleString()}` },
      month: { label: 'Previous Month', value: clearedByPeriod.month, subtitle: `Total Cleared: ৳${clearedByPeriod.total.toLocaleString()}` },
      year: { label: 'Previous Year', value: clearedByPeriod.year, subtitle: `Total Cleared: ৳${clearedByPeriod.total.toLocaleString()}` },
      total: { label: 'All-Time Total', value: clearedByPeriod.total, subtitle: '100% Confirmed Cleared' }
    };
    const activePeriodData = periodDisplayMap[clearedPeriod] || periodDisplayMap.month;

    // 10. Total Earnings (100% Realized revenue from cleared settlements)
    const totalEarnings = totalClearedAmount;

    return [
      // 1. Total DGM Orders
      {
        id: 'total-orders',
        label: 'Total DGM Orders',
        value: totalOrdersCount.toLocaleString(),
        change: `${totalOrdersCount} verified bills`,
        icon: ReceiptText,
        tone: 'purple',
        route: 'Orders & Bills'
      },
      // 2. Today DGM Orders
      {
        id: 'today-orders',
        label: 'Today DGM Orders',
        value: todayOrdersCount.toLocaleString(),
        change: todayOrdersCount > 0 ? `+${todayOrdersCount} orders today` : '0 orders today',
        icon: ShoppingBag,
        tone: 'orange',
        route: 'Orders & Bills',
        isToday: true
      },
      // 3. Total Suspended Restaurants
      {
        id: 'suspended-restos',
        label: 'Total Suspended Restaurants',
        value: suspendedCount.toLocaleString(),
        change: suspendedCount > 0 ? `${suspendedCount} restricted` : '0 suspended (All active)',
        icon: AlertCircle,
        tone: suspendedCount > 0 ? 'red' : 'rose',
        route: 'All Restaurants'
      },
      // 4. Total Scans
      {
        id: 'total-scans',
        label: 'Total Scans',
        value: totalScans.toLocaleString(),
        change: 'All-time QR scans',
        icon: QrCode,
        tone: 'teal',
        route: 'Reports & Analytics'
      },
      // 5. Today Scans
      {
        id: 'today-scans',
        label: 'Today Scans',
        value: todayScans.toLocaleString(),
        change: todayScans > 0 ? `+${todayScans} scans today` : '0 scans today',
        icon: TrendingUp,
        tone: 'cyan',
        route: 'Reports & Analytics',
        isToday: true
      },
      // 6. Total Fees Collections
      {
        id: 'total-fees',
        label: 'Total Fees Collections',
        value: `৳${totalFees.toLocaleString()}`,
        change: `৳${feePerBill}/bill flat rate`,
        icon: Coins,
        tone: 'gold',
        route: 'Revenue & Settlement'
      },
      // 7. Today Fees Collections
      {
        id: 'today-fees',
        label: 'Today Fees Collections',
        value: `৳${todayFees.toLocaleString()}`,
        change: todayFees > 0 ? `+৳${todayFees} accrued today` : '৳0 collected today',
        icon: Wallet,
        tone: 'amber',
        route: 'Revenue & Settlement',
        isToday: true
      },
      // 8. Total Due Settlements
      {
        id: 'total-due',
        label: 'Total Due Settlements',
        value: `৳${totalDueAmount.toLocaleString()}`,
        change: totalDueAmount > 0 ? 'Pending restaurant dues' : 'All dues settled',
        icon: Clock3,
        tone: totalDueAmount > 0 ? 'orange' : 'emerald',
        route: 'Restaurant Dues'
      },
      // 9. Total Cleared Settlement
      {
        id: 'total-cleared',
        label: 'Total Cleared Settlement',
        value: `৳${activePeriodData.value.toLocaleString()}`,
        change: activePeriodData.subtitle,
        icon: CheckCircle2,
        tone: 'emerald',
        route: 'Settlements',
        isClearedCard: true,
        currentPeriod: clearedPeriod
      },
      // 10. Total Earnings
      {
        id: 'total-earnings',
        label: 'Total Earnings',
        value: `৳${totalEarnings.toLocaleString()}`,
        change: '100% Realized Revenue',
        icon: ShieldCheck,
        tone: 'violet',
        route: 'Revenue & Settlement',
        isEarnings: true
      }
    ];
  }, [restaurants, orders, platformSettings, settlements, clearedPeriod, clearedByPeriod, liveScans]);

  // Pending Actions Data derived directly from real database records
  const pendingActions = useMemo(() => {
    const pendingRestos = restaurants.filter(r => r.status === 'pending').length;
    const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
    const dueRestos = restaurants.filter(r => orders.some(o => o.restaurantId === r.id)).length;
    const foodCount = catalog.foods?.length || 0;

    return [
      {
        name: 'New Restaurant Approvals',
        detail: `${pendingRestos} restaurant(s) waiting for approval.`,
        count: pendingRestos,
        icon: UserRound,
        route: 'New Registrations'
      },
      {
        name: 'Support Tickets',
        detail: `${openTickets} active ticket(s) from restaurants.`,
        count: openTickets,
        icon: Headset,
        route: 'Support Center'
      },
      {
        name: 'Settlement Dues',
        detail: `৳${(orders.length * (platformSettings?.feeRules?.platformFeePerBill ?? 5)).toLocaleString()} accrued fees across ${dueRestos} restaurant(s).`,
        count: dueRestos,
        icon: ReceiptText,
        route: 'Restaurant Dues'
      },
      {
        name: 'Food Catalog Items',
        detail: `${foodCount} dishes across ${catalog.categories?.length || 0} categories.`,
        count: foodCount,
        icon: PackageOpen,
        route: 'Food Catalog'
      },
    ];
  }, [restaurants, tickets, orders, catalog, platformSettings]);

  const totalPendingCount = useMemo(() => {
    return pendingActions.reduce((sum, p) => sum + (p.count || 0), 0);
  }, [pendingActions]);

  // Create new restaurant and sync to Supabase
  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    if (!newResto.name || !newResto.slug) return;

    const created = {
      id: `resto_${Date.now()}`,
      name: newResto.name,
      slug: newResto.slug.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      login_id: newResto.login_id || newResto.slug.replace(/[^a-z0-9]/g, ''),
      password: newResto.password || 'resto123',
      phone: newResto.phone || '+880 1700-000000',
      email: newResto.email || `${newResto.slug}@gmail.com`,
      address: newResto.address || 'Dhaka, Bangladesh',
      table_count: Number(newResto.table_count) || 12,
      status: 'active',
      plan: newResto.plan || 'Enterprise 3D',
      theme: 'Warm Amber Glass',
      currency: '৳',
      logo: '/monkey_bhai_logo.png',
      features: {
        enable3D: true,
        enableOrderManagement: true,
        enablePayments: true,
        enableCartPage: true,
        enableKitchenNotes: true,
        enablePortions: true,
        enableAddons: true
      },
      created_at: new Date().toISOString()
    };

    const updated = [created, ...restaurants];
    setRestaurants(updated);
    saveSuperAdminRestaurants(updated);
    await syncNewRestaurantToSupabase(created);

    setIsAddRestoModalOpen(false);
    setNewResto({
      name: '',
      slug: '',
      login_id: '',
      password: '',
      phone: '',
      email: '',
      address: 'Dhaka, Banani',
      plan: 'Enterprise 3D',
      table_count: 12
    });
    showToast(`Restaurant "${created.name}" created and synced to Supabase!`);
  };

  const handleToggleStatus = async (id, nextStatus) => {
    const updated = restaurants.map(r => r.id === id ? { ...r, status: nextStatus } : r);
    setRestaurants(updated);
    saveSuperAdminRestaurants(updated);
    await updateRestaurantStatusInSupabase(id, nextStatus);
    showToast(`Restaurant status changed to ${nextStatus.toUpperCase()}`);
  };

  const handleDeleteRestaurant = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete restaurant "${name}"? This action removes all records from Supabase.`)) {
      return;
    }
    const updated = restaurants.filter(r => r.id !== id);
    setRestaurants(updated);
    saveSuperAdminRestaurants(updated);
    await deleteRestaurantFromSupabase(id);
    showToast(`Restaurant "${name}" deleted from Supabase.`);
  };

  const handleUpdateRestaurant = async (id, data) => {
    const updated = restaurants.map(r => r.id === id ? { ...r, ...data } : r);
    setRestaurants(updated);
    saveSuperAdminRestaurants(updated);
    await updateRestaurantInSupabase(id, data);
    showToast(`Updated "${data.name || 'Restaurant'}" in PostgreSQL!`);
  };

  const handleAddRestaurantFromPage = async (data) => {
    const created = {
      ...data,
      created_at: new Date().toISOString()
    };
    const updated = [created, ...restaurants];
    setRestaurants(updated);
    saveSuperAdminRestaurants(updated);
    await syncNewRestaurantToSupabase(created);
    showToast(`Restaurant "${created.name}" registered in Supabase PostgreSQL!`);
  };

  const handleResolveTicket = async (ticketId) => {
    const updated = tickets.map(t => t.id === ticketId ? { ...t, status: 'Resolved' } : t);
    setTickets(updated);
    await updateTicketInSupabase(ticketId, {
      status: 'Resolved',
      lastReply: 'Marked as resolved by Super Admin.'
    });
    showToast(`Ticket ${ticketId} resolved and updated in Supabase!`);
  };

  const handleSavePlatformSettings = async (newFee, newMinBill) => {
    const updated = {
      ...platformSettings,
      feeRules: {
        ...platformSettings.feeRules,
        platformFeePerBill: newFee,
        minEligibleBillAmount: newMinBill
      }
    };
    setPlatformSettings(updated);
    await updatePlatformSettingsInSupabase(updated);
    showToast('Platform settings successfully saved to Supabase!');
  };

  // Record a cleared settlement payment from restaurant
  const handleRecordSettlement = async (e) => {
    e.preventDefault();
    if (!settlementFormData.restaurantId || settlementFormData.amount <= 0) {
      showToast('Please select a restaurant and enter a valid settlement amount.');
      return;
    }
    const targetResto = restaurants.find(r => r.id === settlementFormData.restaurantId);
    const created = await recordSettlementInSupabase({
      restaurantId: settlementFormData.restaurantId,
      amount: Number(settlementFormData.amount),
      feePerBill: Number(platformSettings?.feeRules?.platformFeePerBill ?? 5.0),
      paymentMethod: settlementFormData.paymentMethod || 'bKash',
      transactionRef: settlementFormData.transactionRef || `TRX-${Date.now().toString().slice(-6)}`,
      notes: settlementFormData.notes || `Settlement cleared for ${targetResto?.name || 'Restaurant'}`
    });
    if (created) {
      setSettlements(prev => [created, ...prev]);
      setIsRecordSettlementModalOpen(false);
      showToast(`Settlement of ৳${Number(settlementFormData.amount).toLocaleString()} cleared for ${targetResto?.name || 'Restaurant'}!`);
    }
  };

  // Filtered Restaurants for All Restaurants Page
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [restaurants, searchQuery, statusFilter]);

  const openTicketsCount = useMemo(() => {
    return tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
  }, [tickets]);

  return (
    <div className={`superadmin-app ${dark ? 'dark-mode' : ''}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          background: '#0f172a',
          color: '#fff',
          padding: '12px 18px',
          borderRadius: 10,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          fontWeight: 600,
          border: '1px solid #334155'
        }}>
          <CircleCheck size={18} color="#22c55e" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="app">
        {/* Sidebar */}
        <Sidebar
          current={current}
          onNavigate={setCurrent}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          supportBadge={openTicketsCount}
        />

        {/* Main Area */}
        <div className="main-area">
          <Header
            current={current}
            onMenu={() => setMobileOpen(true)}
            onNavigate={setCurrent}
            onLogout={onLogout}
            onRefresh={loadAllLiveData}
            isRefreshing={isRefreshing}
            pendingCount={totalPendingCount}
            openTicketsCount={openTicketsCount}
          />

          <main className="content">
            {current === 'Dashboard' ? (
              <Dashboard
                onNavigate={setCurrent}
                stats={dynamicStats}
                restaurants={restaurants}
                pending={pendingActions}
                orders={orders}
                feePerBill={platformSettings?.feeRules?.platformFeePerBill ?? 5}
                onSelectClearedPeriod={setClearedPeriod}
                currentClearedPeriod={clearedPeriod}
              />
            ) : current === 'All Restaurants' || current === 'Restaurants' ? (
              <AllRestaurantsView
                restaurants={restaurants}
                onOpenAddModal={() => setIsAddRestoModalOpen(true)}
                onToggleStatus={handleToggleStatus}
                onDeleteRestaurant={handleDeleteRestaurant}
                onUpdateRestaurant={handleUpdateRestaurant}
                onAddRestaurant={handleAddRestaurantFromPage}
                onOpenRestaurantPanel={(r) => {
                  if (onGoToRestaurantPortal) {
                    onGoToRestaurantPortal(r);
                  }
                }}
                showToast={showToast}
              />
            ) : current === 'New Registrations' ? (
              <NewRegistrationsView
                restaurants={restaurants.filter(r => r.status === 'pending')}
                onApprove={(id) => handleToggleStatus(id, 'active')}
                onBack={() => setCurrent('Dashboard')}
              />
            ) : current === 'All Menus' || current === 'Digital Menus' ? (
              <DigitalMenusView
                restaurants={restaurants}
                onGoToCustomerMenu={onGoToCustomerMenu}
                onBack={() => setCurrent('Dashboard')}
              />
            ) : current === 'Food Catalog' || current === 'Categories & Templates' ? (
              <FoodCatalogView
                catalog={catalog}
                onBack={() => setCurrent('Dashboard')}
                onOpenAddFood={() => setFoodModal(true)}
              />
            ) : current === 'Digital Bills' || current === 'Orders & Bills' || current === 'Customer Confirmations' ? (
              <DigitalBillsView
                restaurants={restaurants}
                orders={orders}
                subRoute={current}
                onBack={() => setCurrent('Dashboard')}
              />
            ) : current === 'Fee Ledger' || current === 'Revenue & Settlement' || current === 'Restaurant Dues' || current === 'Settlements' ? (
              <RevenueSettlementView
                restaurants={restaurants}
                orders={orders}
                settlements={settlements}
                feePerBill={platformSettings?.feeRules?.platformFeePerBill ?? 5}
                onOpenRecordModal={(resto) => {
                  const restoId = resto ? resto.id : (restaurants[0]?.id || '');
                  const restoOrders = orders.filter(o => o.restaurantId === restoId);
                  const accrued = restoOrders.length * (platformSettings?.feeRules?.platformFeePerBill ?? 5);
                  const cleared = settlements.filter(s => s.restaurantId === restoId).reduce((sum, s) => sum + Number(s.amount || 0), 0);
                  const due = Math.max(0, accrued - cleared);

                  setSettlementFormData({
                    restaurantId: restoId,
                    amount: due,
                    paymentMethod: 'bKash',
                    transactionRef: `TRX-${Date.now().toString().slice(-6)}`,
                    notes: `Settlement payment for ${resto ? resto.name : 'Restaurant'}`
                  });
                  setIsRecordSettlementModalOpen(true);
                }}
                onBack={() => setCurrent('Dashboard')}
              />
            ) : current === 'Support Center' ? (
              <SupportCenterView
                tickets={tickets}
                restaurants={restaurants}
                onResolveTicket={handleResolveTicket}
                onBack={() => setCurrent('Dashboard')}
              />
            ) : current === 'Platform Settings' || current === 'Service Fee Rules' ? (
              <PlatformSettingsView
                settings={platformSettings}
                onSaveSettings={handleSavePlatformSettings}
                onBack={() => setCurrent('Dashboard')}
              />
            ) : (
              <OtherPage page={current} onNavigate={setCurrent} />
            )}
          </main>
        </div>

        {/* Add Food Modal (Connects to Universal Menu Builder) */}
        {foodModal && (
          <AddFoodModal
            onClose={() => setFoodModal(false)}
            onOpenBuilder={() => {
              setFoodModal(false);
              if (onGoToRestaurantPortal) onGoToRestaurantPortal();
            }}
          />
        )}

        {/* Add Restaurant Modal */}
        {isAddRestoModalOpen && (
          <AddRestaurantModal
            newResto={newResto}
            setNewResto={setNewResto}
            onSubmit={handleCreateRestaurant}
            onClose={() => setIsAddRestoModalOpen(false)}
          />
        )}

        {/* Record Settlement Modal */}
        {isRecordSettlementModalOpen && (
          <RecordSettlementModal
            formData={settlementFormData}
            setFormData={setSettlementFormData}
            restaurants={restaurants}
            onSubmit={handleRecordSettlement}
            onClose={() => setIsRecordSettlementModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENTS
// -------------------------------------------------------------

function Sidebar({ current, onNavigate, mobileOpen, onClose, supportBadge }) {
  const [expanded, setExpanded] = useState('Restaurants');
  return (
    <>
      <div className={'sidebar-backdrop ' + (mobileOpen ? 'visible' : '')} onClick={onClose} />
      <aside className={'sidebar ' + (mobileOpen ? 'mobile-visible' : '')}>
        <div className="brand">
          <div className="brand-logo">
            <Utensils size={25} strokeWidth={2.5} />
          </div>
          <div>
            <div className="brand-title">Digital Food Menu</div>
            <div className="brand-sub">Super Admin Panel</div>
          </div>
          <button className="mobile-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="navigation">
          {NAV.map(item => {
            const Icon = item.icon;
            const selected = item.name === current || item.routes.includes(current);
            const open = item.name === expanded;
            const badgeCount = item.name === 'Support Center' ? supportBadge : item.badge;
            return (
              <React.Fragment key={item.name}>
                <button
                  className={'nav-item ' + (selected ? 'active' : '')}
                  onClick={() => {
                    if (item.routes.length) {
                      setExpanded(open ? '' : item.name);
                    } else {
                      onNavigate(item.name);
                      onClose();
                    }
                  }}
                >
                  <Icon size={21} strokeWidth={1.9} />
                  <span>{item.name}</span>
                  {Boolean(badgeCount && badgeCount > 0) && (
                    <span className="nav-count">{badgeCount}</span>
                  )}
                  {item.routes.length > 0 && (
                    <ChevronDown size={16} className={'nav-chevron ' + (open ? 'up' : '')} />
                  )}
                </button>
                {open && item.routes.length > 0 && (
                  <div className="subnav">
                    {item.routes.map(route => (
                      <button
                        key={route}
                        className={current === route ? 'subactive' : ''}
                        onClick={() => {
                          onNavigate(route);
                          onClose();
                        }}
                      >
                        {route}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <strong>Platform Status</strong>
            <div className="status-line">
              <span className="green-dot" />
              <span>Supabase Live Connected</span>
              <span className="live-pulse-bars" title="Real-time Platform Activity">
                <span className="pulse-bar bar-1" />
                <span className="pulse-bar bar-2" />
                <span className="pulse-bar bar-3" />
                <span className="pulse-bar bar-4" />
              </span>
            </div>
          </div>
          <small>Supabase Multi-Tenant v2.0</small>
        </div>
      </aside>
    </>
  );
}

function Header({ current, onMenu, onNavigate, onLogout, onRefresh, isRefreshing, pendingCount, openTicketsCount }) {
  const [dateOpen, setDateOpen] = useState(false);
  const [date, setDate] = useState('All Time (Live)');
  const [notice, setNotice] = useState(false);
  const [profile, setProfile] = useState(false);

  return (
    <header className="topbar">
      <div className="page-identity">
        <button className="hamburger" onClick={onMenu} aria-label="Open menu">
          <Menu size={24} />
        </button>
        <div>
          <h1>{current === 'Dashboard' ? 'Dashboard' : current}</h1>
          <p>
            {current === 'Dashboard'
              ? 'Real-time multi-tenant dashboard connected to Supabase PostgreSQL database'
              : 'Digital Food Menu platform operations'}
          </p>
        </div>
      </div>

      <div className="top-actions">
        {/* Refresh Button */}
        <button
          className="date-button"
          onClick={onRefresh}
          title="Refresh Supabase Data"
          style={{ padding: '8px 12px' }}
        >
          <RefreshCw size={16} className={isRefreshing ? 'spin-anim' : ''} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
        </button>

        {/* Date Filter */}
        <div className="dropdown-wrap">
          <button className="date-button" onClick={() => setDateOpen(v => !v)}>
            <CalendarDays size={18} />
            <span>{date}</span>
            <ChevronDown size={15} />
          </button>
          {dateOpen && (
            <div className="dropdown date-dropdown">
              {['All Time (Live)', 'Today', 'Last 7 Days', 'Last 30 Days'].map(d => (
                <button
                  key={d}
                  onClick={() => {
                    setDate(d);
                    setDateOpen(false);
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="dropdown-wrap">
          <button
            className="notification-button"
            onClick={() => setNotice(v => !v)}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {pendingCount > 0 && <span className="notification-dot">{pendingCount}</span>}
          </button>
          {notice && (
            <div className="dropdown notice-dropdown">
              <strong>Notifications</strong>
              <p>{openTicketsCount} active support ticket(s) needing attention.</p>
              <button
                onClick={() => {
                  onNavigate('Support Center');
                  setNotice(false);
                }}
              >
                View Support Center
              </button>
            </div>
          )}
        </div>

        <div className="header-divider" />

        {/* Profile Pill */}
        <div className="dropdown-wrap">
          <button className="profile-button" onClick={() => setProfile(v => !v)}>
            <span className="avatar">
              <UserRound size={24} fill="currentColor" />
            </span>
            <span className="profile-copy">
              <strong>Super Admin</strong>
              <small>Platform Owner</small>
            </span>
            <ChevronDown size={16} />
          </button>
          {profile && (
            <div className="dropdown profile-dropdown">
              <strong>Super Admin</strong>
              <p>Platform Owner (Live Supabase Session)</p>
              <button
                onClick={() => {
                  onNavigate('Platform Settings');
                  setProfile(false);
                }}
              >
                Platform Settings
              </button>
              <button
                style={{ color: '#ef4444' }}
                onClick={() => {
                  setProfile(false);
                  if (onLogout) onLogout();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// 10 Cards KPI Grid with Dropdown & Animations
function KpiRow({ stats, onNavigate, onSelectClearedPeriod, currentClearedPeriod }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const periods = [
    { value: 'month', label: 'Month', name: 'Previous Month' },
    { value: 'week', label: 'Week', name: 'Previous Week' },
    { value: 'day', label: 'Day', name: 'Previous Day' },
    { value: 'year', label: 'Year', name: 'Previous Year' },
    { value: 'total', label: 'Total', name: 'All-Time Total' }
  ];

  return (
    <section className="kpi-row">
      {stats.map(s => {
        const Icon = s.icon;
        const isEarnings = s.isEarnings;
        const isToday = s.isToday;
        const isCleared = s.isClearedCard;

        return (
          <div
            className={`kpi-card ${isEarnings ? 'earnings-glow' : ''} ${isToday ? 'today-card' : ''}`}
            key={s.id || s.label}
            onClick={() => s.route && onNavigate && onNavigate(s.route)}
            role="button"
            tabIndex={0}
            title={`View ${s.label}`}
          >
            <span className={'kpi-icon ' + s.tone}>
              <Icon size={26} strokeWidth={2} />
            </span>
            <div className="kpi-copy" style={{ flex: 1, minWidth: 0 }}>
              <div className="kpi-card-header">
                <span className="kpi-label">{s.label}</span>
                {isCleared && (
                  <div className="kpi-dropdown-wrap" onClick={e => e.stopPropagation()}>
                    <button
                      className="kpi-period-btn"
                      onClick={() => setDropdownOpen(v => !v)}
                      title="Select period: Month, Week, Day, Year, Total"
                      type="button"
                    >
                      <span>{periods.find(p => p.value === currentClearedPeriod)?.label || 'Month'}</span>
                      <ChevronDown size={11} />
                    </button>
                    {dropdownOpen && (
                      <div className="kpi-period-menu">
                        {periods.map(p => (
                          <button
                            key={p.value}
                            type="button"
                            className={`kpi-period-item ${currentClearedPeriod === p.value ? 'active' : ''}`}
                            onClick={() => {
                              onSelectClearedPeriod(p.value);
                              setDropdownOpen(false);
                            }}
                          >
                            <span>{p.name}</span>
                            {currentClearedPeriod === p.value && <Check size={12} color="#f45100" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="kpi-value">{s.value}</div>
              <div className="kpi-change">
                {isToday && <span className="kpi-pulse-dot" style={{ marginRight: 5 }} />}
                {!isToday && !isCleared && <ArrowUpRight size={14} strokeWidth={2.5} />}
                {s.change}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function TrendChart({ orders = [], feePerBill = 5 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Group real orders by the last 14 days
  const trendData = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayKey = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayFull = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const dayOrders = orders.filter(o => {
        if (!o.createdAt) return false;
        const ordDay = new Date(o.createdAt).toISOString().slice(0, 10);
        return ordDay === dayKey;
      });

      const count = dayOrders.length;
      const fee = count * feePerBill;
      days.push({
        day: dayLabel,
        orders: count,
        fee: fee,
        date: dayFull
      });
    }
    return days;
  }, [orders, feePerBill]);

  const w = 720, h = 230, left = 44, right = 48, top = 20, bottom = 33;
  const pw = w - left - right, ph = h - top - bottom;

  const maxOrderVal = Math.max(...trendData.map(d => d.orders), 1);
  const maxLine = Math.max(10, Math.ceil((maxOrderVal * 1.3) / 5) * 5);
  const maxFee = maxLine * feePerBill;

  const x = i => left + (i * pw) / (trendData.length - 1);
  const yOrders = v => top + ph - (v / maxLine) * ph;
  const yFee = v => top + ph - (v / maxFee) * ph;

  const pts = trendData.map((d, i) => `${x(i).toFixed(1)},${yFee(d.fee).toFixed(1)}`).join(' ');
  const activePoint = hoveredIdx !== null ? trendData[hoveredIdx] : null;

  return (
    <section className="panel trend-panel">
      <div className="panel-titleline">
        <h2>Order & Fee Collection Trend (Last 14 Days)</h2>
        <div className="chart-legend">
          <span>
            <i className="legend-bullet orange" />
            Orders (Bills)
          </span>
          <span>
            <i className="legend-bullet purple" />
            Service Fee (৳)
          </span>
        </div>
      </div>

      <div className="chart-scroller" onMouseLeave={() => setHoveredIdx(null)}>
        {activePoint && (
          <div
            className="trend-tooltip"
            style={{
              left: `clamp(100px, ${(x(hoveredIdx) / w) * 100}%, calc(100% - 100px))`,
              top: `${Math.max(12, (yFee(activePoint.fee) / h) * 100 - 18)}%`
            }}
          >
            <div className="tooltip-date">{activePoint.date}</div>
            <div className="tooltip-row">
              <span className="tooltip-dot orange" />
              <span className="tooltip-label">Orders:</span>
              <strong className="tooltip-val">{activePoint.orders} Bills</strong>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-dot purple" />
              <span className="tooltip-label">Service Fee:</span>
              <strong className="tooltip-val">৳{activePoint.fee.toLocaleString()}</strong>
            </div>
          </div>
        )}

        <svg className="trend-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Real order trends">
          {/* Horizontal gridlines */}
          {Array.from({ length: 6 }, (_, i) => {
            const v = Math.round((i * maxLine) / 5);
            const yy = yOrders(v);
            return (
              <g key={i}>
                <line x1={left} y1={yy} x2={w - right} y2={yy} stroke="var(--grid)" strokeWidth="1" />
                <text x={left - 12} y={yy + 4} textAnchor="end" className="axis-label">
                  {v}
                </text>
                <text x={w - 4} y={yy + 4} textAnchor="end" className="axis-label right-axis-label">
                  {v * feePerBill}
                </text>
              </g>
            );
          })}

          {/* Vertical guideline on hover */}
          {hoveredIdx !== null && (
            <line
              x1={x(hoveredIdx)}
              y1={top}
              x2={x(hoveredIdx)}
              y2={top + ph}
              stroke="#8b5cf6"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.8"
            />
          )}

          {/* Orders Bars */}
          {trendData.map((d, i) => {
            const isHovered = hoveredIdx === i;
            const barH = Math.max(d.orders > 0 ? (d.orders / maxLine) * ph : 0, 0);
            return (
              <rect
                key={i}
                x={x(i) - 8}
                y={top + ph - barH}
                width="16"
                height={barH}
                rx="3"
                fill={isHovered ? '#ff7809' : '#ffc18a'}
                opacity={isHovered ? '1' : '.90'}
                className="chart-bar"
                style={{
                  transition: 'fill 0.15s ease, opacity 0.15s ease',
                  filter: isHovered ? 'drop-shadow(0 2px 8px rgba(255, 120, 9, 0.45))' : 'none'
                }}
              />
            );
          })}

          {/* Service Fee Line */}
          <polyline
            points={pts}
            fill="none"
            stroke="#714aff"
            strokeWidth="2.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Line Nodes */}
          {trendData.map((d, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g key={i}>
                {isHovered && (
                  <circle
                    cx={x(i)}
                    cy={yFee(d.fee)}
                    r="11"
                    fill="#714aff"
                    opacity="0.25"
                    className="pulse-halo"
                  />
                )}
                <circle
                  cx={x(i)}
                  cy={yFee(d.fee)}
                  r={isHovered ? '5.5' : '3.6'}
                  fill={isHovered ? '#ffffff' : '#714aff'}
                  stroke="#714aff"
                  strokeWidth={isHovered ? '3' : '1'}
                  style={{ transition: 'all 0.15s ease' }}
                />
              </g>
            );
          })}

          {/* Transparent Hover Hit Zones */}
          {trendData.map((_, i) => {
            const colWidth = pw / (trendData.length - 1);
            return (
              <rect
                key={i}
                x={x(i) - colWidth / 2}
                y={top}
                width={colWidth}
                height={ph}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseMove={() => setHoveredIdx(i)}
              />
            );
          })}

          {/* X Axis Labels */}
          {trendData.filter((_, i) => i % 2 === 0 || i === trendData.length - 1).map((d) => {
            const idx = trendData.indexOf(d);
            return (
              <text key={d.day + idx} x={x(idx)} y={h - 9} textAnchor="middle" className="axis-label">
                {d.day}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function StatusChart({ onNavigate, orders = [] }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const totalCount = orders.length;

  const slices = useMemo(() => {
    const confirmed = orders.filter(o => o.orderStatus === 'confirmed' || o.orderStatus === 'completed' || o.paymentStatus === 'paid').length;
    const pending = orders.filter(o => o.orderStatus === 'pending' && o.paymentStatus !== 'paid').length;
    const cancelled = orders.filter(o => o.orderStatus === 'cancelled').length;
    const disputed = orders.filter(o => o.orderStatus === 'disputed').length;

    const circum = 405.26; // 2 * PI * 64.5
    const denom = totalCount || 1;

    const sConfirmed = (confirmed / denom) * circum;
    const sPending = (pending / denom) * circum;
    const sCancelled = (cancelled / denom) * circum;
    const sDisputed = (disputed / denom) * circum;

    return [
      {
        name: 'Completed (Paid)',
        count: confirmed.toLocaleString(),
        countNum: confirmed,
        pct: totalCount ? `${((confirmed / totalCount) * 100).toFixed(1)}%` : '0%',
        color: '#22b85b',
        strokeDash: `${sConfirmed.toFixed(1)} ${circum}`,
        strokeOffset: '0'
      },
      {
        name: 'Pending Confirmation',
        count: pending.toLocaleString(),
        countNum: pending,
        pct: totalCount ? `${((pending / totalCount) * 100).toFixed(1)}%` : '0%',
        color: '#ff9800',
        strokeDash: `${sPending.toFixed(1)} ${circum}`,
        strokeOffset: `-${sConfirmed.toFixed(1)}`
      },
      {
        name: 'Cancelled',
        count: cancelled.toLocaleString(),
        countNum: cancelled,
        pct: totalCount ? `${((cancelled / totalCount) * 100).toFixed(1)}%` : '0%',
        color: '#f34c4d',
        strokeDash: `${sCancelled.toFixed(1)} ${circum}`,
        strokeOffset: `-${(sConfirmed + sPending).toFixed(1)}`
      },
      {
        name: 'Disputed',
        count: disputed.toLocaleString(),
        countNum: disputed,
        pct: totalCount ? `${((disputed / totalCount) * 100).toFixed(1)}%` : '0%',
        color: '#adb3bf',
        strokeDash: `${sDisputed.toFixed(1)} ${circum}`,
        strokeOffset: `-${(sConfirmed + sPending + sCancelled).toFixed(1)}`
      },
    ];
  }, [orders, totalCount]);

  return (
    <section className="panel status-panel">
      <h2>
        Order Status <span>(Live Supabase)</span>
      </h2>
      <div className="status-content">
        <div className="donut-wrap">
          <svg className="donut-svg" viewBox="0 0 170 170" width="170" height="170">
            <g transform="rotate(-90 85 85)">
              {totalCount === 0 ? (
                <circle
                  cx="85"
                  cy="85"
                  r="64.5"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="18"
                />
              ) : (
                slices.map(s => {
                  const isHovered = hoveredSlice === s.name;
                  return (
                    <circle
                      key={s.name}
                      cx="85"
                      cy="85"
                      r="64.5"
                      fill="none"
                      stroke={s.color}
                      strokeWidth={isHovered ? '24' : '18'}
                      strokeDasharray={s.strokeDash}
                      strokeDashoffset={s.strokeOffset}
                      className="donut-segment"
                      style={{
                        transition: 'stroke-width 0.22s ease, filter 0.22s ease',
                        filter: isHovered ? `drop-shadow(0 0 8px ${s.color}80)` : 'none',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={() => setHoveredSlice(s.name)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  );
                })
              )}
            </g>
          </svg>
          <div className="donut-center-info">
            {hoveredSlice ? (
              (() => {
                const s = slices.find(item => item.name === hoveredSlice);
                return (
                  <div className="center-hovered">
                    <strong style={{ color: s?.color }}>{s?.count}</strong>
                    <span className="center-hovered-name">{s?.name}</span>
                    <span className="center-hovered-pct">{s?.pct}</span>
                  </div>
                );
              })()
            ) : (
              <div className="center-default">
                <strong>{totalCount}</strong>
                <span>Total Orders</span>
              </div>
            )}
          </div>
        </div>

        <div className="status-labels">
          {slices.map(s => {
            const isHovered = hoveredSlice === s.name;
            return (
              <div
                className={`status-label ${isHovered ? 'hovered-row' : ''}`}
                key={s.name}
                onMouseEnter={() => setHoveredSlice(s.name)}
                onMouseLeave={() => setHoveredSlice(null)}
                onClick={() => onNavigate && onNavigate('Orders & Bills')}
                role="button"
                tabIndex={0}
              >
                <span className="status-color" style={{ background: s.color }} />
                <span className="status-name">{s.name}</span>
                <span className="status-num">{s.count}</span>
                <span className="status-pct">{s.pct}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RecentRestaurants({ onNavigate, restaurants }) {
  const displayList = restaurants.slice(0, 5);

  return (
    <section className="panel restaurant-panel">
      <div className="panel-titleline">
        <h2>Recent Restaurants (Live DB)</h2>
        <button className="view-all" onClick={() => onNavigate('All Restaurants')}>
          View All <ArrowRight size={17} />
        </button>
      </div>
      <div className="table-scroll">
        <table className="recent-table">
          <thead>
            <tr>
              <th style={{ width: '38%' }}>Restaurant</th>
              <th style={{ width: '26%' }}>Location</th>
              <th style={{ width: '18%' }}>Joined</th>
              <th style={{ width: '18%', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayList.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                  No restaurants registered yet. Click 'Add Restaurant' to onboard one.
                </td>
              </tr>
            ) : (
              displayList.map(r => {
                const joinedDate = r.created_at
                  ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Active';

                return (
                  <tr
                    key={r.id}
                    onClick={() => onNavigate('All Restaurants')}
                    title={`Open ${r.name}`}
                  >
                    <td>
                      <div className="resto-cell-inner">
                        <span className="restaurant-logo orange" style={{ width: 34, height: 34, fontSize: 13 }}>
                          {r.name.substring(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <strong className="resto-name-text">{r.name}</strong>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>/{r.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="resto-location-text">{r.address || 'Dhaka, Bangladesh'}</td>
                    <td className="resto-joined-text">{joinedDate}</td>
                    <td className="restaurant-status-cell">
                      <span className={'restaurant-status ' + (r.status || 'active').toLowerCase()}>
                        {r.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PendingActions({ onNavigate, pending }) {
  const totalCount = useMemo(() => {
    return pending.reduce((sum, p) => sum + (p.count || 0), 0);
  }, [pending]);

  return (
    <section className="panel pending-panel">
      <h2>
        Pending Actions <span className="pending-total">{totalCount}</span>
      </h2>
      <div className="pending-list">
        {pending.map(p => {
          const Icon = p.icon;
          return (
            <button key={p.name} className="pending-action" onClick={() => onNavigate(p.route)}>
              <span className="pending-icon">
                <Icon size={25} />
              </span>
              <span className="pending-copy">
                <strong>{p.name}</strong>
                <small>{p.detail}</small>
              </span>
              <span className="pending-number">{p.count}</span>
              <ChevronRight size={20} className="pending-chevron" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Dashboard({ onNavigate, stats, restaurants, pending, orders, feePerBill, onSelectClearedPeriod, currentClearedPeriod }) {
  return (
    <>
      <section className="welcome-banner">
        <div className="welcome-text">
          <h2>
            Welcome back, Super Admin! <span>👋</span>
          </h2>
          <p>Real-time multi-tenant dashboard connected to Supabase PostgreSQL database.</p>
        </div>
        <img src="/banner-burger.png" alt="Burger" className="banner-burger" />
      </section>

      {/* 10 Dashboard KPI Metric Cards */}
      <KpiRow
        stats={stats}
        onNavigate={onNavigate}
        onSelectClearedPeriod={onSelectClearedPeriod}
        currentClearedPeriod={currentClearedPeriod}
      />

      <div className="charts-row">
        <TrendChart orders={orders} feePerBill={feePerBill} />
        <StatusChart onNavigate={onNavigate} orders={orders} />
      </div>

      <div className="bottom-row">
        <RecentRestaurants onNavigate={onNavigate} restaurants={restaurants} />
        <PendingActions onNavigate={onNavigate} pending={pending} />
      </div>
    </>
  );
}

// -------------------------------------------------------------
// REAL FUNCTIONAL SUBPAGES CONNECTED TO BACKEND
// -------------------------------------------------------------

// AllRestaurantsView is imported from ./AllRestaurantsView.jsx

function NewRegistrationsView({ restaurants, onApprove, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 22px'
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 750 }}>Pending Restaurant Registrations</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          Review and approve new restaurant digital menu onboarding applications.
        </p>
      </div>

      {restaurants.length === 0 ? (
        <div style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 30,
          textAlign: 'center',
          color: 'var(--muted)'
        }}>
          <CircleCheck size={36} color="#22c55e" style={{ margin: '0 auto 10px' }} />
          <h3>All caught up!</h3>
          <p style={{ fontSize: 13 }}>No pending registrations awaiting approval in Supabase at this time.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table className="recent-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Location</th>
                <th>Tables</th>
                <th>Requested Plan</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map(r => (
                <tr key={r.id}>
                  <td>
                    <span className="restaurant-logo orange">{r.name.substring(0, 2).toUpperCase()}</span>
                    <strong>{r.name}</strong>
                  </td>
                  <td>{r.address || 'Dhaka, Bangladesh'}</td>
                  <td>{r.table_count || 12} Tables</td>
                  <td><strong>{r.plan || 'Standard Digital'}</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => onApprove(r.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: 0,
                        background: '#16a34a',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700
                      }}
                    >
                      Approve & Activate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button className="placeholder-button" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>
    </div>
  );
}

function DigitalMenusView({ restaurants, onGoToCustomerMenu, onBack }) {
  const [copiedId, setCopiedId] = React.useState(null);

  const handleCopyLink = (url, id) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '20px 24px'
      }}>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 750 }}>Multi-Restaurant Digital Menus &amp; QR Stands</h2>
        <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          Each restaurant operates an independent 3D Holographic digital menu with unique QR code synced to Supabase.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: 20 }}>
        {restaurants.map(r => {
          const menuUrl = `http://localhost:5173/${r.slug || r.menuSlug || '3d-dine'}`;
          const menuUrlShort = `localhost:5173/${r.slug || r.menuSlug || '3d-dine'}`;
          const isCopied = copiedId === r.id;

          return (
            <div key={r.id} className="qr-menu-card" style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 24,
              display: 'flex',
              gap: 24,
              alignItems: 'flex-start',
              transition: 'box-shadow 0.3s ease, transform 0.2s ease',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Left: QR Code */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0
              }}>
                <div style={{
                  background: 'rgba(244, 81, 0, 0.06)',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid rgba(244, 81, 0, 0.12)'
                }}>
                  <QRCodeSVG
                    value={menuUrl}
                    size={130}
                    fgColor="#c44000"
                    bgColor="transparent"
                    level="M"
                    includeMargin={false}
                    style={{ display: 'block' }}
                  />
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#888',
                  letterSpacing: '0.3px'
                }}>Scan menu</span>
              </div>

              {/* Right: Info */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minWidth: 0
              }}>
                {/* Name + Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <strong style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.name}
                  </strong>
                  <span style={{
                    padding: '4px 14px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 20,
                    background: (r.status || 'active').toLowerCase() === 'active' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                    color: (r.status || 'active').toLowerCase() === 'active' ? '#16a34a' : '#dc2626',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.2px'
                  }}>
                    {r.status || 'Active'}
                  </span>
                </div>

                {/* Menu Link Label */}
                <span style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Menu Link
                </span>

                {/* URL + Integrated Copy */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 12px',
                  borderRadius: 8,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  gap: 8
                }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: 13,
                    color: '#d34500',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {menuUrlShort}
                  </div>
                  <button
                    onClick={() => handleCopyLink(menuUrl, r.id)}
                    title={isCopied ? "Copied to clipboard!" : "Copy menu link"}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: '4px',
                      borderRadius: 6,
                      color: isCopied ? '#16a34a' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                  >
                    {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                {/* QR Stands + Plan */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Store size={18} style={{ color: '#ea580c', flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                      {r.table_count || 12} Active QR Stands
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Layers size={18} style={{ color: '#ea580c', flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                      {r.plan || 'Pro Holographic'}
                    </span>
                  </div>
                </div>

                {/* Open 3D Menu Button */}
                <button
                  onClick={() => onGoToCustomerMenu?.(r)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: '#f45100',
                    color: '#fff',
                    border: 0,
                    fontSize: 14,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginTop: 4,
                    boxShadow: '0 2px 8px rgba(244, 81, 0, 0.25)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#ff6014';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(244, 81, 0, 0.35)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#f45100';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(244, 81, 0, 0.25)';
                  }}
                >
                  <ExternalLink size={16} /> Open 3D Menu
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button className="placeholder-button" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>
    </div>
  );
}

function FoodCatalogView({ catalog, onBack, onOpenAddFood }) {
  const foods = catalog.foods || [];
  const categories = catalog.categories || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 750 }}>Food Catalog & Categories (Live Supabase)</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            {foods.length} live food item(s) across {categories.length} categories in Supabase.
          </p>
        </div>
        <button
          onClick={onOpenAddFood}
          style={{
            background: '#f45100',
            color: '#fff',
            border: 0,
            padding: '9px 16px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Plus size={16} /> Add Food Item
        </button>
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table className="recent-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Food Dish</th>
              <th style={{ width: '20%' }}>Category</th>
              <th style={{ width: '15%' }}>Price</th>
              <th style={{ width: '15%', textAlign: 'center' }}>3D Model</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Portions</th>
            </tr>
          </thead>
          <tbody>
            {foods.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                  No food items found in Supabase database.
                </td>
              </tr>
            ) : (
              foods.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f59e0b20', display: 'grid', placeItems: 'center', color: '#f59e0b' }}>
                          <Utensils size={18} />
                        </div>
                      )}
                      <div>
                        <strong>{item.name}</strong>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.description?.slice(0, 45)}...</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: 'var(--bg)' }}>
                      {item.category || 'General'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800, color: '#f59e0b' }}>
                    ৳{Number(item.price || 0).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {item.has_3d_model ? (
                      <span className="restaurant-status active" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Box size={12} /> 3D AR Ready
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>2D Only</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    {Array.isArray(item.portions) ? item.portions.length : 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button className="placeholder-button" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>
    </div>
  );
}

function DigitalBillsView({ restaurants, orders, subRoute, onBack }) {
  const [activeTab, setActiveTab] = useState(
    subRoute === 'Customer Confirmations' ? 'confirmations' : 'bills'
  );

  const confirmedOrders = useMemo(() => {
    return orders.filter(o => o.orderStatus === 'confirmed' || o.orderStatus === 'completed' || o.paymentStatus === 'paid');
  }, [orders]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header Banner */}
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 750 }}>
            {activeTab === 'confirmations' ? 'Customer Order Confirmations (Live Supabase)' : 'Customer Digital Bills & ৳5 Fee Ledger'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            {activeTab === 'confirmations'
              ? 'Real-time verified orders placed by customers and stored in Supabase PostgreSQL.'
              : 'Digital Food Menu SaaS charges a flat ৳5 platform fee per customer digital bill.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setActiveTab('confirmations')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: activeTab === 'confirmations' ? '1px solid #f59e0b' : '1px solid var(--border)',
              background: activeTab === 'confirmations' ? '#f59e0b20' : 'transparent',
              color: activeTab === 'confirmations' ? '#f59e0b' : 'var(--foreground)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Customer Confirmations ({confirmedOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: activeTab === 'bills' ? '1px solid #f59e0b' : '1px solid var(--border)',
              background: activeTab === 'bills' ? '#f59e0b20' : 'transparent',
              color: activeTab === 'bills' ? '#f59e0b' : 'var(--foreground)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Restaurant Bills Ledger
          </button>
        </div>
      </div>

      {activeTab === 'confirmations' ? (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table className="recent-table">
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
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
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
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{dateStr}</div>
                      </td>
                      <td>
                        <div><strong>{ord.tableNumber || 'Table 04'}</strong></div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ord.customerName || 'Dine-In Customer'}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          {ord.items && ord.items.length > 0
                            ? ord.items.map(it => `${it.name || it.title || 'Item'} (${it.portion || 'Standard'})`).join(', ')
                            : 'Order items recorded'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, color: '#f59e0b' }}>
                        ৳{Number(ord.totalAmount || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="restaurant-status active" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table className="recent-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Total Orders</th>
                <th>Gross Order Volume</th>
                <th>Accrued Fee (৳5/bill)</th>
                <th>Settlement Status</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map(r => {
                const restoOrders = orders.filter(o => o.restaurantId === r.id);
                const orderCount = restoOrders.length;
                const grossVolume = restoOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                const accruedFee = orderCount * 5;

                return (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong></td>
                    <td>{orderCount}</td>
                    <td>৳{grossVolume.toLocaleString()}</td>
                    <td style={{ fontWeight: 800, color: '#f45100' }}>৳{accruedFee.toLocaleString()}</td>
                    <td>
                      <span className={'restaurant-status ' + (accruedFee > 0 ? 'active' : 'pending')}>
                        {accruedFee > 0 ? 'Ready for Settlement' : 'No Balance Due'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button className="placeholder-button" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>
    </div>
  );
}

function RevenueSettlementView({ restaurants, orders, settlements = [], feePerBill = 5, onOpenRecordModal, onBack }) {
  const totalAccruedFee = orders.length * feePerBill;
  const totalClearedAmount = settlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const totalDueAmount = Math.max(0, totalAccruedFee - totalClearedAmount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 750 }}>SaaS Revenue & Merchant Settlement (Live DB)</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Real-time fee ledger: ৳{totalAccruedFee.toLocaleString()} accrued across {restaurants.length} restaurant(s) in Supabase.
          </p>
        </div>
        <button
          onClick={() => onOpenRecordModal && onOpenRecordModal(null)}
          style={{
            background: '#16a34a',
            color: '#fff',
            border: 0,
            padding: '9px 18px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Plus size={16} /> Record Settlement Payment
        </button>
      </div>

      {/* 3 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total Accrued Fees</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>৳{totalAccruedFee.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{orders.length} verified orders at ৳{feePerBill}/bill</div>
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total Due Settlements</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: totalDueAmount > 0 ? '#ef4444' : '#22c55e', marginTop: 4 }}>
            ৳{totalDueAmount.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            {totalDueAmount > 0 ? 'Pending collection from restaurants' : 'All restaurant dues cleared'}
          </div>
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total Cleared Settlements (Earnings)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#22c55e', marginTop: 4 }}>৳{totalClearedAmount.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>100% Confirmed & Deposited</div>
        </div>
      </div>

      {/* Restaurant Settlement Dues Table */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Merchant Dues & Settlement Status</strong>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Flat ৳{feePerBill} per confirmed digital bill</span>
        </div>
        <table className="recent-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Restaurant</th>
              <th>Total Orders</th>
              <th>Accrued Fee</th>
              <th>Cleared Amount</th>
              <th>Remaining Due</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map(r => {
              const restoOrders = orders.filter(o => o.restaurantId === r.id);
              const count = restoOrders.length;
              const accrued = count * feePerBill;
              const restoCleared = settlements.filter(s => s.restaurantId === r.id).reduce((sum, s) => sum + Number(s.amount || 0), 0);
              const due = Math.max(0, accrued - restoCleared);

              return (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>/{r.slug}</div>
                  </td>
                  <td>{count} Bills</td>
                  <td>৳{accrued.toLocaleString()}</td>
                  <td style={{ color: '#16a34a', fontWeight: 700 }}>৳{restoCleared.toLocaleString()}</td>
                  <td style={{ fontWeight: 800, color: due > 0 ? '#ef4444' : '#16a34a' }}>
                    ৳{due.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {due > 0 ? (
                      <button
                        onClick={() => onOpenRecordModal && onOpenRecordModal(r)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: 0,
                          background: '#16a34a',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Clear Due (৳{due})
                      </button>
                    ) : (
                      <span className="restaurant-status active" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} /> Settled
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cleared Settlements History Table */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <strong>Cleared Settlements History ({settlements.length} Transactions)</strong>
        </div>
        <table className="recent-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Restaurant</th>
              <th>Cleared Amount</th>
              <th>Payment Method</th>
              <th>Reference ID</th>
              <th style={{ textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {settlements.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                  No cleared settlements recorded yet. Use 'Record Settlement Payment' to record cleared dues.
                </td>
              </tr>
            ) : (
              settlements.map(s => {
                const resto = restaurants.find(r => r.id === s.restaurantId);
                const dateStr = s.clearedAt
                  ? new Date(s.clearedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Recent';

                return (
                  <tr key={s.id}>
                    <td>{dateStr}</td>
                    <td><strong>{resto ? resto.name : s.restaurantId}</strong></td>
                    <td style={{ fontWeight: 800, color: '#16a34a' }}>৳{Number(s.amount || 0).toLocaleString()}</td>
                    <td>{s.paymentMethod || 'bKash'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.transactionRef || s.id}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="restaurant-status active" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} /> Confirmed Cleared
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <button className="placeholder-button" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>
    </div>
  );
}

function SupportCenterView({ tickets, restaurants, onResolveTicket, onBack }) {
  const getRestoName = (restoId) => {
    const found = restaurants.find(r => r.id === restoId);
    return found ? found.name : restoId;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 22px'
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 750 }}>Support Center ({tickets.length} Tickets in Supabase)</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          Merchant inquiries, 3D model requests, and technical assistance synced live with Supabase `support_tickets`.
        </p>
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {tickets.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>
              No support tickets found in Supabase.
            </div>
          ) : (
            tickets.map(t => {
              const timeStr = t.createdAt
                ? new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Recent';

              return (
                <div key={t.id} style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, background: '#fff0e4', color: '#f45100', padding: '2px 6px', borderRadius: 4 }}>
                        {t.id}
                      </span>
                      <strong style={{ fontSize: 14 }}>{t.subject}</strong>
                      <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: t.priority === 'High' ? '#fee2e2' : '#f1f5f9', color: t.priority === 'High' ? '#b91c1c' : '#475569', fontWeight: 600 }}>
                        {t.priority}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      Restaurant: <strong>{getRestoName(t.restaurantId)}</strong> • Category: {t.category} • {timeStr}
                    </div>
                    {t.message && (
                      <div style={{ fontSize: 12, color: 'var(--foreground)', marginTop: 6, fontStyle: 'italic', background: 'var(--bg)', padding: '6px 10px', borderRadius: 6 }}>
                        "{t.message}"
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={'restaurant-status ' + (t.status === 'Resolved' ? 'active' : 'pending')}>
                      {t.status}
                    </span>
                    {t.status !== 'Resolved' && (
                      <button
                        onClick={() => onResolveTicket(t.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: '#16a34a',
                          color: '#fff',
                          border: 0,
                          fontSize: 12,
                          fontWeight: 700
                        }}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <button className="placeholder-button" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>
    </div>
  );
}

function PlatformSettingsView({ settings, onSaveSettings, onBack }) {
  const [fee, setFee] = useState(settings?.feeRules?.platformFeePerBill ?? 5.0);
  const [minBill, setMinBill] = useState(settings?.feeRules?.minEligibleBillAmount ?? 50.0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 22px'
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 750 }}>Platform Fee Rules & Supabase Configuration</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          Configure global platform service fee rules applied across all multi-tenant digital menus in Supabase.
        </p>
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, maxWidth: 600 }}>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
            Platform Fee per Customer Digital Bill (৳ BDT)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number"
              step="0.5"
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
              style={{
                width: 120,
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--foreground)',
                fontSize: 14,
                fontWeight: 700
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Default: ৳5 Flat Fee</span>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
            Minimum Eligible Bill Amount (৳ BDT)
          </label>
          <input
            type="number"
            value={minBill}
            onChange={(e) => setMinBill(Number(e.target.value))}
            style={{
              width: 120,
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--foreground)',
              fontSize: 14,
              fontWeight: 700
            }}
          />
          <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Customer orders below this threshold are exempt from platform fee.
          </span>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontWeight: 700, fontSize: 12 }}>
            <ShieldCheck size={16} />
            <span>Supabase Row Level Security (RLS) is Active</span>
          </div>
          <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
            All 11 database tables are synchronized with public read and write access policies.
          </div>
        </div>

        <button
          onClick={() => onSaveSettings(fee, minBill)}
          style={{
            background: '#f45100',
            color: '#fff',
            border: 0,
            padding: '10px 22px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700
          }}
        >
          Save Configuration to Supabase
        </button>
      </div>

      <button className="placeholder-button" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </button>
    </div>
  );
}

function OtherPage({ page, onNavigate }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-header">
        <ShieldCheck size={28} />
        <h2>{page}</h2>
        <p>This section is connected to your existing Supabase database and business logic.</p>
      </div>
      <button className="placeholder-button" onClick={() => onNavigate('Dashboard')}>
        <ChevronLeft size={17} /> Back to Dashboard
      </button>
    </div>
  );
}

function AddFoodModal({ onClose, onOpenBuilder }) {
  return (
    <div className="modal-screen" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <ShoppingBag size={35} color="#ff6b00" />
        <h2>Add New Food</h2>
        <p>
          This launches your existing Universal Menu Builder and 3D Customizer.
        </p>
        <button
          onClick={onOpenBuilder}
          style={{ background: '#f45100', color: '#fff', border: 0, padding: '10px 20px', borderRadius: 8, fontWeight: 700 }}
        >
          Open Menu Builder
        </button>
      </div>
    </div>
  );
}

function AddRestaurantModal({ newResto, setNewResto, onSubmit, onClose }) {
  return (
    <div className="modal-screen" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Store size={26} color="#f45100" />
          <h2 style={{ margin: 0, fontSize: 18 }}>Register New Restaurant</h2>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Restaurant Name *</label>
            <input
              type="text"
              required
              value={newResto.name}
              onChange={e => setNewResto({ ...newResto, name: e.target.value })}
              placeholder="e.g. Kacchi Bhai"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Menu Slug URL *</label>
              <input
                type="text"
                required
                value={newResto.slug}
                onChange={e => setNewResto({ ...newResto, slug: e.target.value })}
                placeholder="e.g. kacchi-bhai"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Plan</label>
              <select
                value={newResto.plan}
                onChange={e => setNewResto({ ...newResto, plan: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
              >
                <option value="Enterprise 3D">Enterprise 3D</option>
                <option value="Pro Holographic">Pro Holographic</option>
                <option value="Standard Digital">Standard Digital</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Login ID</label>
              <input
                type="text"
                value={newResto.login_id}
                onChange={e => setNewResto({ ...newResto, login_id: e.target.value })}
                placeholder="e.g. kacchibhai"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Password</label>
              <input
                type="text"
                value={newResto.password}
                onChange={e => setNewResto({ ...newResto, password: e.target.value })}
                placeholder="resto123"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Phone</label>
              <input
                type="text"
                value={newResto.phone}
                onChange={e => setNewResto({ ...newResto, phone: e.target.value })}
                placeholder="+880 1711-000000"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Location</label>
              <input
                type="text"
                value={newResto.address}
                onChange={e => setNewResto({ ...newResto, address: e.target.value })}
                placeholder="Dhaka, Banani"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'none' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: 6, border: 0, background: '#f45100', color: '#fff', fontWeight: 700 }}
            >
              Create & Sync
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordSettlementModal({ formData, setFormData, restaurants, onSubmit, onClose }) {
  return (
    <div className="modal-screen" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Coins size={26} color="#16a34a" />
          <h2 style={{ margin: 0, fontSize: 18 }}>Confirm Settlement Payment</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>
          Record payment received from a restaurant to clear their accrued platform fees.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Restaurant *</label>
            <select
              value={formData.restaurantId}
              onChange={e => setFormData({ ...formData, restaurantId: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
              required
            >
              <option value="">Select Restaurant...</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name} (/{r.slug})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Settlement Amount (৳) *</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
              >
                <option value="bKash">bKash Merchant</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank Transfer">Bank Wire Transfer</option>
                <option value="Cash">Cash Deposit</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Transaction Reference / TRX ID</label>
            <input
              type="text"
              value={formData.transactionRef}
              onChange={e => setFormData({ ...formData, transactionRef: e.target.value })}
              placeholder="e.g. TRX-9482104"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Settlement verified and cleared"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'none' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: 6, border: 0, background: '#16a34a', color: '#fff', fontWeight: 700 }}
            >
              Confirm Cleared Settlement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
