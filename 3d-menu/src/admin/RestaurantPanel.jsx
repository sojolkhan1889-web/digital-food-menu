import React, { useState, useEffect, useMemo } from 'react';
import { compressImage } from '../lib/imageCompressor';
import {
  LayoutDashboard,
  Utensils,
  Layers,
  ShoppingBag,
  CreditCard,
  LogOut,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Menu as MenuIcon,
  X,
  ExternalLink,
  Trash2,
  Sun,
  Moon,
  TrendingUp,
  RefreshCw,
  Eye,
  Check,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Tag,
  Settings,
  Headphones,
  MessageSquare,
  Send,
  Upload,
  ShieldCheck,
  AlertCircle,
  Building,
  Lock,
  Mail,
  Phone,
  Flame,
  ArrowRight,
  Sliders,
  Star,
  Pencil,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
  Receipt,
  Percent,
  Store,
  LayoutGrid,
  QrCode,
  Scan,
  ShoppingCart,
  Coins,
  Wallet,
  Users,
  UserPlus
} from 'lucide-react';

import AddFoodWizard from './AddFoodWizard';
import FeaturedSliderWizard from './FeaturedSliderWizard';
import {
  getAdminTheme,
  setAdminTheme,
  getStoredSettlementDue,
  saveStoredSettlementDue,
  settlePlatformDues,
  resetPlatformDues,
  getMenuScans,
  fetchLiveMenuScansFromSupabase,
  getRestaurantFollowers,
  isSameCalendarDay
} from '../data/menuStore';

// Animated count-up component for metrics on page load/refresh
function AnimatedCounter({ value, duration = 1200 }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === 'number') return '0';
    const str = String(value || '').trim();
    if (str.startsWith('৳')) return '৳0';
    if (str.startsWith('+')) return '+0';
    return '0';
  });

  useEffect(() => {
    let prefix = '';
    let suffix = '';
    let targetNum = 0;

    if (typeof value === 'number') {
      targetNum = value;
    } else {
      const str = String(value || '').trim();
      if (str.startsWith('৳')) {
        prefix = '৳';
      } else if (str.startsWith('+')) {
        prefix = '+';
      }
      if (str.endsWith('%')) {
        suffix = '%';
      }
      const cleaned = str.replace(/[^0-9.]/g, '');
      targetNum = parseFloat(cleaned) || 0;
    }

    if (targetNum === 0) {
      setDisplayValue(`${prefix}0${suffix}`);
      return;
    }

    let startTime = null;
    let animationFrameId;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth ease-out cubic curve
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(easeOut * targetNum);

      const formatted = targetNum >= 1000 ? current.toLocaleString() : current;
      setDisplayValue(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        const finalFormatted = targetNum >= 1000 ? targetNum.toLocaleString() : targetNum;
        setDisplayValue(`${prefix}${finalFormatted}${suffix}`);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

export default function RestaurantPanel({
  foods = [],
  categories = [],
  subcategories = [],
  featuredSliders = [],
  orders = [],
  payments = [],
  restaurantProfile = {},
  tickets = [],
  chatMessages = [],
  superAdminConfig = {},
  onAddFood,
  onUpdateFood,
  onDeleteFood,
  onToggleFoodStatus,
  onAddCategory,
  onDeleteCategory,
  onUpdateCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  onAddFeaturedSlider,
  onDeleteFeaturedSlider,
  onToggleFeaturedSlider,
  onSaveRestaurantProfile,
  onAddTicket,
  onSendMessage,
  onUpdateSuperAdminConfig,
  onUpdateOrderStatus,
  onBackToMenu,
  onLogout
}) {
  // Super Admin Gated Premium Status: False by default!
  const isPremiumActive = Boolean(superAdminConfig?.enableOrderManagement);

  // Helper to determine initial active tab from URL query param or hash (Supports Open in New Tab)
  const getInitialActiveTab = () => {
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const tabParam = searchParams.get('tab');
        if (tabParam) return tabParam;
        const hash = window.location.hash.replace('#', '').trim();
        if (hash && hash !== 'admin' && hash !== 'restaurant') return hash;
      } catch (e) {
        console.error('Error parsing initial tab from URL:', e);
      }
    }
    return isPremiumActive ? 'dashboard' : 'foods';
  };

  // Navigation: Default is 'foods' (Food Items & Publish) when premium is disabled
  const [activeTab, setActiveTab] = useState(getInitialActiveTab);

  // Sync active tab with URL query parameter for browser history & bookmarking
  const handleTabSelect = (tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      try {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('tab', tabId);
        window.history.pushState({ tab: tabId }, '', currentUrl.toString());
      } catch (err) {
        console.warn('URL pushState bypassed:', err);
      }
    }
  };

  // Listen to popstate (browser Back/Forward navigation)
  useEffect(() => {
    const onPopState = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab) {
          setActiveTab(tab);
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSliderWizardOpen, setIsSliderWizardOpen] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [editingSlider, setEditingSlider] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editSubcategoryName, setEditSubcategoryName] = useState('');
  const [editSubcategoryParent, setEditSubcategoryParent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);

  // Sidebar Minimization state (collapse right-to-left)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Live Native Clock & Device Timezone Detection
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString());
  const [currentDate, setCurrentDate] = useState(() => new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
  const [deviceTimeZone, setDeviceTimeZone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  });
  const [geoStatus, setGeoStatus] = useState('auto');
  const [locationNotice, setLocationNotice] = useState(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
      setCurrentDate(now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Detect / sync device native location & timezone
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationNotice('Geolocation is not supported by your device/browser. Local system timezone (' + deviceTimeZone + ') is active.');
      setTimeout(() => setLocationNotice(null), 4000);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus('granted');
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setDeviceTimeZone(tz);
          setLocationNotice('Device location verified successfully (' + tz + '). Timezone synced.');
          setTimeout(() => setLocationNotice(null), 4000);
        } catch (e) {
          console.warn(e);
        }
      },
      (err) => {
        setGeoStatus('denied');
        setLocationNotice('Location permission required: Please allow location access in your browser settings to pinpoint venue timezone.');
        setTimeout(() => setLocationNotice(null), 5000);
      },
      { timeout: 8000 }
    );
  };

  // Theme Mode: Default is 'light' as explicitly requested by user
  const [theme, setTheme] = useState(getAdminTheme);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    setAdminTheme(nextTheme);
  };

  const isDark = theme === 'dark';

  // Foods tab filters
  const [foodFilterTab, setFoodFilterTab] = useState('all'); // 'all' | 'published' | 'unpublished'
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [selectedFoodCategory, setSelectedFoodCategory] = useState('All');

  // Categories tab state
  const [newCategoryName, setNewCategoryName] = useState('');

  // Sub-categories tab state
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newSubcategoryParent, setNewSubcategoryParent] = useState(categories[0] || 'Main Course');

  // Orders tab state
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Chart time range filter: 'day' | 'week' | 'month' | 'year'
  const [salesTimeRange, setSalesTimeRange] = useState('month');
  const [ordersTimeRange, setOrdersTimeRange] = useState('month');

  // Settings tab local state
  const [profileForm, setProfileForm] = useState({
    name: restaurantProfile?.name || '3D DINE Banani',
    tagline: restaurantProfile?.tagline || 'Universal AR Digital Dining Experience',
    logo: restaurantProfile?.logo || '',
    loginId: restaurantProfile?.loginId || 'admin',
    email: restaurantProfile?.email || 'owner@3ddine.com',
    phone: restaurantProfile?.phone || '+880 1711-234567',
    password: restaurantProfile?.password || 'admin123',
    confirmPassword: restaurantProfile?.password || 'admin123',
    currency: restaurantProfile?.currency || '৳',
    tableCount: restaurantProfile?.tableCount || 12,
    vatEnabled: restaurantProfile?.vatEnabled !== false,
    vatType: restaurantProfile?.vatType || 'percentage', // 'percentage' | 'flat'
    vatRate: restaurantProfile?.vatRate !== undefined ? restaurantProfile.vatRate : 5.0,
    serviceChargeEnabled: restaurantProfile?.serviceChargeEnabled !== false,
    serviceChargeType: restaurantProfile?.serviceChargeType || 'flat', // 'percentage' | 'flat'
    serviceChargeRate: restaurantProfile?.serviceChargeRate !== undefined ? restaurantProfile.serviceChargeRate : 2.0
  });
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState('');

  // Keep settings form synced when remote restaurant profile loads from Supabase
  useEffect(() => {
    if (restaurantProfile && Object.keys(restaurantProfile).length > 0) {
      setProfileForm(prev => ({
        ...prev,
        name: restaurantProfile.name || prev.name,
        tagline: restaurantProfile.tagline !== undefined ? restaurantProfile.tagline : prev.tagline,
        logo: restaurantProfile.logo !== undefined ? restaurantProfile.logo : prev.logo,
        loginId: restaurantProfile.loginId || prev.loginId,
        email: restaurantProfile.email || prev.email,
        phone: restaurantProfile.phone || prev.phone,
        currency: restaurantProfile.currency || prev.currency,
        tableCount: restaurantProfile.tableCount || prev.tableCount,
        vatEnabled: restaurantProfile.vatEnabled !== undefined ? restaurantProfile.vatEnabled : prev.vatEnabled,
        vatType: restaurantProfile.vatType || prev.vatType,
        vatRate: restaurantProfile.vatRate !== undefined ? restaurantProfile.vatRate : prev.vatRate,
        serviceChargeEnabled: restaurantProfile.serviceChargeEnabled !== undefined ? restaurantProfile.serviceChargeEnabled : prev.serviceChargeEnabled,
        serviceChargeType: restaurantProfile.serviceChargeType || prev.serviceChargeType,
        serviceChargeRate: restaurantProfile.serviceChargeRate !== undefined ? restaurantProfile.serviceChargeRate : prev.serviceChargeRate
      }));
    }
  }, [restaurantProfile]);

  // Support tab local state
  const [supportSubTab, setSupportSubTab] = useState('tickets'); // 'tickets' | 'chat'
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Technical Issue');
  const [ticketPriority, setTicketPriority] = useState('Medium');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState('');

  // Chat message input
  const [chatInput, setChatInput] = useState('');

  const currency = profileForm.currency || '$';

  // De-duplicate categories for filter dropdowns
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(
      (categories || [])
        .map(c => (typeof c === 'object' && c ? c.name : c))
        .filter(c => Boolean(c) && String(c).trim().toLowerCase() !== 'all')
        .map(c => String(c).trim())
    ));
  }, [categories]);

  // If activeTab is premium and premium gets disabled, fallback to foods
  useEffect(() => {
    if (!isPremiumActive && (activeTab === 'dashboard' || activeTab === 'orders' || activeTab === 'payments')) {
      setActiveTab('foods');
    }
  }, [isPremiumActive, activeTab]);

  // --- Computed Metrics ---
  const metrics = useMemo(() => {
    const publishedCount = foods.filter(f => f.is_published !== false && f.status !== 'draft' && f.status !== 'unpublished').length;
    const unpublishedCount = foods.length - publishedCount;

    const totalOrdersCount = orders.length;

    const totalSales = orders
      .filter(o => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const todayOrders = orders.filter(o => {
      const orderDate = o.createdAt || o.created_at;
      return isSameCalendarDay(orderDate);
    });

    const todaySales = todayOrders
      .filter(o => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    return {
      todaySales,
      totalSales,
      totalPublishedItems: publishedCount,
      totalOrders: totalOrdersCount,
      todayOrders: todayOrders.length,
      unpublishedItems: unpublishedCount
    };
  }, [foods, orders]);

  // Dynamic Real Cloud Scans (fetched live from Supabase menu_scans and polled every 6s)
  const [scansData, setScansData] = useState(() => getMenuScans('resto_001', orders.length));

  useEffect(() => {
    let isMounted = true;
    const loadScans = async () => {
      const live = await fetchLiveMenuScansFromSupabase('resto_001');
      if (isMounted && live) {
        setScansData(live);
      }
    };
    loadScans();
    const interval = setInterval(loadScans, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const followersData = useMemo(() => {
    return getRestaurantFollowers('resto_001', orders);
  }, [orders]);

  // Platform Fees & Due Settlement Calculation: Real ৳5 fee per confirmed order
  const todayFeesAmount = (metrics.todayOrders || 0) * 5;
  const [dueSettlementAmount, setDueSettlementAmount] = useState(() => {
    const isPaid = localStorage.getItem('dgm_restaurant_due_settled') === 'true';
    if (isPaid) return 0;
    const lifetimeFees = orders.filter(o => o.orderStatus !== 'cancelled').length * 5;
    return getStoredSettlementDue(lifetimeFees);
  });
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementSuccessMsg, setSettlementSuccessMsg] = useState('');

  // Keep due settlement synchronized with real confirmed orders & settlements
  useEffect(() => {
    const isPaid = localStorage.getItem('dgm_restaurant_due_settled') === 'true';
    if (!isPaid) {
      const lifetimeFees = orders.filter(o => o.orderStatus !== 'cancelled').length * 5;
      if (lifetimeFees !== dueSettlementAmount && dueSettlementAmount === 0 && lifetimeFees > 0) {
        setDueSettlementAmount(lifetimeFees);
        saveStoredSettlementDue(lifetimeFees);
      }
    }
  }, [orders, dueSettlementAmount]);

  const handleSettleDue = () => {
    settlePlatformDues();
    setDueSettlementAmount(0);
    setIsSettlementModalOpen(false);
    setSettlementSuccessMsg(`Payment of ৳${dueSettlementAmount || todayFeesAmount} successfully settled! Total Due is now ৳0.`);
    setTimeout(() => setSettlementSuccessMsg(''), 5000);
  };

  const handleResetDue = () => {
    resetPlatformDues(todayFeesAmount);
    setDueSettlementAmount(todayFeesAmount);
    setIsSettlementModalOpen(false);
    setSettlementSuccessMsg(`Due settlement balance reset to ৳${todayFeesAmount} (Active Collections).`);
    setTimeout(() => setSettlementSuccessMsg(''), 4000);
  };

  // Filtered Foods
  const filteredFoods = useMemo(() => {
    return foods.filter(f => {
      const isPub = f.is_published !== false && f.status !== 'draft' && f.status !== 'unpublished';
      if (foodFilterTab === 'published' && !isPub) return false;
      if (foodFilterTab === 'unpublished' && isPub) return false;

      if (selectedFoodCategory !== 'All' && f.category !== selectedFoodCategory) return false;

      if (foodSearchQuery.trim()) {
        const q = foodSearchQuery.toLowerCase();
        const matchTitle = (f.title || '').toLowerCase().includes(q);
        const matchCat = (f.category || '').toLowerCase().includes(q);
        const matchSub = (f.subcategory || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchSub) return false;
      }

      return true;
    });
  }, [foods, foodFilterTab, selectedFoodCategory, foodSearchQuery]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (orderStatusFilter !== 'all' && o.orderStatus !== orderStatusFilter) return false;
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const matchNum = (o.orderNumber || '').toLowerCase().includes(q);
        const matchTable = (o.tableNumber || '').toLowerCase().includes(q);
        const matchCust = (o.customerName || '').toLowerCase().includes(q);
        if (!matchNum && !matchTable && !matchCust) return false;
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);

  // Handlers
  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    onAddCategory(newCategoryName.trim());
    setNewCategoryName('');
  };

  const handleCreateSubcategory = (e) => {
    e.preventDefault();
    if (!newSubcategoryName.trim()) return;
    const newSub = {
      id: `sub_${Date.now()}`,
      category: newSubcategoryParent,
      name: newSubcategoryName.trim(),
      displayOrder: Date.now()
    };
    onAddSubcategory && onAddSubcategory(newSub);
    setNewSubcategoryName('');
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    if (profileForm.password !== profileForm.confirmPassword) {
      alert('Passwords do not match. Please verify your new password.');
      return;
    }
    const cleanProfile = {
      ...profileForm,
      vatRate: Math.max(0, parseFloat(profileForm.vatRate) || 0),
      serviceChargeRate: Math.max(0, parseFloat(profileForm.serviceChargeRate) || 0),
      tableCount: parseInt(profileForm.tableCount, 10) || 12
    };
    onSaveRestaurantProfile && onSaveRestaurantProfile(cleanProfile);
    setSettingsSuccessMessage('Restaurant settings, VAT & Service Charges updated successfully!');
    setTimeout(() => setSettingsSuccessMessage(''), 4000);
  };

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    const newTicket = {
      id: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: ticketSubject.trim(),
      category: ticketCategory,
      priority: ticketPriority,
      status: 'Open',
      createdAt: 'Just now',
      message: ticketMessage.trim(),
      lastReply: 'Ticket received. Assigned to technical care queue.'
    };
    onAddTicket && onAddTicket(newTicket);
    setTicketSubject('');
    setTicketMessage('');
    setTicketSuccess('Support ticket submitted successfully! A support specialist will respond shortly.');
    setTimeout(() => setTicketSuccess(''), 4500);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = {
      id: `msg_${Date.now()}`,
      sender: 'owner',
      name: profileForm.name || 'Restaurant Owner',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    onSendMessage && onSendMessage(userMsg);
    setChatInput('');

    // Simulate smart support agent reply
    setTimeout(() => {
      const agentReply = {
        id: `msg_${Date.now() + 1}`,
        sender: 'agent',
        name: 'Digital Menu Support',
        text: 'Thank you for reaching out. Our support engineer has logged your query. Everything in your catalog is synced in real-time.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      onSendMessage && onSendMessage(agentReply);
    }, 1200);
  };

  // Define Navigation Items based on Super Admin Gated Premium logic
  const navigationItems = useMemo(() => {
    const defaultTabs = [
      { id: 'foods', label: 'Food Items & Publish', icon: Utensils, badge: foods.length },
      { id: 'categories', label: 'Create Category', icon: Layers, badge: uniqueCategories.length },
      { id: 'subcategories', label: 'Create Sub-Category', icon: Tag, badge: subcategories.length },
      { id: 'sliders', label: 'Featured Sliders', icon: Sparkles, badge: featuredSliders.filter(s => s.isActive).length },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'support', label: 'Support', icon: Headphones, badge: tickets.filter(t => t.status === 'Open').length || 'Live' }
    ];

    if (isPremiumActive) {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ...defaultTabs,
        { id: 'orders', label: 'Order Manage', icon: ShoppingBag, badge: orders.filter(o => o.orderStatus === 'pending').length || null, badgeColor: 'bg-amber-600' },
        { id: 'payments', label: 'Payments', icon: CreditCard }
      ];
    }

    return defaultTabs;
  }, [isPremiumActive, foods.length, uniqueCategories.length, subcategories.length, featuredSliders, tickets, orders]);

  return (
    <div className={`min-h-screen w-full flex flex-col md:flex-row font-sans select-auto ${isDark ? 'bg-[#0B0F19] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
      }`}>

      {/* ======================================================== */}
      {/* 1. SIDEBAR NAVIGATION                                    */}
      {/* ======================================================== */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen ${isSidebarCollapsed ? 'w-20' : 'w-64'} ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
          } border-r flex flex-col justify-between transition-all duration-200 ease-in-out shrink-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        {/* Brand & Restaurant Header - Height exact h-16 (64px) matching main header bar */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className={`h-16 px-4 border-b flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} shrink-0 ${isDark ? 'border-slate-800 bg-[#111827]' : 'border-slate-200 bg-white'
            }`}>
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              {/* Brand Logo Box with High Contrast Studio White Backdrop & HD Rendering (Fills box border-to-border) */}
              <div className={`w-[54px] h-[54px] rounded-[5px] flex items-center justify-center p-0 shrink-0 overflow-hidden shadow-sm transition-all ${
                profileForm.logo 
                  ? 'bg-white border border-slate-200 dark:border-slate-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.18)]' 
                  : 'bg-gradient-to-br from-orange-500 to-amber-600 border border-orange-400/40 text-white'
              }`}>
                {profileForm.logo ? (
                  <img
                    src={profileForm.logo}
                    alt={profileForm.name || 'Restaurant Logo'}
                    className="w-full h-full object-contain scale-125 select-none filter contrast-[1.05] brightness-[1.02]"
                  />
                ) : (
                  <Utensils className="w-7 h-7 text-white" />
                )}
              </div>
              {!isSidebarCollapsed && (
                <div className="truncate">
                  <h2 className={`text-sm font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {profileForm.name || 'Restaurant Panel'}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${isPremiumActive ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <span className="text-[11px] text-slate-500 font-semibold truncate">
                      {isPremiumActive ? 'Premium Active' : 'Standard Menu'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Collapse Button */}
            {!isSidebarCollapsed && (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="hidden md:flex p-1.5 rounded-[5px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Collapse sidebar (Right to Left)"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1.5 flex-1">
            {isSidebarCollapsed && (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-full flex items-center justify-center p-2 rounded-[5px] text-slate-400 hover:text-orange-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2 cursor-pointer"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            )}
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <a
                  key={item.id}
                  href={`/admin?tab=${item.id}`}
                  onClick={(e) => {
                    // Standard left-click without keyboard modifiers switches tab smoothly in-page
                    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault();
                      handleTabSelect(item.id);
                    }
                  }}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-3'} rounded-[5px] text-sm font-semibold tracking-wide transition-all cursor-pointer no-underline select-none ${isActive
                      ? 'bg-orange-600 text-white font-bold shadow-sm'
                      : isDark
                        ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className="w-5 h-5 shrink-0" />
                    {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isSidebarCollapsed && item.badge !== undefined && item.badge !== null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-[5px] shrink-0 ${item.badgeColor ? `${item.badgeColor} text-white` : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                      }`}>
                      {item.badge}
                    </span>
                  )}
                  {isSidebarCollapsed && item.badge !== undefined && item.badge !== null && (
                    <span className="w-2 h-2 rounded-full bg-orange-500 absolute top-2 right-2" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Plan Status & Super Admin Simulator CTA */}
          {!isSidebarCollapsed && (
            <div className="p-2.5 shrink-0">
              <div className={`p-2.5 rounded-[5px] border text-[11px] ${isDark ? 'bg-[#0B0F19] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold uppercase tracking-wider text-[9px] text-slate-500">Plan Status</span>
                  <span className={`px-1.5 py-0.2 rounded-[5px] font-bold text-[9px] ${isPremiumActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                    {isPremiumActive ? 'PREMIUM' : 'BY-DEFAULT'}
                  </span>
                </div>
                <p className="text-[10px] leading-snug mb-2">
                  {isPremiumActive
                    ? 'Orders, Payments, and Live Dashboard are currently unlocked.'
                    : 'Orders, Payments & Dashboard hidden by default. Only enabled via Super Admin.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsSuperAdminModalOpen(true)}
                  className="w-full py-1 px-2 rounded-[5px] bg-slate-200 dark:bg-slate-800 hover:bg-orange-600 hover:text-white text-[10px] font-bold text-slate-800 dark:text-slate-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Super Admin Config</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer Controls */}
        <div className={`p-3 border-t space-y-2 shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
          {/* View Customer Menu */}
          <button
            onClick={onBackToMenu}
            title={isSidebarCollapsed ? "Customer 3D Menu" : undefined}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-[5px] border text-xs font-semibold transition-colors cursor-pointer ${isDark
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800'
              }`}
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-orange-600 shrink-0" />
              {!isSidebarCollapsed && <span>Customer 3D Menu</span>}
            </div>
            {!isSidebarCollapsed && <span className="text-[10px] text-slate-500 font-bold uppercase">Exit</span>}
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            title={isSidebarCollapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-2 px-3.5 py-2.5'} rounded-[5px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold transition-colors cursor-pointer`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Backdrop for Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA (Full Natural Scrolling)            */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        {/* Top Header Bar - Solid, Clean, Handcrafted Enterprise Finish (Exact h-16 to perfectly align with sidebar header lower edge) */}
        <header className={`h-16 px-4 sm:px-6 border-b flex items-center justify-between sticky top-0 z-30 shrink-0 ${
          isDark ? 'bg-[#111827] border-slate-800 shadow-sm' : 'bg-white border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
        }`}>
          {/* Left: Mobile trigger, Desktop collapse toggle & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-[5px] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              aria-label="Open mobile navigation"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              className="hidden md:flex p-2 rounded-[5px] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-orange-600 hover:border-orange-500/40 transition-colors cursor-pointer"
              title={isSidebarCollapsed ? "Expand Navigation Sidebar" : "Minimize Navigation Sidebar (Right to Left)"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[11px] font-bold tracking-wider uppercase text-orange-600 dark:text-orange-400">
                  RESTAURANT PORTAL
                </span>
                <span className="text-slate-400 text-xs">/</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {activeTab}
                </span>
              </div>
              <h1 className={`text-base sm:text-lg font-bold capitalize leading-none tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {activeTab === 'dashboard' && 'Dashboard Overview'}
                {activeTab === 'foods' && 'Food Items & Universal Menu Engine'}
                {activeTab === 'categories' && 'Category Management'}
                {activeTab === 'subcategories' && 'Sub-Category / Food Type Management'}
                {activeTab === 'sliders' && 'Featured Specials Slider Management'}
                {activeTab === 'settings' && 'Restaurant Profile & Credentials Settings'}
                {activeTab === 'support' && 'Support Tickets & 24/7 Live Care'}
                {activeTab === 'orders' && 'Order Management'}
                {activeTab === 'payments' && 'Customer Payments & Transactions'}
              </h1>
            </div>
          </div>

          {/* Right: Live Clock, Timezone, Theme Toggle, CTA */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Live Native Clock with Timezone Detection */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-[5px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F19]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-left leading-tight">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wider">
                    {currentTime}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {currentDate}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  title="Click to detect/sync device location and timezone"
                  className="flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 font-semibold hover:underline cursor-pointer"
                >
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[140px]">{deviceTimeZone}</span>
                </button>
              </div>
            </div>

            {/* Dark Mode / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`px-3 py-2 rounded-[5px] border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline text-xs font-bold">{isDark ? 'Light' : 'Dark'}</span>
            </button>

            {/* Quick Add CTA */}
            {activeTab === 'sliders' ? (
              <button
                onClick={() => { setEditingSlider(null); setIsSliderWizardOpen(true); }}
                className="px-3.5 py-2 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Featured Slider</span>
                <span className="sm:hidden">Create</span>
              </button>
            ) : (
              <button
                onClick={() => { setEditingFood(null); setIsWizardOpen(true); }}
                className="px-3.5 py-2 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add New Food</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
        </header>

        {/* Location / Timezone Notification Toast */}
        {locationNotice && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-[5px] bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs flex items-center justify-between animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{locationNotice}</span>
            </div>
            <button
              onClick={() => setLocationNotice(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dynamic Section Content with Full Native Scrolling */}
        <main className="p-4 sm:p-6 flex-1 space-y-6 max-w-7xl w-full mx-auto pb-16">

          {/* ====================================================== */}
          {/* SECTION 1: FOOD ITEMS & PUBLISH (DEFAULT LANDING TAB)  */}
          {/* ====================================================== */}
          {activeTab === 'foods' && (
            <div className="space-y-6">

              {/* Top Banner: Live Food Menu Catalog (Exact RPDS 004 Specification with Animation) */}
              <div className={`p-6 sm:p-7 rounded-[22px] border relative overflow-hidden transition-all duration-300 ${
                isDark ? 'bg-[#0f1420] border-slate-800 shadow-xl' : 'bg-white border-slate-200/90 shadow-[0_4px_25px_rgba(0,0,0,0.03)]'
              }`}>
                {/* CSS Keyframe Animation for Bell Ring & Live Sparkline Path Drawing */}
                <style>{`
                  @keyframes rpdsBellSway {
                    0%, 100% { transform: rotate(0deg); }
                    12% { transform: rotate(8deg); }
                    24% { transform: rotate(-7deg); }
                    36% { transform: rotate(5deg); }
                    48% { transform: rotate(-3deg); }
                    60% { transform: rotate(1deg); }
                    70% { transform: rotate(0deg); }
                  }
                  .animate-rpds-bell {
                    animation: rpdsBellSway 3.2s ease-in-out infinite;
                    transform-origin: 32px 18px;
                  }
                  @keyframes sparklineDraw {
                    0% {
                      stroke-dashoffset: 120;
                    }
                    100% {
                      stroke-dashoffset: 0;
                    }
                  }
                  @keyframes sparklineFillReveal {
                    0% {
                      clip-path: inset(0 100% 0 0);
                      opacity: 0;
                    }
                    15% {
                      opacity: 1;
                    }
                    100% {
                      clip-path: inset(0 0% 0 0);
                      opacity: 1;
                    }
                  }
                  .animate-sparkline-stroke {
                    stroke-dasharray: 120;
                    stroke-dashoffset: 120;
                    animation: sparklineDraw 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                  }
                  .animate-sparkline-fill {
                    clip-path: inset(0 100% 0 0);
                    animation: sparklineFillReveal 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                  }
                `}</style>

                {/* Ambient Warm Gradient Flow in Top-Right */}
                <div className="absolute top-0 right-0 w-[420px] h-[220px] bg-gradient-to-bl from-orange-200/35 via-amber-100/15 to-transparent dark:from-orange-950/20 dark:via-transparent pointer-events-none rounded-tr-[22px]" />

                {/* Header Row: Store Icon with Live Dot + Title/Subtitle + Animated Cloche Bell */}
                <div className="flex items-center justify-between gap-4 pb-6 relative z-10">
                  {/* Left: Store Icon + Divider + Title & Subtitle */}
                  <div className="flex items-center gap-3.5">
                    {/* Store Icon Box with pulsing live status green dot */}
                    <div className="relative shrink-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        isDark ? 'bg-orange-500/10 border border-orange-500/25 text-orange-400' : 'bg-orange-50 border border-orange-200/80 text-orange-600 shadow-sm'
                      }`}>
                        <Store className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      {/* Active green radar indicator */}
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-[#0f1420]" />
                      </span>
                    </div>

                    {/* Vertical Divider */}
                    <div className={`w-[2px] h-9 mx-0.5 rounded-full ${
                      isDark ? 'bg-slate-800' : 'bg-slate-200'
                    }`} />

                    {/* Title & Subtitle */}
                    <div className="space-y-0.5">
                      <h2 className={`text-xl sm:text-[23px] font-black tracking-tight leading-tight ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}>
                        Live Food Menu Catalog
                      </h2>
                      <p className={`text-xs sm:text-[13px] font-medium leading-relaxed ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Real-time menu, engagement, and digital order insights
                      </p>
                    </div>
                  </div>

                  {/* Right: Radiant Cloche Bell with Rings & Animation */}
                  <div className="hidden sm:flex items-center pr-2 shrink-0">
                    <div className="relative group shrink-0 flex items-center justify-center p-2">
                      {/* Ambient soft glow */}
                      <div className="absolute inset-0 bg-orange-400/20 blur-xl rounded-full pointer-events-none" />

                      <div className="relative cursor-pointer transition-transform duration-300 hover:scale-105">
                        <svg className="w-16 h-16 sm:w-20 sm:h-20 text-orange-500 overflow-visible drop-shadow-[0_4px_12px_rgba(249,115,22,0.2)]" viewBox="0 0 64 64" fill="none">
                          {/* 3 Radiating Rays with pulse animation */}
                          <line x1="32" y1="4" x2="32" y2="10" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse" />
                          <line x1="18" y1="10" x2="23" y2="15" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse [animation-delay:150ms]" />
                          <line x1="46" y1="10" x2="41" y2="15" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse [animation-delay:300ms]" />

                          {/* Bell Dome & Handle with Sway Animation */}
                          <g className="origin-top animate-rpds-bell">
                            {/* Top Knob Handle */}
                            <circle cx="32" cy="18" r="3.2" fill="#EA580C" />
                            <path d="M30 21h4v3h-4z" fill="#EA580C" />

                            {/* Cloche Dome */}
                            <path
                              d="M14 42 C14 26, 50 26, 50 42 Z"
                              fill="url(#rpdsBellGrad)"
                              stroke="#C2410C"
                              strokeWidth="2"
                            />

                            {/* Dome Highlight */}
                            <path
                              d="M20 39 C22 31, 42 31, 44 39"
                              stroke="#FFEDD5"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              opacity="0.8"
                            />

                            {/* Platter Base Rim */}
                            <rect x="10" y="42" width="44" height="4" rx="2" fill="#C2410C" />
                            <rect x="8" y="46" width="48" height="2.5" rx="1.25" fill="#EA580C" />
                          </g>

                          <defs>
                            <linearGradient id="rpdsBellGrad" x1="14" y1="26" x2="50" y2="42" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#FDBA74" />
                              <stop offset="0.5" stopColor="#FB923C" />
                              <stop offset="1" stopColor="#EA580C" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 10 Metric / KPI Cards (2 Rows of 5 Columns matching RPDS 004) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 pt-1 relative z-10">
                  {[
                    {
                      id: 'total_items',
                      title: 'Total Items',
                      value: foods.length,
                      icon: Layers,
                      trend: `${metrics.totalPublishedItems} Active`,
                      comparison: `${metrics.unpublishedItems} Draft`,
                      trendType: 'up',
                      sparkColor: 'orange',
                      isHighlighted: true,
                    },
                    {
                      id: 'categories',
                      title: 'Categories',
                      value: uniqueCategories.length,
                      icon: LayoutGrid,
                      trend: `${subcategories?.length || 0} Sub-types`,
                      comparison: 'Catalog Groups',
                      trendType: 'up',
                      sparkColor: 'orange',
                    },
                    {
                      id: 'total_scan',
                      title: 'Total Scan',
                      value: scansData.totalScans,
                      icon: QrCode,
                      trend: scansData.totalScans > 0 ? `${scansData.totalScans} visits` : '0 visits',
                      comparison: 'QR & Web Traffic',
                      trendType: scansData.totalScans > 0 ? 'up' : 'neutral',
                      sparkColor: scansData.totalScans > 0 ? 'orange' : 'gray',
                    },
                    {
                      id: 'today_scan',
                      title: 'Today Scan',
                      value: scansData.todayScans,
                      icon: Scan,
                      trend: scansData.todayScans > 0 ? `+${scansData.todayScans} today` : '0 today',
                      comparison: 'Since 12:00 AM',
                      trendType: scansData.todayScans > 0 ? 'up' : 'neutral',
                      sparkColor: scansData.todayScans > 0 ? 'orange' : 'gray',
                    },
                    {
                      id: 'total_dgm_orders',
                      title: 'Total DGM Orders',
                      value: metrics.totalOrders,
                      icon: ShoppingCart,
                      trend: `${orders.filter(o => o.orderStatus === 'completed' || o.orderStatus === 'confirmed').length} Confirmed`,
                      comparison: 'All-time bills',
                      trendType: metrics.totalOrders > 0 ? 'up' : 'neutral',
                      sparkColor: metrics.totalOrders > 0 ? 'orange' : 'gray',
                    },
                    {
                      id: 'today_dgm_orders',
                      title: 'Today DGM Orders',
                      value: metrics.todayOrders,
                      icon: ShoppingCart,
                      isCartWithClock: true,
                      trend: metrics.todayOrders > 0 ? `+${metrics.todayOrders} today` : '0 today',
                      comparison: 'Since 12:00 AM',
                      trendType: metrics.todayOrders > 0 ? 'up' : 'neutral',
                      sparkColor: metrics.todayOrders > 0 ? 'orange' : 'gray',
                    },
                    {
                      id: 'today_fees_collection',
                      title: 'Today Fees Collection',
                      value: `৳${todayFeesAmount}`,
                      icon: Coins,
                      trend: '৳5.00 / bill',
                      comparison: metrics.todayOrders > 0 ? `${metrics.todayOrders} bills today` : 'No bills today',
                      trendType: todayFeesAmount > 0 ? 'up' : 'neutral',
                      sparkColor: todayFeesAmount > 0 ? 'orange' : 'gray',
                    },
                    {
                      id: 'total_due_settlement',
                      title: 'Total Due Settlement',
                      value: `৳${dueSettlementAmount}`,
                      icon: Wallet,
                      trend: dueSettlementAmount > 0 ? 'Due to pay' : 'All Settled',
                      comparison: dueSettlementAmount > 0 ? 'Owed to Platform' : 'Paid in Full',
                      trendType: dueSettlementAmount > 0 ? 'up' : 'neutral',
                      sparkColor: dueSettlementAmount > 0 ? 'orange' : 'gray',
                      action: () => setIsSettlementModalOpen(true),
                      isClickable: true,
                    },
                    {
                      id: 'total_followers',
                      title: 'Total Followers',
                      value: followersData.totalFollowers,
                      icon: Users,
                      trend: followersData.totalFollowers > 0 ? `${followersData.totalFollowers} diners` : '0 diners',
                      comparison: 'Loyal diner base',
                      trendType: followersData.totalFollowers > 0 ? 'up' : 'neutral',
                      sparkColor: followersData.totalFollowers > 0 ? 'orange' : 'gray',
                    },
                    {
                      id: 'today_followers',
                      title: 'Today Followers',
                      value: followersData.todayFollowers,
                      icon: UserPlus,
                      trend: followersData.todayFollowers > 0 ? `+${followersData.todayFollowers} today` : '0 today',
                      comparison: 'Since 12:00 AM',
                      trendType: followersData.todayFollowers > 0 ? 'up' : 'neutral',
                      sparkColor: followersData.todayFollowers > 0 ? 'orange' : 'gray',
                    },
                  ].map((card, idx) => (
                    <div
                      key={card.id}
                      onClick={card.action}
                      role={card.action ? 'button' : undefined}
                      tabIndex={card.action ? 0 : undefined}
                      className={`rounded-[18px] sm:rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all duration-300 relative group select-none hover:-translate-y-1 hover:shadow-lg ${
                        card.action ? 'cursor-pointer hover:border-orange-500/60 active:scale-[0.98]' : ''
                      } ${
                        card.isHighlighted
                          ? isDark
                            ? 'bg-[#0B0F19] border border-orange-500/50 shadow-[0_4px_20px_rgba(249,115,22,0.12)] ring-1 ring-orange-500/25'
                            : 'bg-white border border-orange-300 shadow-[0_4px_18px_rgba(249,115,22,0.08)] ring-1 ring-orange-200/60'
                          : isDark
                            ? 'bg-[#0B0F19] border border-slate-800 hover:border-slate-700 shadow-sm'
                            : 'bg-white border border-slate-200/90 hover:border-orange-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                      }`}
                    >
                      {/* Top Row: Icon + Title */}
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 relative ${
                          isDark ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400' : 'bg-orange-50 border border-orange-200/60 text-orange-500'
                        }`}>
                          <card.icon className="w-5 h-5 stroke-[2.2]" />
                          {card.isCartWithClock && (
                            <Clock className="w-2.5 h-2.5 text-orange-600 absolute -bottom-0.5 -right-0.5 bg-orange-100 dark:bg-orange-950 rounded-full stroke-[2.5]" />
                          )}
                        </div>
                        <span className={`text-xs sm:text-[13px] font-bold truncate tracking-tight ${
                          isDark ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          {card.title}
                        </span>
                      </div>

                      {/* Middle Row: Big Metric Value with Count-Up Animation + Sparkline Chart with Left-to-Right Draw Animation */}
                      <div className="flex items-end justify-between gap-2 pt-0.5 pb-1">
                        <span className={`text-2xl sm:text-[26px] font-black tabular-nums tracking-tight leading-none ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          <AnimatedCounter value={card.value} duration={1300} />
                        </span>

                        {/* Sparkline Wave Chart with Smooth Gradient & Draw Animation from start to end */}
                        <svg className="w-20 h-10 overflow-visible shrink-0 transition-transform duration-300 group-hover:scale-105" viewBox="0 0 80 32" fill="none">
                          <defs>
                            <linearGradient id={`sparkGrad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={card.sparkColor === 'orange' ? '#F97316' : '#94A3B8'} stopOpacity={card.sparkColor === 'orange' ? 0.32 : 0.16} />
                              <stop offset="100%" stopColor={card.sparkColor === 'orange' ? '#F97316' : '#94A3B8'} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          {card.sparkColor === 'orange' ? (
                            <>
                              <path
                                d="M0 26 C20 26, 32 18, 48 20 C60 22, 68 12, 80 6 L80 32 L0 32 Z"
                                fill={`url(#sparkGrad-${card.id})`}
                                className="animate-sparkline-fill"
                                style={{ animationDelay: `${idx * 50}ms` }}
                              />
                              <path
                                d="M0 26 C20 26, 32 18, 48 20 C60 22, 68 12, 80 6"
                                stroke="#F97316"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                className="animate-sparkline-stroke"
                                style={{ animationDelay: `${idx * 50}ms` }}
                              />
                            </>
                          ) : (
                            <>
                              <path
                                d="M0 25 C25 25, 45 24, 60 25 C70 26, 75 25, 80 25 L80 32 L0 32 Z"
                                fill={`url(#sparkGrad-${card.id})`}
                                className="animate-sparkline-fill"
                                style={{ animationDelay: `${idx * 50}ms` }}
                              />
                              <path
                                d="M0 25 C25 25, 45 24, 60 25 C70 26, 75 25, 80 25"
                                stroke="#94A3B8"
                                strokeWidth="2"
                                strokeLinecap="round"
                                className="animate-sparkline-stroke"
                                style={{ animationDelay: `${idx * 50}ms` }}
                              />
                            </>
                          )}
                        </svg>
                      </div>

                      {/* Bottom Row: Trend Pill + Comparison Text */}
                      <div className="flex items-center justify-between gap-1.5 pt-0.5">
                        {card.trendType === 'up' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10.5px] sm:text-[11px] font-bold tracking-tight shrink-0">
                            <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                            <span>{card.trend}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[10.5px] sm:text-[11px] font-bold tracking-tight shrink-0">
                            <span>– {card.trend}</span>
                          </span>
                        )}

                        {card.id === 'total_due_settlement' && card.action ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              card.action();
                            }}
                            className="text-[10px] sm:text-[10.5px] font-bold px-2 py-0.5 rounded-[5px] bg-orange-600/15 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-500/30 transition-all cursor-pointer"
                          >
                            {dueSettlementAmount > 0 ? 'Settle Dues' : 'History'}
                          </button>
                        ) : card.comparison ? (
                          <span className={`text-[10px] sm:text-[11px] font-medium tracking-tight truncate ${
                            isDark ? 'text-slate-400' : 'text-slate-400'
                          }`}>
                            {card.comparison}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settlement Success Banner */}
              {settlementSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{settlementSuccessMsg}</span>
                  </div>
                  <button onClick={() => setSettlementSuccessMsg('')} className="text-emerald-400/80 hover:text-emerald-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by food title or category..."
                    value={foodSearchQuery}
                    onChange={(e) => setFoodSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-[5px] border text-xs sm:text-sm focus:outline-none focus:border-orange-500 ${
                      isDark ? 'bg-[#0F1420] border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    onClick={() => setSelectedFoodCategory('All')}
                    className={`px-3 py-1.5 rounded-[5px] text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      selectedFoodCategory === 'All'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : isDark
                          ? 'bg-[#0F1420] border border-slate-800 text-slate-400 hover:text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    All
                  </button>
                  {uniqueCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedFoodCategory(cat)}
                      className={`px-3 py-1.5 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                        selectedFoodCategory === cat
                          ? 'bg-orange-600 text-white shadow-sm'
                          : isDark
                            ? 'bg-[#0F1420] border border-slate-800 text-slate-400 hover:text-white'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3-Column Food Items Catalog Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFoods.map(food => {
                  const isPub = food.is_published !== false && food.status !== 'draft' && food.status !== 'unpublished';
                  const portionCount = food.customizable?.portions?.length || 1;
                  const addonCount = food.customizable?.addons?.length || 0;

                  return (
                    <div
                      key={food.id}
                      className={`rounded-[5px] border flex flex-col justify-between overflow-hidden transition-all group ${
                        isDark ? 'bg-[#0F1420] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-300 shadow-sm hover:border-slate-400'
                      }`}
                    >
                      {/* Top Framed Food Image Box */}
                      <div className={`h-48 relative flex items-center justify-center p-4 overflow-hidden ${
                        isDark ? 'bg-[#080B11] border-b border-slate-800/80' : 'bg-slate-50 border-b border-slate-200'
                      }`}>
                        {/* Tag Badge (top-left) - only render if real tag exists */}
                        {food.tag && (
                          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-[5px] bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm z-10">
                            {food.tag}
                          </span>
                        )}

                        {/* Rating Badge (top-right) - show real rating or New */}
                        <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-[5px] text-[11px] font-bold flex items-center gap-1 z-10 ${
                          isDark ? 'bg-black/60 text-amber-400 border border-amber-500/30 backdrop-blur-xs' : 'bg-white/90 text-amber-600 border border-amber-200 shadow-xs'
                        }`}>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{food.rating ? Number(food.rating).toFixed(1) : 'New'}</span>
                        </span>

                        {/* Centered Food Photo */}
                        {food.image ? (
                          <img
                            src={food.image}
                            alt={food.title}
                            className="max-h-36 max-w-[85%] object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-500">
                            <Utensils className="w-10 h-10 mb-1 opacity-40" />
                            <span className="text-[11px]">No Photo</span>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          {/* Title & Price Header */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={`font-bold text-sm sm:text-base leading-snug line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`} title={food.title}>
                              {food.title}
                            </h3>
                            <span className="font-black text-sm sm:text-base text-orange-500 shrink-0">
                              {currency}{Number(food.price || 0).toFixed(2)}
                            </span>
                          </div>

                          {/* Category & Subcategory */}
                          <div className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {food.category}{food.subcategory ? ` • ${food.subcategory}` : ''}
                          </div>

                          {/* Description Snippet */}
                          <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed min-h-[32px] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                            {food.description || 'No description added yet.'}
                          </p>
                        </div>

                        {/* Portions & Add-ons Badges */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-medium border ${
                            isDark
                              ? 'border-orange-500/20 bg-orange-500/10 text-orange-400'
                              : 'border-orange-200 bg-orange-50 text-orange-700'
                          }`}>
                            {portionCount} {portionCount > 1 ? 'Sizes' : 'Single'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-medium border ${
                            isDark
                              ? 'border-orange-500/20 bg-orange-500/10 text-orange-400'
                              : 'border-orange-200 bg-orange-50 text-orange-700'
                          }`}>
                            {addonCount} {addonCount === 1 ? 'Add-on' : 'Add-ons'}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Status and Delete */}
                      <div className={`px-4 py-3 border-t flex items-center justify-between text-xs ${
                        isDark ? 'bg-[#080B11] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <button
                          onClick={() => onToggleFoodStatus && onToggleFoodStatus(food.id)}
                          className={`flex items-center gap-1.5 font-semibold transition-opacity cursor-pointer hover:opacity-80 ${
                            isPub ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 ${isPub ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <span>{isPub ? 'Live on Menu' : 'Draft / Off'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingFood(food);
                              setIsWizardOpen(true);
                            }}
                            className={`p-1.5 rounded-[5px] transition-colors cursor-pointer ${
                              isDark ? 'text-slate-400 hover:text-orange-400 hover:bg-slate-800' : 'text-slate-500 hover:text-orange-600 hover:bg-slate-200/70'
                            }`}
                            title="Edit Food Item"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${food.title}"?`)) {
                                onDeleteFood && onDeleteFood(food.id);
                              }
                            }}
                          className={`p-1 transition-colors cursor-pointer ${
                            isDark ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'
                          }`}
                          title="Delete Food Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredFoods.length === 0 && (
                <div className={`p-12 text-center rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800 text-slate-400' : 'bg-white border-slate-300 text-slate-600'
                  }`}>
                  <Utensils className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No food items found matching your filters.</p>
                  <button
                    onClick={() => { setEditingFood(null); setIsWizardOpen(true); }}
                    className="mt-3 px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-[5px] cursor-pointer"
                  >
                    Add Food Item
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ====================================================== */}
          {/* SECTION 2: CREATE CATEGORY                             */}
          {/* ====================================================== */}
          {activeTab === 'categories' && (
            <div className="space-y-6">

              {/* Category Creation Form */}
              <div className={`p-6 rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                }`}>
                <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Add New Menu Category
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Categories organize dishes on the 3D Digital Menu (e.g. Main Course, Appetizers, Beverages, Dessert).
                </p>

                <form onSubmit={handleCreateCategory} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Traditional Biryani, Chef Specials, Mocktails..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className={`flex-1 px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Category</span>
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 font-semibold">Quick Suggestions:</span>
                  {['Main Course', 'Appetizers', 'Beverages', 'Dessert', 'Chef Specials', 'Seafood', 'Snacks'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategoryName(cat)}
                      className={`px-2 py-1 rounded-[5px] text-[11px] border cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      + {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category List Table */}
              <div className={`rounded-[5px] border overflow-hidden ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                }`}>
                <div className={`p-4 border-b ${isDark ? 'border-slate-800 bg-[#0B0F19]' : 'border-slate-300 bg-slate-50'}`}>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Active Menu Categories ({uniqueCategories.length})
                  </h3>
                </div>

                <div className={`divide-y text-xs ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {uniqueCategories.map((catName) => {
                    const count = foods.filter(f => f.category === catName).length;
                    const isDefault = catName === 'All';
                    return (
                      <div key={catName} className={`p-4 flex items-center justify-between ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center font-bold ${isDark ? 'bg-slate-800 text-orange-400' : 'bg-slate-100 text-orange-600'
                            }`}>
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <span className={`font-bold text-sm block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {catName}
                            </span>
                            <span className="text-slate-500 text-[11px]">{count} food items currently assigned</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isDefault && (
                            <button
                              onClick={() => onDeleteCategory && onDeleteCategory(catName)}
                              className="px-3 py-1 rounded-[5px] text-slate-500 hover:text-red-600 text-xs font-medium cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* SECTION 3: CREATE SUB-CATEGORY (FOOD TYPE - OPTIONAL)   */}
          {/* ====================================================== */}
          {activeTab === 'subcategories' && (
            <div className="space-y-6">

              {/* Sub-Category Form */}
              <div className={`p-6 rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-orange-600" />
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Create Sub-Category (Food Type)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Sub-categories are granular food types (e.g. Biryani, Burgers, Sourdough Pizza, Mocktails). This field is optional for dishes.
                </p>

                <form onSubmit={handleCreateSubcategory} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Parent Category
                    </label>
                    <div className="relative">
                      <select
                        value={newSubcategoryParent}
                        onChange={(e) => setNewSubcategoryParent(e.target.value)}
                        className={`w-full appearance-none pl-3.5 pr-10 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 cursor-pointer ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                      >
                        {uniqueCategories.filter(c => c !== 'All').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex flex-col justify-end">
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Sub-Category / Food Type Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kacchi Biryani, Double Beef Burger, Cold Brew..."
                        value={newSubcategoryName}
                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                        className={`flex-1 px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Sub-Category</span>
                      </button>
                    </div>
                  </div>
                </form>

                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 font-semibold">Common Food Types:</span>
                  {['Biryani & Rice', 'Burgers', 'Sourdough Pizza', 'Crispy Chicken', 'Chilled Coffee', 'Mocktails', 'Kunafa & Sweets', 'Artisan Gelato'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewSubcategoryName(type)}
                      className={`px-2 py-1 rounded-[5px] text-[11px] border cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      + {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-Category List */}
              <div className={`rounded-[5px] border overflow-hidden ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                }`}>
                <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-[#0B0F19]' : 'border-slate-300 bg-slate-50'}`}>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Configured Sub-Categories ({subcategories.length})
                  </h3>
                  <span className="text-[11px] text-slate-500">Assigned during Add Food Wizard</span>
                </div>

                <div className={`divide-y text-xs ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {subcategories.map(sub => {
                    const assignedFoods = foods.filter(f => f.subcategory === sub.name).length;
                    return (
                      <div key={sub.id} className={`p-4 flex items-center justify-between ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center font-bold ${isDark ? 'bg-slate-800 text-orange-400' : 'bg-slate-100 text-orange-600'
                            }`}>
                            <Tag className="w-4 h-4" />
                          </div>
                          <div>
                            <span className={`font-bold text-sm block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {sub.name}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              Parent: <span className="font-semibold">{sub.category}</span> &bull; {assignedFoods} dishes assigned
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => onDeleteSubcategory && onDeleteSubcategory(sub.id)}
                          className="px-3 py-1 rounded-[5px] text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  {subcategories.length === 0 && (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No sub-categories created yet. Add one above to group dishes by food type.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* SECTION 4: FEATURED SLIDERS (FEATURED SPECIALS ENGINE) */}
          {/* ====================================================== */}
          {activeTab === 'sliders' && (
            <div className="space-y-6">

              {/* Header Card with CTA */}
              <div className={`p-6 rounded-[5px] border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                }`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Featured Specials Slider Engine
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 max-w-xl">
                    Configure the rotating promotional banners displayed inside the customer's 3D Digital Menu. Select dishes, set promotional badges, customize text, and see live previews before publishing.
                  </p>
                </div>

                <button
                  onClick={() => setIsSliderWizardOpen(true)}
                  className="px-4 py-2.5 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Featured Slider</span>
                </button>
              </div>

              {/* Sliders Grid List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredSliders.map(slide => {
                  return (
                    <div
                      key={slide.id}
                      className={`rounded-[5px] border overflow-hidden flex flex-col justify-between ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                        }`}
                    >
                      {/* Realistic Banner Card Inside - Exact Match with Customer 3D Menu */}
                      <div className="p-5 bg-gradient-to-r from-[#220b05] via-[#140602] to-[#0a0301] border-b border-orange-950/40 relative flex items-center justify-between min-h-[145px] overflow-hidden select-none">
                        {/* Ambient warm radial glow matching digital menu */}
                        <div className="absolute left-0 top-0 bottom-0 w-2/3 bg-radial from-orange-600/25 to-transparent blur-xl pointer-events-none" />

                        <div className="z-10 flex-1 pr-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] bg-orange-950/80 border border-orange-500/50 text-amber-300 font-black text-[10px] uppercase tracking-wider mb-2">
                            <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span>{slide.badge}</span>
                          </div>
                          <h4 className="text-white font-extrabold text-lg sm:text-xl tracking-tight leading-tight line-clamp-1">
                            {slide.title}
                          </h4>
                          {slide.subtitle && (
                            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 line-clamp-2 leading-snug max-w-sm">
                              {slide.subtitle}
                            </p>
                          )}
                          <span className="text-orange-400 font-black text-sm sm:text-base mt-2.5 block">
                            Explore Dish &bull; {currency}{Number(slide.price || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* Floating Food Preview Image with Drop Shadow */}
                        <div className="z-10 w-28 h-28 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center relative">
                          {slide.image ? (
                            <img
                              src={slide.image}
                              alt={slide.title}
                              className={slide.isPng !== false ? "max-h-28 max-w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)] scale-110" : "w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-full border border-white/20 shadow-2xl"}
                            />
                          ) : (
                            <Utensils className="w-10 h-10 text-orange-400" />
                          )}
                        </div>
                      </div>
                      {/* Controls Footer */}
                      <div className={`p-3 border-t flex items-center justify-between text-xs ${isDark ? 'bg-[#0B0F19] border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                        <button
                          onClick={() => onToggleFeaturedSlider && onToggleFeaturedSlider(slide.id)}
                          className={`flex items-center gap-1.5 font-bold cursor-pointer ${slide.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                            }`}
                        >
                          {slide.isActive ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                          <span>{slide.isActive ? 'Active on Digital Menu' : 'Inactive'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingSlider(slide);
                              setIsSliderWizardOpen(true);
                            }}
                            className={`p-1.5 rounded-[5px] transition-colors cursor-pointer ${
                              isDark ? 'text-slate-400 hover:text-orange-400 hover:bg-slate-800' : 'text-slate-500 hover:text-orange-600 hover:bg-slate-200/70'
                            }`}
                            title="Edit Featured Slider"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Delete slider "${slide.title}"?`)) {
                                onDeleteFeaturedSlider && onDeleteFeaturedSlider(slide.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Delete Slider"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {featuredSliders.length === 0 && (
                  <div className="col-span-full p-12 text-center text-slate-500 text-xs">
                    No featured sliders published yet. Click "Create New Featured Slider" to highlight special dishes!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* SECTION 5: SETTINGS (RESTAURANT IDENTITY & ACCOUNT)    */}
          {/* ====================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">

              {settingsSuccessMessage && (
                <div className="p-3 rounded-[5px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{settingsSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-6">

                {/* 1. Restaurant Identity Card */}
                <div className={`p-6 rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                  }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Building className="w-5 h-5 text-orange-600" />
                    <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Restaurant Identity & Profile
                    </h3>
                  </div>
                  <p className={`text-sm sm:text-[14px] leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Update the venue name, tagline, and brand logo displayed to diners on the 3D Digital Menu.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={`text-xs sm:text-sm font-semibold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Restaurant Name <span className="text-orange-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-[5px] border text-sm sm:text-base font-semibold focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                      />
                    </div>

                    <div>
                      <label className={`text-xs sm:text-sm font-semibold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Tagline / Subheading
                      </label>
                      <input
                        type="text"
                        value={profileForm.tagline}
                        onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-[5px] border text-sm sm:text-base font-semibold focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                      />
                    </div>

                    <div>
                      <label className={`text-xs sm:text-sm font-semibold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Active Currency Symbol
                      </label>
                      <div className="relative">
                        <select
                          value={profileForm.currency}
                          onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                          className={`w-full appearance-none pl-3.5 pr-10 py-2.5 rounded-[5px] border text-sm sm:text-base font-semibold focus:outline-none focus:border-orange-500 cursor-pointer ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                        >
                          <option value="$">USD ($)</option>
                          <option value="৳">BDT (৳)</option>
                          <option value="€">EUR (€)</option>
                          <option value="£">GBP (£)</option>
                          <option value="₹">INR (₹)</option>
                          <option value="AED">AED (د.إ)</option>
                          <option value="SAR">SAR (﷼)</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Restaurant Logo with Local File Upload & Professional Recommendations */}
                    <div className="sm:col-span-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                        <label className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Restaurant Brand Logo (PNG / Transparent Image)
                        </label>
                        <span className="text-xs sm:text-[13px] font-bold text-orange-600 dark:text-orange-400">
                          Recommended: 512×512px Transparent PNG
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                        {/* Logo Preview Box */}
                        <div className="sm:col-span-3">
                          <div className={`h-28 rounded-[5px] border-2 border-dashed flex items-center justify-center p-2 relative overflow-hidden transition-all ${
                            profileForm.logo 
                              ? 'border-orange-500/40 bg-orange-500/5' 
                              : isDark ? 'border-slate-700 bg-[#0B0F19]' : 'border-slate-300 bg-slate-50'
                          }`}>
                            {profileForm.logo ? (
                              <div className="relative w-full h-full flex items-center justify-center group">
                                <img
                                  src={profileForm.logo}
                                  alt="Restaurant Logo"
                                  className="max-h-full max-w-full object-contain drop-shadow-md"
                                />
                                <button
                                  type="button"
                                  onClick={() => setProfileForm({ ...profileForm, logo: '' })}
                                  className="absolute top-0 right-0 p-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xs cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                                  title="Remove Logo"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-center text-slate-400">
                                <Upload className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                <span className="text-xs font-semibold block">No Logo Selected</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Local Upload & URL Input */}
                        <div className="sm:col-span-9 space-y-3">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <label className="px-5 py-2.5 rounded-[5px] bg-orange-600 hover:bg-orange-500 active:scale-98 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors shrink-0">
                              <Upload className="w-4 h-4" />
                              <span>Upload from Device</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const res = await compressImage(file, {
                                      maxWidth: 400,
                                      maxHeight: 400,
                                      quality: 0.88,
                                      autoTrimTransparency: false
                                    });
                                    if (res && res.dataUrl) {
                                      setProfileForm(prev => ({ ...prev, logo: res.dataUrl }));
                                    }
                                  } catch (err) {
                                    console.warn('Logo compression error:', err);
                                  }
                                }}
                              />
                            </label>

                            <input
                              type="text"
                              placeholder="Or paste external image URL / path..."
                              value={profileForm.logo}
                              onChange={(e) => setProfileForm({ ...profileForm, logo: e.target.value })}
                              className={`flex-1 px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 ${
                                isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>

                          {/* Hallmark Logo Specifications & Recommendations Banner */}
                          <div className={`p-3.5 rounded-[5px] border text-xs sm:text-[13px] space-y-2 leading-relaxed ${
                            isDark ? 'bg-[#0B0F19] border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-orange-600 dark:text-orange-400">Specifications:</span>
                              <span className="px-2 py-0.5 rounded-[3px] bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20 text-[11px]">
                                Transparent PNG / SVG (Recommended)
                              </span>
                              <span className="px-2 py-0.5 rounded-[3px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                1:1 Square Ratio
                              </span>
                              <span className="px-2 py-0.5 rounded-[3px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                512 × 512 px (Retina HD)
                              </span>
                              <span className="px-2 py-0.5 rounded-[3px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                Max &lt; 2 MB
                              </span>
                            </div>
                            <p className={`text-xs sm:text-[12.5px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              • <strong>Why PNG is best:</strong> Transparent PNG allows your emblem to seamlessly blend over dark hologram-glass backgrounds without unsightly white rectangular boxes.<br />
                              • <strong>Safe Padding:</strong> Keep about 10%–15% empty margin around the artwork so it displays centered and never clips on customer devices.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Taxes & Service Charges Configuration Card */}
                {(() => {
                  const simVatRate = parseFloat(profileForm.vatRate) || 0;
                  const simScRate = parseFloat(profileForm.serviceChargeRate) || 0;
                  const simBasePrice = 500;
                  const simVatAmount = !profileForm.vatEnabled ? 0 : (
                    profileForm.vatType === 'flat' ? simVatRate : (simBasePrice * (simVatRate / 100))
                  );
                  const simScAmount = !profileForm.serviceChargeEnabled ? 0 : (
                    profileForm.serviceChargeType === 'flat' ? simScRate : (simBasePrice * (simScRate / 100))
                  );
                  const simTotalAmount = simBasePrice + simVatAmount + simScAmount;

                  return (
                    <div className={`p-6 rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Receipt className="w-5 h-5 text-orange-600" />
                        <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Taxes & Service Charges
                        </h3>
                      </div>
                      <p className={`text-sm sm:text-[14px] leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Configure government VAT and restaurant service fee calculation rules. You can charge either as a percentage (%) or as a fixed flat amount. These settings directly calculate and reflect in the live price summary and total amount across the 3D Digital Menu.
                      </p>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Block A: Government VAT / Sales Tax */}
                        <div className={`p-5 rounded-[5px] border transition-all ${
                          isDark ? 'bg-[#0B0F19]/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-200 dark:border-slate-800">
                            <div>
                              <h4 className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                Government VAT / Tax
                              </h4>
                              <p className={`text-xs sm:text-[13px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Government sales tax applied to food items
                              </p>
                            </div>

                            {/* Active / Inactive Toggle Switch */}
                            <button
                              type="button"
                              onClick={() => setProfileForm(prev => ({ ...prev, vatEnabled: !prev.vatEnabled }))}
                              className={`px-3 py-1.5 rounded-[5px] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                                profileForm.vatEnabled
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${profileForm.vatEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span>{profileForm.vatEnabled ? 'Active' : 'Disabled'}</span>
                            </button>
                          </div>

                          <div className="space-y-5">
                            {/* Segmented Switch for VAT Type: Percentage vs Flat */}
                            <div>
                              <label className={`text-xs sm:text-[13px] font-semibold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                VAT Calculation Method
                              </label>
                              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[5px] bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setProfileForm(prev => ({ ...prev, vatType: 'percentage' }))}
                                  className={`py-2 px-3.5 rounded-[5px] text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                    profileForm.vatType === 'percentage'
                                      ? 'bg-orange-600 text-white shadow-xs'
                                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                >
                                  <Percent className="w-3.5 h-3.5" />
                                  <span>Percentage (%)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setProfileForm(prev => ({ ...prev, vatType: 'flat' }))}
                                  className={`py-2 px-3.5 rounded-[5px] text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                    profileForm.vatType === 'flat'
                                      ? 'bg-orange-600 text-white shadow-xs'
                                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                >
                                  <span className="font-black text-xs">{currency}</span>
                                  <span>Flat Amount ({currency})</span>
                                </button>
                              </div>
                            </div>

                            {/* VAT Value Input */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {profileForm.vatType === 'percentage' ? 'VAT Rate (%)' : `Flat VAT Amount (${currency})`}
                                </label>
                                <span className="text-xs sm:text-[13px] text-orange-600 dark:text-orange-400 font-bold">
                                  {profileForm.vatType === 'percentage' 
                                    ? `${Number(profileForm.vatRate || 0)}% of Order Subtotal` 
                                    : `${currency}${Number(profileForm.vatRate || 0).toFixed(2)} Fixed Per Order`}
                                </span>
                              </div>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  disabled={!profileForm.vatEnabled}
                                  value={profileForm.vatRate}
                                  onChange={(e) => setProfileForm({ ...profileForm, vatRate: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0) })}
                                  placeholder={profileForm.vatType === 'percentage' ? 'e.g. 5.0' : 'e.g. 15.00'}
                                  className={`w-full pl-3.5 pr-10 py-2.5 rounded-[5px] border text-sm sm:text-base font-semibold focus:outline-none focus:border-orange-500 transition-colors ${
                                    !profileForm.vatEnabled ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
                                  } ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
                                  {profileForm.vatType === 'percentage' ? '%' : currency}
                                </span>
                              </div>
                              <p className={`text-xs sm:text-[13px] mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {profileForm.vatType === 'percentage' 
                                  ? 'Calculated dynamically as a percentage of each customer food item order.'
                                  : `A fixed flat tax of ${currency}${Number(profileForm.vatRate || 0).toFixed(2)} is charged on every checkout order.`}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Block B: Restaurant Service Charge */}
                        <div className={`p-5 rounded-[5px] border transition-all ${
                          isDark ? 'bg-[#0B0F19]/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-200 dark:border-slate-800">
                            <div>
                              <h4 className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                Restaurant Service Charge
                              </h4>
                              <p className={`text-xs sm:text-[13px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Table maintenance & dining staff service fee
                              </p>
                            </div>

                            {/* Active / Inactive Toggle Switch */}
                            <button
                              type="button"
                              onClick={() => setProfileForm(prev => ({ ...prev, serviceChargeEnabled: !prev.serviceChargeEnabled }))}
                              className={`px-3 py-1.5 rounded-[5px] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                                profileForm.serviceChargeEnabled
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${profileForm.serviceChargeEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span>{profileForm.serviceChargeEnabled ? 'Active' : 'Disabled'}</span>
                            </button>
                          </div>

                          <div className="space-y-5">
                            {/* Segmented Switch for Service Charge Type: Percentage vs Flat */}
                            <div>
                              <label className={`text-xs sm:text-[13px] font-semibold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                Service Charge Calculation Method
                              </label>
                              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[5px] bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setProfileForm(prev => ({ ...prev, serviceChargeType: 'percentage' }))}
                                  className={`py-2 px-3.5 rounded-[5px] text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                    profileForm.serviceChargeType === 'percentage'
                                      ? 'bg-orange-600 text-white shadow-xs'
                                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                >
                                  <Percent className="w-3.5 h-3.5" />
                                  <span>Percentage (%)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setProfileForm(prev => ({ ...prev, serviceChargeType: 'flat' }))}
                                  className={`py-2 px-3.5 rounded-[5px] text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                    profileForm.serviceChargeType === 'flat'
                                      ? 'bg-orange-600 text-white shadow-xs'
                                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                >
                                  <span className="font-black text-xs">{currency}</span>
                                  <span>Flat Amount ({currency})</span>
                                </button>
                              </div>
                            </div>

                            {/* Service Charge Value Input */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {profileForm.serviceChargeType === 'percentage' ? 'Service Charge Rate (%)' : `Flat Service Charge (${currency})`}
                                </label>
                                <span className="text-xs sm:text-[13px] text-orange-600 dark:text-orange-400 font-bold">
                                  {profileForm.serviceChargeType === 'percentage' 
                                    ? `${Number(profileForm.serviceChargeRate || 0)}% of Order Subtotal` 
                                    : `${currency}${Number(profileForm.serviceChargeRate || 0).toFixed(2)} Fixed Per Table`}
                                </span>
                              </div>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  disabled={!profileForm.serviceChargeEnabled}
                                  value={profileForm.serviceChargeRate}
                                  onChange={(e) => setProfileForm({ ...profileForm, serviceChargeRate: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0) })}
                                  placeholder={profileForm.serviceChargeType === 'percentage' ? 'e.g. 10.0' : 'e.g. 2.00'}
                                  className={`w-full pl-3.5 pr-10 py-2.5 rounded-[5px] border text-sm sm:text-base font-semibold focus:outline-none focus:border-orange-500 transition-colors ${
                                    !profileForm.serviceChargeEnabled ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
                                  } ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
                                  {profileForm.serviceChargeType === 'percentage' ? '%' : currency}
                                </span>
                              </div>
                              <p className={`text-xs sm:text-[13px] mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {profileForm.serviceChargeType === 'percentage'
                                  ? 'Calculated dynamically as a percentage of the total order value.'
                                  : `A fixed flat service fee of ${currency}${Number(profileForm.serviceChargeRate || 0).toFixed(2)} is charged per order.`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Digital Menu Calculation Simulation Box */}
                      <div className={`mt-6 p-5 rounded-[5px] border ${
                        isDark ? 'bg-[#080B11] border-slate-800' : 'bg-amber-50/50 border-amber-200'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-3.5">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-orange-500" />
                            <h4 className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              Live Customer Menu Bill Simulation
                            </h4>
                          </div>
                          <span className={`text-xs sm:text-[13px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Simulated on a sample {currency}500.00 dish order
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs sm:text-sm">
                          <div className={`p-3 rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className="text-xs sm:text-[13px] text-slate-400 block font-semibold mb-1">Food Subtotal</span>
                            <span className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>{currency}500.00</span>
                          </div>

                          <div className={`p-3 rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className="text-xs sm:text-[13px] text-slate-400 block font-semibold mb-1">
                              VAT {profileForm.vatEnabled ? (profileForm.vatType === 'percentage' ? `(${Number(profileForm.vatRate || 0)}%)` : '(Flat)') : '(Disabled)'}
                            </span>
                            <span className={`font-bold text-sm sm:text-base ${profileForm.vatEnabled ? 'text-emerald-500' : 'text-slate-400'}`}>
                              {profileForm.vatEnabled ? `+${currency}${simVatAmount.toFixed(2)}` : `${currency}0.00`}
                            </span>
                          </div>

                          <div className={`p-3 rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <span className="text-xs sm:text-[13px] text-slate-400 block font-semibold mb-1">
                              Service Charge {profileForm.serviceChargeEnabled ? (profileForm.serviceChargeType === 'percentage' ? `(${Number(profileForm.serviceChargeRate || 0)}%)` : '(Flat)') : '(Disabled)'}
                            </span>
                            <span className={`font-bold text-sm sm:text-base ${profileForm.serviceChargeEnabled ? 'text-emerald-500' : 'text-slate-400'}`}>
                              {profileForm.serviceChargeEnabled ? `+${currency}${simScAmount.toFixed(2)}` : `${currency}0.00`}
                            </span>
                          </div>

                          <div className={`p-3 rounded-[5px] border border-orange-500/30 ${isDark ? 'bg-orange-50/10' : 'bg-orange-50'}`}>
                            <span className="text-xs sm:text-[13px] text-orange-600 dark:text-orange-400 block font-black uppercase tracking-wider mb-1">Estimated Total</span>
                            <span className="font-black text-base sm:text-lg text-orange-600 dark:text-orange-400">{currency}{Math.round(simTotalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Credentials & Security */}
                <div className={`p-6 rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                  }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldCheck className="w-5 h-5 text-orange-600" />
                    <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Access Credentials & Owner Contact
                    </h3>
                  </div>
                  <p className={`text-sm sm:text-[14px] leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Update the credentials and contact details used to manage this restaurant portal.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={`text-xs sm:text-sm font-semibold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Restaurant Login ID / Username <span className="text-orange-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.loginId}
                        onChange={(e) => setProfileForm({ ...profileForm, loginId: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-[5px] border text-sm sm:text-base font-semibold focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                      />
                    </div>

                    <div>
                      <label className={`text-xs sm:text-sm font-semibold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Contact Email Address <span className="text-orange-600">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-[5px] border text-sm sm:text-base font-semibold focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                      />
                    </div>

                    <div>
                      <label className={`text-xs sm:text-sm font-semibold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="Leave unchanged to keep current password"
                        value={profileForm.password}
                        onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-[5px] border text-sm sm:text-base font-semibold focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                      />
                    </div>

                    <div>
                      <label className={`text-xs sm:text-sm font-semibold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        placeholder="Repeat new password"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-[5px] border text-sm sm:text-base font-semibold focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Restaurant Settings</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ====================================================== */}
          {/* SECTION 6: SUPPORT & 24/7 LIVE CARE                    */}
          {/* ====================================================== */}
          {activeTab === 'support' && (
            <div className="space-y-6">

              {/* Support Overview Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className={`p-4 rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Tickets</div>
                  <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{tickets.length}</div>
                </div>

                <div className={`p-4 rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Open / In Queue</div>
                  <div className="text-2xl font-black text-amber-500">
                    {tickets.filter(t => t.status !== 'Resolved').length}
                  </div>
                </div>

                <div className={`p-4 rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Resolved</div>
                  <div className="text-2xl font-black text-emerald-500">
                    {tickets.filter(t => t.status === 'Resolved').length}
                  </div>
                </div>

                <div className={`p-4 rounded-[5px] border ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Live Desk Status</div>
                  <div className="flex items-center gap-1.5 mt-1 text-emerald-500 font-bold text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>24/7 Active</span>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs: Ticket Submission vs Live Chat */}
              <div className="flex border-b border-slate-300 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSupportSubTab('tickets')}
                  className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${supportSubTab === 'tickets'
                      ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  Priority Tickets ({tickets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSupportSubTab('chat')}
                  className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${supportSubTab === 'chat'
                      ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>24/7 Live Care Chat</span>
                </button>
              </div>

              {supportSubTab === 'tickets' ? (
                /* TICKETS SUB-TAB */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* Left Column: Submit Ticket Form */}
                  <div className={`lg:col-span-5 p-6 rounded-[5px] border flex flex-col justify-between ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Headphones className="w-4 h-4 text-orange-600" />
                        <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Submit Priority Ticket
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                        Need urgent support with menu publishing, 3D AR holograms, QR code tables, or billing? Submit a ticket and our technical team will respond promptly.
                      </p>

                      {ticketSuccess && (
                        <div className="p-3 mb-4 rounded-[5px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{ticketSuccess}</span>
                        </div>
                      )}

                      <form onSubmit={handleSubmitTicket} className="space-y-4">
                        <div>
                          <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Issue Subject <span className="text-orange-600">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Table 04 3D hologram slow rotation on mobile"
                            value={ticketSubject}
                            onChange={(e) => setTicketSubject(e.target.value)}
                            className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                              }`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Category
                            </label>
                            <div className="relative">
                              <select
                                value={ticketCategory}
                                onChange={(e) => setTicketCategory(e.target.value)}
                                className={`w-full appearance-none pl-3.5 pr-10 py-2.5 rounded-[5px] border text-xs font-medium focus:outline-none focus:border-orange-500 cursor-pointer ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                  }`}
                              >
                                <option value="Technical Issue">Technical Issue</option>
                                <option value="Menu Setup & Cutouts">Menu Setup & Cutouts</option>
                                <option value="Payment & Billing">Payment & Billing</option>
                                <option value="Hardware / Table QR">Hardware / Table QR</option>
                              </select>
                              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Priority Level
                            </label>
                            <div className="relative">
                              <select
                                value={ticketPriority}
                                onChange={(e) => setTicketPriority(e.target.value)}
                                className={`w-full appearance-none pl-3.5 pr-10 py-2.5 rounded-[5px] border text-xs font-medium focus:outline-none focus:border-orange-500 cursor-pointer ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                  }`}
                              >
                                <option value="Low">Low Priority</option>
                                <option value="Medium">Medium Priority</option>
                                <option value="High">High Priority</option>
                                <option value="Urgent">Urgent Priority</option>
                              </select>
                              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Detailed Description <span className="text-orange-600">*</span>
                          </label>
                          <textarea
                            rows={4}
                            required
                            placeholder="Describe what occurred, table number, or steps to reproduce..."
                            value={ticketMessage}
                            onChange={(e) => setTicketMessage(e.target.value)}
                            className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm focus:outline-none focus:border-orange-500 resize-none ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                              }`}
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Ticket</span>
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right Column: Ticket History & Status Queue */}
                  <div className={`lg:col-span-7 rounded-[5px] border overflow-hidden flex flex-col ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
                    <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-[#0B0F19]' : 'border-slate-300 bg-slate-50'}`}>
                      <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Support Tickets History ({tickets.length})
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">Auto-synced with Supabase</span>
                    </div>

                    <div className={`divide-y overflow-y-auto max-h-[560px] ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {tickets.map(tck => {
                        const isResolved = tck.status === 'Resolved';
                        const isInProgress = tck.status === 'In Progress';

                        return (
                          <div key={tck.id} className="p-4 sm:p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="font-mono text-xs font-black text-orange-600 dark:text-orange-400">
                                    {tck.id}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-[5px] text-xs font-bold border ${
                                    tck.priority === 'Urgent'
                                      ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                      : tck.priority === 'High'
                                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-500'
                                        : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                                  }`}>
                                    {tck.priority}
                                  </span>
                                  <span className="text-xs text-slate-500 font-medium">
                                    {tck.category}
                                  </span>
                                </div>
                                <h4 className={`font-bold text-base leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {tck.subject}
                                </h4>
                              </div>

                              <span className={`px-3 py-1 rounded-[5px] text-xs font-bold shrink-0 ${
                                isResolved
                                  ? 'bg-emerald-600 text-white'
                                  : isInProgress
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-blue-600 text-white'
                              }`}>
                                {tck.status}
                              </span>
                            </div>

                            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              {tck.message}
                            </p>

                            {tck.lastReply && (
                              <div className={`p-3.5 rounded-[5px] border-l-4 border-l-orange-500 border border-slate-200 dark:border-slate-800 mt-2 flex items-start gap-3 ${
                                isDark ? 'bg-[#0B0F19]' : 'bg-orange-50/40'
                              }`}>
                                <div className="w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                  <Headphones className="w-4 h-4" />
                                </div>
                                <div className="flex-1 text-sm">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-orange-600 dark:text-orange-400 text-xs tracking-wide">
                                      Official Support Response
                                    </span>
                                  </div>
                                  <p className={`leading-relaxed text-sm ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                                    {tck.lastReply}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                              <span>Submitted: {tck.createdAt || 'Recent'}</span>
                            </div>
                          </div>
                        );
                      })}

                      {tickets.length === 0 && (
                        <div className="p-12 text-center text-slate-500 text-sm">
                          No support tickets submitted yet. Use the form on the left to submit an issue.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* 24/7 LIVE CHAT SUB-TAB */
                <div className={`rounded-[5px] border flex flex-col h-[580px] ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
                  {/* Chat Header */}
                  <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-slate-800 bg-[#0B0F19]' : 'border-slate-300 bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[5px] bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                        <Headphones className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Digital Menu 24/7 Live Care Desk
                        </h4>
                        <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Online &bull; Instant Operational Assistance</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm('Clear conversation history?')) {
                          onSendMessage && onSendMessage({
                            id: `clear_${Date.now()}`,
                            _clearAll: true
                          });
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-[5px] border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                    >
                      Clear Chat
                    </button>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5">
                    {/* Welcome Announcement */}
                    <div className={`p-3.5 rounded-[5px] border text-xs leading-relaxed max-w-xl mx-auto text-center ${
                      isDark ? 'bg-[#0B0F19] border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <span className="font-bold text-orange-600 dark:text-orange-400 block mb-1">
                        👋 Welcome to Live Restaurant Operations Care!
                      </span>
                      Our technical engineering and menu onboarding specialists are standing by to help with dish publishing, table QR setup, or payments in real-time.
                    </div>

                    {chatMessages.filter(m => !m._clearAll).map(msg => {
                      const isMe = msg.sender === 'owner';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className={`max-w-[80%] p-3.5 rounded-[5px] text-xs sm:text-sm leading-relaxed shadow-xs ${isMe
                              ? 'bg-orange-600 text-white'
                              : isDark
                                ? 'bg-[#0B0F19] text-slate-200 border border-slate-800'
                                : 'bg-slate-100 text-slate-900 border border-slate-200'
                            }`}>
                            <div className="flex items-center justify-between gap-3 mb-1 text-[10px] font-bold opacity-80 uppercase tracking-wider">
                              <span>{msg.name}</span>
                              <span className="font-mono text-[9px]">{msg.time}</span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })}

                    {isTyping && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                        <span>DGM Technical Care Specialist is typing response...</span>
                      </div>
                    )}
                  </div>

                  {/* Chat Input Bar */}
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatInput.trim()) return;
                    const text = chatInput.trim();
                    setChatInput('');

                    const userMsg = {
                      id: `msg_${Date.now()}`,
                      sender: 'owner',
                      name: profileForm.name || 'Restaurant Owner',
                      text: text,
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };

                    onSendMessage && onSendMessage(userMsg);

                    // Simulate realistic live support reply
                    setIsTyping(true);
                    setTimeout(() => {
                      setIsTyping(false);
                      const replyText = text.toLowerCase().includes('slider') || text.toLowerCase().includes('featured')
                        ? 'We have verified your Featured Sliders configuration. It is active and rotates smoothly across the customer digital menu drawer!'
                        : text.toLowerCase().includes('currency') || text.toLowerCase().includes('dollar') || text.toLowerCase().includes('price')
                          ? 'Currency configuration is synced with your profile settings and propagates to all dishes, add-ons, and checkout orders.'
                          : 'Message received by our technical desk. An operations specialist is monitoring your live venue feed and assisting immediately.';

                      const agentMsg = {
                        id: `reply_${Date.now()}`,
                        sender: 'support',
                        name: 'DGM Care Specialist (Live)',
                        text: replyText,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      onSendMessage && onSendMessage(agentMsg);
                    }, 1400);
                  }} className={`p-3 sm:p-4 border-t flex gap-2 shrink-0 ${isDark ? 'border-slate-800 bg-[#0B0F19]' : 'border-slate-200 bg-slate-50'
                    }`}>
                    <input
                      type="text"
                      placeholder="Type your message for our 24/7 technical operations desk..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className={`flex-1 px-4 py-2.5 rounded-[5px] border text-xs sm:text-sm focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#111827] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ====================================================== */}
          {/* SECTION 7: DASHBOARD (PREMIUM ONLY)                    */}
          {/* ====================================================== */}
          {activeTab === 'dashboard' && isPremiumActive && (
            <div className="space-y-6">
              {/* 6 Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                <div className={`p-4 rounded-[5px] border flex flex-col justify-between ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                  }`}>
                  <span className="text-[11px] font-semibold text-slate-500">Today's Sales</span>
                  <div className="my-2">
                    <span className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {currency}{metrics.todaySales.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Live updated
                  </span>
                </div>

                <div className={`p-4 rounded-[5px] border flex flex-col justify-between ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                  }`}>
                  <span className="text-[11px] font-semibold text-slate-500">Total Sales</span>
                  <div className="my-2">
                    <span className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {currency}{metrics.totalSales.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">All completed</span>
                </div>

                <div className={`p-4 rounded-[5px] border flex flex-col justify-between ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                  }`}>
                  <span className="text-[11px] font-semibold text-slate-500">Published Items</span>
                  <div className="my-2">
                    <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {metrics.totalPublishedItems}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Active on menu</span>
                </div>

                <div className={`p-4 rounded-[5px] border flex flex-col justify-between ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                  }`}>
                  <span className="text-[11px] font-semibold text-slate-500">Total Orders</span>
                  <div className="my-2">
                    <span className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {metrics.totalOrders}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Lifetime orders</span>
                </div>

                <div className={`p-4 rounded-[5px] border flex flex-col justify-between ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                  }`}>
                  <span className="text-[11px] font-semibold text-slate-500">Today's Orders</span>
                  <div className="my-2">
                    <span className="text-xl sm:text-2xl font-bold text-orange-600">
                      {metrics.todayOrders}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Since 12:00 AM</span>
                </div>

                <div className={`p-4 rounded-[5px] border flex flex-col justify-between ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                  }`}>
                  <span className="text-[11px] font-semibold text-slate-500">Unpublished Items</span>
                  <div className="my-2">
                    <span className="text-xl sm:text-2xl font-bold text-slate-400">
                      {metrics.unpublishedItems}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Draft / Offline</span>
                </div>
              </div>

              {/* Live Orders Table */}
              <div className={`rounded-[5px] border overflow-hidden ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                }`}>
                <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-[#0B0F19]' : 'border-slate-300 bg-slate-50'}`}>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Live Customer Orders Table
                  </h3>
                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Auto-Refreshed
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b uppercase text-[10px] tracking-wider ${isDark ? 'bg-[#0B0F19] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                      <tr>
                        <th className="px-4 py-3">Order No</th>
                        <th className="px-4 py-3">Table / Mode</th>
                        <th className="px-4 py-3">Customer Items</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {orders.slice(0, 5).map(order => (
                        <tr key={order.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="px-4 py-3 font-mono font-bold text-orange-600">
                            {order.orderNumber}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold block">{order.tableNumber || 'Takeaway'}</span>
                            <span className="text-[10px] text-slate-500 capitalize">{order.diningMode}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              {order.items?.map((it, idx) => (
                                <div key={idx} className="text-[11px] truncate max-w-xs">
                                  {it.quantity}x {it.title} ({it.portion})
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold">
                            {currency}{Number(order.totalAmount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold block">{order.paymentMethod}</span>
                            <span className="text-[10px] text-emerald-600 capitalize">{order.paymentStatus}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold ${order.orderStatus === 'completed'
                                ? 'bg-emerald-600 text-white'
                                : order.orderStatus === 'preparing'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-amber-600 text-white'
                              }`}>
                              {order.orderStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* SECTION 8: ORDER MANAGE (PREMIUM ONLY)                 */}
          {/* ====================================================== */}
          {activeTab === 'orders' && isPremiumActive && (
            <div className="space-y-6">
              <div className={`p-4 rounded-[5px] border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                }`}>
                <div className={`flex items-center rounded-[5px] border p-0.5 self-start ${isDark ? 'bg-[#0B0F19] border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                  {['all', 'pending', 'preparing', 'completed', 'cancelled'].map(st => (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-[5px] text-xs font-semibold capitalize transition-colors ${orderStatusFilter === st
                          ? 'bg-orange-600 text-white'
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search order no, table, name..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-3 py-1.5 rounded-[5px] border text-xs focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                  />
                </div>
              </div>

              {/* Order Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOrders.map(ord => (
                  <div
                    key={ord.id}
                    className={`rounded-[5px] border p-4 space-y-3 ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-orange-600 text-sm">
                          {ord.orderNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-2">
                          {ord.tableNumber || 'Takeaway'} &bull; {ord.displayTime || 'Recent'}
                        </span>
                      </div>

                      <div className="relative inline-block">
                        <select
                          value={ord.orderStatus}
                          onChange={(e) => onUpdateOrderStatus && onUpdateOrderStatus(ord.id, e.target.value)}
                          className={`appearance-none pl-3 pr-7 py-1 rounded-[5px] border text-xs font-bold focus:outline-none cursor-pointer ${ord.orderStatus === 'completed'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : ord.orderStatus === 'preparing'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-amber-600 text-white border-amber-600'
                            }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="preparing">Preparing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-white absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="border-t border-b py-2 space-y-1 text-xs border-slate-200 dark:border-slate-800">
                      {ord.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{it.quantity}x {it.title} ({it.portion})</span>
                          <span className="font-mono">${Number(it.price || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>Total Amount:</span>
                      <span className="text-orange-600 font-mono text-sm">
                        {currency}{Number(ord.totalAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* SECTION 9: PAYMENTS (PREMIUM ONLY)                     */}
          {/* ====================================================== */}
          {activeTab === 'payments' && isPremiumActive && (
            <div className="space-y-6">
              <div className={`p-4 rounded-[5px] border flex items-center justify-between ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                }`}>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    DGM Payments Gateway Transactions
                  </h3>
                  <span className="text-xs text-slate-500">Live bKash, Nagad, Cards & Cash Settlement logs</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total Collected</span>
                  <span className="text-lg font-bold text-emerald-600 font-mono">
                    {currency}{payments.reduce((s, p) => s + Number(p.amount || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className={`rounded-[5px] border overflow-hidden ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b uppercase text-[10px] tracking-wider ${isDark ? 'bg-[#0B0F19] text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                      <tr>
                        <th className="px-4 py-3">Txn ID</th>
                        <th className="px-4 py-3">Order No</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {payments.map(pay => (
                        <tr key={pay.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="px-4 py-3 font-mono font-bold">{pay.transactionId}</td>
                          <td className="px-4 py-3 font-semibold text-orange-600">{pay.orderNumber}</td>
                          <td className="px-4 py-3">{pay.customer || 'Customer'}</td>
                          <td className="px-4 py-3 font-mono font-bold">{currency}{Number(pay.amount || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 font-medium">{pay.paymentMethod}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold bg-emerald-600 text-white">
                              {pay.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 font-mono">{pay.date || 'Today'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ======================================================== */}
      {/* 3. ADD FOOD WIZARD MODAL                                 */}
      {/* ======================================================== */}
      <AddFoodWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setEditingFood(null);
        }}
        onSave={(savedFood) => {
          onAddFood(savedFood);
          setEditingFood(null);
        }}
        categories={categories}
        editingFood={editingFood}
        currency={currency}
        theme={theme}
      />

      {/* ======================================================== */}
      {/* 4. FEATURED SLIDER WIZARD MODAL                          */}
      {/* ======================================================== */}
      <FeaturedSliderWizard
        isOpen={isSliderWizardOpen}
        onClose={() => {
          setIsSliderWizardOpen(false);
          setEditingSlider(null);
        }}
        onSave={(slide) => {
          onAddFeaturedSlider(slide);
          setEditingSlider(null);
        }}
        foods={foods}
        editingSlider={editingSlider}
        currency={currency}
        theme={theme}
      />

      {/* ======================================================== */}
      {/* 5. SUPER ADMIN PLAN CONFIGURATION MODAL (SIMULATOR)      */}
      {/* ======================================================== */}
      {isSuperAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-auto">
          <div className={`w-full max-w-md rounded-[5px] border shadow-2xl p-6 ${isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-bold">Super Admin Feature Control</h3>
              </div>
              <button
                onClick={() => setIsSuperAdminModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              In production, this switch is controlled exclusively from the Master Super Admin Panel per restaurant account. By default, Order Management, DGM Payments, and Dashboard are disabled.
            </p>

            <div className="space-y-3 mb-6">
              <div className={`p-3 rounded-[5px] border flex items-center justify-between ${isDark ? 'bg-[#0B0F19] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                <div>
                  <span className="text-xs font-bold block">Order Management & Dashboard</span>
                  <span className="text-[10px] text-slate-500">Unlocks Dashboard, Live Orders & Payments tabs</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isPremiumActive;
                    onUpdateSuperAdminConfig && onUpdateSuperAdminConfig({
                      ...superAdminConfig,
                      enableOrderManagement: next,
                      enablePayments: next,
                      enableOrderButton: next,
                      enableCartPage: next
                    });
                  }}
                  className={`flex items-center gap-1 font-bold text-xs cursor-pointer ${isPremiumActive ? 'text-emerald-500' : 'text-slate-400'
                    }`}
                >
                  {isPremiumActive ? <ToggleRight className="w-7 h-7 text-emerald-500" /> : <ToggleLeft className="w-7 h-7" />}
                  <span>{isPremiumActive ? 'Enabled' : 'Disabled'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsSuperAdminModalOpen(false)}
              className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* Due Settlement Modal */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative transition-all ${
              isDark ? 'bg-[#0F1420] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-4 dark:border-slate-800 border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500">
                  <Wallet className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Platform Fee Due Settlement</h3>
                  <p className="text-xs text-slate-400 font-medium">Daily & weekly restaurant due clearing</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettlementModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-[#0B0F19] border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs font-semibold text-slate-400">Today's Fee Collection</span>
                  <span className="text-sm font-bold text-orange-500 font-mono">৳{todayFeesAmount}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-t dark:border-slate-800 border-slate-200 mt-2 pt-2">
                  <span className="text-xs font-bold text-slate-200">Total Due Settlement</span>
                  <span className={`text-xl font-black font-mono ${
                    dueSettlementAmount > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    ৳{dueSettlementAmount}
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t dark:border-slate-800/80 border-slate-200 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dueSettlementAmount > 0 ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                  <span className="text-[11px] font-semibold text-slate-400">
                    Status: {dueSettlementAmount > 0 ? 'Pending Payment from Restaurant to Platform' : 'All Dues Paid in Full (৳0 Balance)'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Platform fees (৳5 per order) accumulate daily into the restaurant's due settlement balance. When settled, the due resets to ৳0 and continues accumulating fresh digital orders.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                {dueSettlementAmount > 0 ? (
                  <button
                    type="button"
                    onClick={handleSettleDue}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirm Payment & Settle (৳0 Due)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetDue}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Simulate New Collections (+৳{todayFeesAmount})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
