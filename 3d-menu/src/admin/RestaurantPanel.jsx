import React, { useState, useEffect, useMemo } from 'react';
import { compressImage } from '../lib/imageCompressor';
import { resolveMediaUrl } from '../lib/mediaStorageService';
import {
  LayoutDashboard,
  Utensils,
  Layers,
  ShoppingBag,
  CreditCard,
  LogOut,
  Plus,
  PlusCircle,
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
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ArrowUp,
  ArrowDown,
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
  UserPlus,
  Bell,
  Share2,
  Copy,
  Smartphone,
  AlertTriangle,
  Info,
  FileCheck2
} from 'lucide-react';

import { QRCodeSVG } from 'qrcode.react';
import AddFoodWizard from './AddFoodWizard';
import FeaturedSliderWizard from './FeaturedSliderWizard';
import TableQRManagement from './TableQRManagement';
import RestaurantTopBar from './components/RestaurantTopBar';
import RestaurantDueSettlementModal from './components/RestaurantDueSettlementModal';
import RestaurantSettlementView from './components/RestaurantSettlementView';
import RestaurantOrderManagementView from './components/RestaurantOrderManagementView';
import {
  getSuperAdminRestaurants,
  fetchMerchantQRConfigFromSupabase,
  getMerchantQRConfig
} from './super/superAdminStore';
import { generateLiveSettlementCycles, computeSettlementStatus } from './super/digitalBillsStore';
import { fetchDGMBillingLedger } from '../data/dgmSessionStore';
import { supabaseTableRepository } from '../data/supabaseTableRepository';
import { supabase } from '../lib/supabaseClient';
import {
  getRestaurantReminders,
  acknowledgeRestaurantReminder,
  buildPaymentTransactions,
  formatDhakaDate,
  normalizePaymentStatus
} from './super/revenueSettlementService';
import {
  getAdminTheme,
  setAdminTheme,
  getStoredSettlementDue,
  saveStoredSettlementDue,
  settlePlatformDues,
  resetPlatformDues,
  getMenuScans,
  fetchLiveMenuScansFromSupabase,
  fetchRestaurantSettlementsFromSupabase,
  recordRestaurantSettlementInSupabase,
  getRestaurantFollowers,
  fetchLiveFollowersFromSupabase,
  isSameCalendarDay
} from '../data/menuStore';
import {
  getRestaurantPrimaryLanguage,
  initialCategoryTranslations,
  initialSubcategoryTranslations
} from '../utils/translations';

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
  categoryTranslations = {},
  featuredSliders = [],
  orders = [],
  payments = [],
  restaurantProfile = {},
  tickets = [],
  chatMessages = [],
  superAdminConfig = {},
  activeRestaurant = null,
  onAddFood,
  onUpdateFood,
  onDeleteFood,
  onToggleFoodStatus,
  onAddCategory,
  onDeleteCategory,
  onUpdateCategory,
  onReorderCategories,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  onAddFeaturedSlider,
  onDeleteFeaturedSlider,
  onToggleFeaturedSlider,
  onToggleAutoNotification,
  onBroadcastSliderNotification,
  onSaveRestaurantProfile,
  onAddTicket,
  onSendMessage,
  onUpdateSuperAdminConfig,
  onUpdateOrderStatus,
  onBackToMenu,
  onLogout
}) {
  // Live per-restaurant feature access controlled exclusively by Super Admin (Supabase `restaurants.features`)
  const [liveFeatures, setLiveFeatures] = useState(() => activeRestaurant?.features || superAdminConfig || {});

  useEffect(() => {
    if (activeRestaurant?.features) {
      setLiveFeatures(activeRestaurant.features);
    }
  }, [activeRestaurant?.features]);

  const panelRestoIdForFeatures = activeRestaurant?.id || restaurantProfile?.restaurant_id || restaurantProfile?.id || 'resto_001';
  useEffect(() => {
    let mounted = true;
    supabase
      .from('restaurants')
      .select('features')
      .eq('id', panelRestoIdForFeatures)
      .single()
      .then(({ data }) => {
        if (mounted && data?.features) {
          setLiveFeatures(data.features);
        }
      });

    const channel = supabase
      .channel(`realtime_resto_features_${panelRestoIdForFeatures}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'restaurants',
        filter: `id=eq.${panelRestoIdForFeatures}`
      }, (payload) => {
        if (payload?.new?.features) {
          setLiveFeatures(payload.new.features);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [panelRestoIdForFeatures]);

  // Independent Super Admin Gated Premium Feature Flags: False by default!
  const hasDashboardAccess = Boolean(
    liveFeatures?.enableDashboard !== undefined
      ? liveFeatures.enableDashboard
      : (liveFeatures?.enableOrderManagement ?? superAdminConfig?.enableOrderManagement)
  );
  const hasOrderManageAccess = Boolean(
    liveFeatures?.enableOrderManagement ?? superAdminConfig?.enableOrderManagement
  );
  const hasPaymentsAccess = Boolean(
    liveFeatures?.enablePayments !== undefined
      ? liveFeatures.enablePayments
      : (liveFeatures?.enableOrderManagement ?? superAdminConfig?.enableOrderManagement)
  );
  const isPremiumActive = hasDashboardAccess || hasOrderManageAccess || hasPaymentsAccess;

  // Dynamic primary native language for the registered restaurant country
  const nativeLang = useMemo(() => {
    return getRestaurantPrimaryLanguage(restaurantProfile || activeRestaurant || { currency: restaurantProfile?.currency || '৳' });
  }, [restaurantProfile, activeRestaurant]);

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
    return hasDashboardAccess ? 'dashboard' : 'foods';
  };

  // Navigation: Default is 'foods' (Food Items & Publish) or 'dashboard' (if Order Management is enabled)
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
        } else {
          setActiveTab(hasDashboardAccess ? 'dashboard' : 'foods');
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
  const [editCategoryNameNative, setEditCategoryNameNative] = useState('');
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editSubcategoryName, setEditSubcategoryName] = useState('');
  const [editSubcategoryNameNative, setEditSubcategoryNameNative] = useState('');
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
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    }
  };

  const isDark = theme === 'dark';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, [isDark]);

  // Foods tab filters
  const [foodFilterTab, setFoodFilterTab] = useState('all'); // 'all' | 'published' | 'unpublished'
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [selectedFoodCategory, setSelectedFoodCategory] = useState('All');

  // Categories tab state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryNameNative, setNewCategoryNameNative] = useState('');

  // Sub-categories tab state
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newSubcategoryNameNative, setNewSubcategoryNameNative] = useState('');
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
    vatEnabled: restaurantProfile?.vatEnabled !== undefined ? Boolean(restaurantProfile.vatEnabled) : (restaurantProfile?.vat_enabled !== undefined ? Boolean(restaurantProfile.vat_enabled) : true),
    vatType: restaurantProfile?.vatType || 'percentage', // 'percentage' | 'flat'
    vatRate: restaurantProfile?.vatRate !== undefined ? restaurantProfile.vatRate : 5.0,
    serviceChargeEnabled: restaurantProfile?.serviceChargeEnabled !== undefined ? Boolean(restaurantProfile.serviceChargeEnabled) : (restaurantProfile?.service_charge_enabled !== undefined ? Boolean(restaurantProfile.service_charge_enabled) : true),
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
        vatEnabled: restaurantProfile.vatEnabled !== undefined
          ? Boolean(restaurantProfile.vatEnabled)
          : (restaurantProfile.vat_enabled !== undefined ? Boolean(restaurantProfile.vat_enabled) : prev.vatEnabled),
        vatType: restaurantProfile.vatType || prev.vatType,
        vatRate: restaurantProfile.vatRate !== undefined ? restaurantProfile.vatRate : prev.vatRate,
        serviceChargeEnabled: restaurantProfile.serviceChargeEnabled !== undefined
          ? Boolean(restaurantProfile.serviceChargeEnabled)
          : (restaurantProfile.service_charge_enabled !== undefined ? Boolean(restaurantProfile.service_charge_enabled) : prev.serviceChargeEnabled),
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

  // Drag-and-drop state for Active Menu Categories
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState(null);
  const [dragOverCategoryIndex, setDragOverCategoryIndex] = useState(null);

  const handleCategoryDragStart = (e, index) => {
    setDraggedCategoryIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {}
  };

  const handleCategoryDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCategoryIndex !== index) {
      setDragOverCategoryIndex(index);
    }
  };

  const handleCategoryDragLeave = (e, index) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverCategoryIndex === index) {
      setDragOverCategoryIndex(null);
    }
  };

  const handleCategoryDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedCategoryIndex === null || draggedCategoryIndex === targetIndex) {
      setDraggedCategoryIndex(null);
      setDragOverCategoryIndex(null);
      return;
    }
    const updated = [...uniqueCategories];
    const [movedItem] = updated.splice(draggedCategoryIndex, 1);
    updated.splice(targetIndex, 0, movedItem);
    setDraggedCategoryIndex(null);
    setDragOverCategoryIndex(null);
    if (onReorderCategories) {
      onReorderCategories(updated);
    }
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategoryIndex(null);
    setDragOverCategoryIndex(null);
  };

  const handleMoveCategory = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= uniqueCategories.length) return;
    const updated = [...uniqueCategories];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);
    if (onReorderCategories) {
      onReorderCategories(updated);
    }
  };

  // If activeTab is a gated premium tab and its access gets disabled, fallback to foods
  useEffect(() => {
    if (
      (activeTab === 'dashboard' && !hasDashboardAccess) ||
      (activeTab === 'orders' && !hasOrderManageAccess) ||
      (activeTab === 'payments' && !hasPaymentsAccess)
    ) {
      setActiveTab('foods');
    }
  }, [hasDashboardAccess, hasOrderManageAccess, hasPaymentsAccess, activeTab]);

  const panelRestoId = activeRestaurant?.id || restaurantProfile?.restaurant_id || (restaurantProfile?.id ? String(restaurantProfile.id).replace(/^set_/, '') : 'resto_001');

  // Fine-Dine Table Session tracking counts for Restaurant Panel metrics
  const [fineDineSessionCounts, setFineDineSessionCounts] = useState({ totalOrders: 0, todayOrders: 0 });

  useEffect(() => {
    let isMounted = true;
    const fetchFineDineCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('dgm_table_sessions')
          .select('id, started_at')
          .eq('restaurant_id', panelRestoId);

        if (!error && data && isMounted) {
          const totalOrders = data.length;
          const todayOrders = data.filter(s => isSameCalendarDay(s.started_at)).length;
          setFineDineSessionCounts({ totalOrders, todayOrders });
        }
      } catch (e) {
        console.warn('Error fetching fine dine session counts for restaurant panel:', e);
      }
    };

    fetchFineDineCounts();

    const channel = supabase
      .channel(`realtime_panel_sessions_${panelRestoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dgm_table_sessions',
        filter: `restaurant_id=eq.${panelRestoId}`
      }, () => {
        fetchFineDineCounts();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [panelRestoId]);

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

    const isFineDine = (activeRestaurant?.type === 'fine' || activeRestaurant?.restaurant_type === 'fine' || panelRestoId === 'resto_001' || panelRestoId === 'resto_003');
    // For Fine-Dine, 1 table session (1:30h) = 1 DGM order. Confirming with "Yes, I Ordered" does NOT add a second order.
    const finalTotalOrders = isFineDine ? fineDineSessionCounts.totalOrders : totalOrdersCount;
    const finalTodayOrders = isFineDine ? fineDineSessionCounts.todayOrders : todayOrders.length;

    return {
      todaySales,
      totalSales,
      totalPublishedItems: publishedCount,
      totalOrders: finalTotalOrders,
      todayOrders: finalTodayOrders,
      unpublishedItems: unpublishedCount
    };
  }, [foods, orders, activeRestaurant, panelRestoId, fineDineSessionCounts]);

  // Restaurant Suspension Status State & Realtime Sync
  const [currentStatus, setCurrentStatus] = useState(() => {
    return activeRestaurant?.status || restaurantProfile?.status || 'active';
  });

  useEffect(() => {
    if (activeRestaurant?.status) {
      setCurrentStatus(activeRestaurant.status);
    }
  }, [activeRestaurant?.status]);

  useEffect(() => {
    let isMounted = true;

    // Check cached superadmin store
    try {
      const allRestos = getSuperAdminRestaurants();
      const target = allRestos.find(r => String(r.id) === String(panelRestoId));
      if (target && target.status) {
        setCurrentStatus(target.status);
      }
    } catch (e) {}

    // Check Supabase directly for accurate remote status
    supabase
      .from('restaurants')
      .select('status')
      .eq('id', String(panelRestoId))
      .maybeSingle()
      .then(({ data }) => {
        if (isMounted && data?.status) {
          setCurrentStatus(data.status);
        }
      });

    // Custom event broadcast from SuperAdminPanel in the same tab
    const handleStatusUpdate = (e) => {
      const { id, status } = e.detail || {};
      if (id && (String(id) === String(panelRestoId) || String(id) === String(activeRestaurant?.id))) {
        setCurrentStatus(status);
      }
    };
    window.addEventListener('restaurant_status_updated', handleStatusUpdate);

    // Cross-tab storage changes
    const handleStorageChange = (e) => {
      if (e.key?.includes('restaurants')) {
        try {
          const list = getSuperAdminRestaurants();
          const target = list.find(r => String(r.id) === String(panelRestoId));
          if (target && target.status) {
            setCurrentStatus(target.status);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('superadmin_restaurants_changed', handleStorageChange);

    // Supabase Realtime channel for instant push on restaurant suspension across devices
    const statusChannel = supabase
      .channel(`realtime_resto_panel_status_${panelRestoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurants' },
        (payload) => {
          if (!isMounted) return;
          if (payload?.new && String(payload.new.id) === String(panelRestoId)) {
            setCurrentStatus(payload.new.status || 'active');
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener('restaurant_status_updated', handleStatusUpdate);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('superadmin_restaurants_changed', handleStorageChange);
      supabase.removeChannel(statusChannel);
    };
  }, [panelRestoId, activeRestaurant?.id]);

  const isSuspended = currentStatus === 'suspended';

  // QR Code State & Dynamic Link for Active Restaurant
  const [copiedQr, setCopiedQr] = useState(false);

  const currentRestoSlug = useMemo(() => {
    if (activeRestaurant?.slug) return activeRestaurant.slug;
    if (activeRestaurant?.menuSlug) return activeRestaurant.menuSlug;
    if (restaurantProfile?.slug) return restaurantProfile.slug;
    if (panelRestoId === 'resto_002') return 'hungry-bite';
    if (panelRestoId === 'resto_003') return 'spice-lounge';
    return '3d-dine';
  }, [activeRestaurant, restaurantProfile, panelRestoId]);

  const currentMenuUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'http://localhost:5173';
    return `${origin}/${currentRestoSlug}`;
  }, [currentRestoSlug]);

  const handleCopyQrLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentMenuUrl).then(() => {
        setCopiedQr(true);
        setTimeout(() => setCopiedQr(false), 2200);
      });
    }
  };

  const handleShareQrCode = async () => {
    const shareData = {
      title: `${profileForm.name || 'Digital Menu'} — 3D Menu`,
      text: `Scan or visit our 3D digital menu:`,
      url: currentMenuUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    handleCopyQrLink();
  };

  // Dynamic Real Cloud Scans (fetched live from Supabase menu_scans via Instant Realtime WebSocket)
  const [scansData, setScansData] = useState(() => getMenuScans(panelRestoId, orders.length));

  useEffect(() => {
    let isMounted = true;
    const loadScans = async () => {
      const live = await fetchLiveMenuScansFromSupabase(panelRestoId);
      if (isMounted && live) {
        setScansData(live);
      }
    };
    loadScans();

    // 1. Instant Realtime WebSocket sync when any QR code is scanned (0.1s response, 0 polling bandwidth)
    const scansChannel = supabase
      .channel(`realtime_menu_scans_resto_panel_${panelRestoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'menu_scans' },
        (payload) => {
          if (isMounted && (!payload?.new?.restaurant_id || payload.new.restaurant_id === panelRestoId)) {
            loadScans();
          }
        }
      )
      .subscribe();

    // 2. Refresh when window is focused or tab becomes active
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadScans();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 3. Gentle backup fallback (5m instead of 60s, only when tab is visible)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadScans();
      }
    }, 300000);

    return () => {
      isMounted = false;
      supabase.removeChannel(scansChannel);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, [panelRestoId]);

  // Dynamic Real Followers (fetched live from Supabase restaurant_followers via Instant Realtime WebSocket)
  const [followersData, setFollowersData] = useState(() => getRestaurantFollowers(panelRestoId, orders));

  useEffect(() => {
    let isMounted = true;
    const loadFollowers = async () => {
      const live = await fetchLiveFollowersFromSupabase(panelRestoId);
      if (isMounted && live) {
        setFollowersData(live);
      }
    };
    loadFollowers();

    // 1. Instant Realtime WebSocket sync when customer follows or updates push subscription
    const followersChannel = supabase
      .channel(`realtime_followers_resto_panel_${panelRestoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_followers' },
        (payload) => {
          if (isMounted && (!payload?.new?.restaurant_id || payload.new.restaurant_id === panelRestoId)) {
            loadFollowers();
          }
        }
      )
      .subscribe();

    // 2. Refresh when window is focused or tab becomes active
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadFollowers();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 3. Gentle backup fallback (5m instead of 60s, only when tab is visible)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadFollowers();
      }
    }, 300000);

    return () => {
      isMounted = false;
      supabase.removeChannel(followersChannel);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, []);

  // Live settlements, billing ledger & merchant QR config from Supabase (Instant Realtime WebSocket)
  const [settlements, setSettlements] = useState([]);
  const [billingLedger, setBillingLedger] = useState([]);
  const [liveRestoOrders, setLiveRestoOrders] = useState([]);
  const [merchantQRConfig, setMerchantQRConfig] = useState(getMerchantQRConfig);
  const [activeReminder, setActiveReminder] = useState(() => {
    const list = getRestaurantReminders(panelRestoId);
    return list.find(r => !r.acknowledged) || null;
  });

  useEffect(() => {
    const refreshRem = () => {
      const list = getRestaurantReminders(panelRestoId);
      setActiveReminder(list.find(r => !r.acknowledged) || null);
    };
    refreshRem();
    window.addEventListener('phonemenu_payment_reminder_sent', refreshRem);
    window.addEventListener('storage', refreshRem);
    return () => {
      window.removeEventListener('phonemenu_payment_reminder_sent', refreshRem);
      window.removeEventListener('storage', refreshRem);
    };
  }, [panelRestoId]);

  useEffect(() => {
    let isMounted = true;
    const syncSettlements = async () => {
      const [live, ledgerRes, qrRes, ordersRes] = await Promise.all([
        fetchRestaurantSettlementsFromSupabase(panelRestoId),
        fetchDGMBillingLedger({ restaurantId: panelRestoId, limit: 300 }),
        fetchMerchantQRConfigFromSupabase(),
        supabase.from('orders').select('*').eq('restaurant_id', panelRestoId).order('created_at', { ascending: false })
      ]);
      if (!isMounted) return;
      if (Array.isArray(live)) setSettlements(live);
      if (Array.isArray(ledgerRes)) setBillingLedger(ledgerRes);
      if (qrRes) setMerchantQRConfig(qrRes);
      if (Array.isArray(ordersRes?.data)) setLiveRestoOrders(ordersRes.data);
    };
    syncSettlements();

    // 1. Instant Realtime WebSocket sync when settlement, ledger or merchant QR updates
    const settlementsChannel = supabase
      .channel(`realtime_settlements_resto_panel_${panelRestoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements' },
        (payload) => {
          if (isMounted && (!payload?.new?.restaurant_id || payload.new.restaurant_id === panelRestoId)) {
            syncSettlements();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dgm_billing_ledger' },
        () => {
          if (isMounted) syncSettlements();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const rId = payload?.new?.restaurant_id || payload?.old?.restaurant_id;
          if (isMounted && (!rId || rId === panelRestoId)) {
            syncSettlements();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_settings' },
        () => {
          if (isMounted) fetchMerchantQRConfigFromSupabase().then(qr => qr && setMerchantQRConfig(qr));
        }
      )
      .subscribe();

    const handleQrLocalUpdate = (e) => {
      if (e?.detail) setMerchantQRConfig(e.detail);
    };
    window.addEventListener('phonemenu_merchant_qr_updated', handleQrLocalUpdate);

    // 2. Refresh when window is focused or tab becomes active
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncSettlements();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 3. Gentle backup fallback (5m instead of 60s, only when tab is visible)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncSettlements();
      }
    }, 300000);

    return () => {
      isMounted = false;
      supabase.removeChannel(settlementsChannel);
      window.removeEventListener('phonemenu_merchant_qr_updated', handleQrLocalUpdate);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, [panelRestoId]);

  // Platform Fees & Due Settlement Calculation: Real ৳5 fee per confirmed order
  // Pending Verification & Rejected submissions NEVER reduce dueSettlementAmount!
  const todayFeesAmount = (metrics.todayOrders || 0) * 5;
  const totalAccruedFees = (metrics.totalOrders || orders.filter(o => o.orderStatus !== 'cancelled').length) * 5;
  const totalClearedAmount = useMemo(() => {
    return settlements
      .filter(s => ['cleared', 'settled', 'verified'].includes(String(s.status || '').toLowerCase()))
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  }, [settlements]);

  const dueSettlementAmount = useMemo(() => {
    return Math.max(0, totalAccruedFees - totalClearedAmount);
  }, [totalAccruedFees, totalClearedAmount]);

  // Compute exact 7-day Settlement Cycles & Submission Verification State for this Restaurant
  const settlementLifecycle = useMemo(() => {
    const now = new Date();
    const restoEntity = {
      id: panelRestoId,
      name: restaurantProfile?.name || 'Restaurant',
      restaurant_type: (panelRestoId === 'resto_001' || panelRestoId === 'resto_003') ? 'fine' : 'standard',
      settlement_status: dueSettlementAmount === 0 ? 'settled' : 'pending'
    };
    const rawCycles = generateLiveSettlementCycles({
      restaurants: [restoEntity],
      orders: liveRestoOrders.length > 0 ? liveRestoOrders : orders,
      billingLedger,
      settlements,
      currentDate: now
    });
    const txns = buildPaymentTransactions({
      settlements,
      cycles: rawCycles,
      restaurants: [restoEntity]
    });

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const unpaidCycles = [];
    const enrichedCycles = [];

    rawCycles.forEach(c => {
      const status = computeSettlementStatus(c, now);
      const remainingDue = Math.max(0, Number(c.accruedFee || 0) - Number(c.paidAmount || 0));

      const matchingTxns = txns.filter(
        t => t.primaryCycleId === c.id || (t.rawNotes && t.rawNotes.includes(c.id))
      );
      const matchingPendingTxns = matchingTxns.filter(t => t.status === 'pending_verification');
      const pendingVerificationAmount = matchingPendingTxns.reduce((s, t) => s + Number(t.amount || 0), 0);
      const submittableRemaining = Math.max(0, remainingDue - pendingVerificationAmount);

      const matchingRejectedTxns = matchingTxns.filter(t => t.status === 'rejected');
      const matchingVerifiedTxns = matchingTxns.filter(t => t.status === 'verified');
      const latestPendingTxn = matchingPendingTxns[0] || null;
      const latestRejectedTxn = (!latestPendingTxn && matchingRejectedTxns[0]) || null;

      const dueTime = new Date(c.overdueStartDate || c.due_at || c.paymentDueDate).getTime();
      const daysOverdue = status === 'overdue' ? Math.max(1, Math.ceil((now.getTime() - dueTime) / MS_PER_DAY)) : 0;
      const graceDaysRemaining = status === 'pending' ? Math.max(1, Math.ceil((dueTime - now.getTime()) / MS_PER_DAY)) : 0;

      const settledAt = status === 'settled'
        ? (c.clearedAt || matchingVerifiedTxns[0]?.paymentDate || null)
        : null;
      const settledTime = settledAt ? new Date(settledAt).getTime() : 0;
      const paidLate = Boolean(status === 'settled' && settledTime > 0 && dueTime > 0 && settledTime > dueTime);

      let displayStatus = status;
      if ((status === 'pending' || status === 'overdue') && pendingVerificationAmount > 0 && submittableRemaining <= 0) {
        displayStatus = 'payment_submitted';
      } else if ((status === 'pending' || status === 'overdue') && latestRejectedTxn && submittableRemaining > 0) {
        displayStatus = 'payment_rejected';
      }

      const enriched = {
        ...c,
        status,
        displayStatus,
        remainingDue,
        pendingVerificationAmount,
        submittableRemaining,
        latestPendingTxn,
        latestRejectedTxn,
        matchingTxns,
        daysOverdue,
        graceDaysRemaining,
        settledAt,
        paidLate
      };

      if (Number(c.totalOrders || 0) > 0 || Number(c.paidAmount || 0) > 0 || status === 'in_progress') {
        enrichedCycles.push(enriched);
      }

      if ((status === 'pending' || status === 'overdue') && remainingDue > 0) {
        unpaidCycles.push(enriched);
      }
    });

    enrichedCycles.sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());

    const overdueCycles = unpaidCycles.filter(c => c.status === 'overdue');
    const pendingCycles = unpaidCycles.filter(c => c.status === 'pending');
    const currentCycle = enrichedCycles.find(c => c.status === 'in_progress') || null;
    const totalAccruedFee = enrichedCycles.reduce((s, c) => s + Number(c.accruedFee || 0), 0);
    const currentCycleFee = Number(currentCycle?.accruedFee || 0);
    const totalPayableDue = unpaidCycles.reduce((s, c) => s + Number(c.remainingDue || 0), 0);
    const pendingVerificationTotal = txns
      .filter(t => t.status === 'pending_verification')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalSubmittableRemaining = unpaidCycles.reduce((s, c) => s + c.submittableRemaining, 0);
    const anyRejected = unpaidCycles.find(c => c.latestRejectedTxn)?.latestRejectedTxn || null;

    let reminderMode = 'none'; // 'none' | 'verification_pending' | 'overdue' | 'pending'
    if (pendingVerificationTotal > 0 && totalSubmittableRemaining <= 0) {
      reminderMode = 'verification_pending';
    } else if (overdueCycles.length > 0 && totalSubmittableRemaining > 0) {
      reminderMode = 'overdue';
    } else if (pendingCycles.length > 0 && totalSubmittableRemaining > 0) {
      reminderMode = 'pending';
    }

    return {
      allCycles: enrichedCycles,
      currentCycle,
      totalAccruedFee,
      currentCycleFee,
      totalPayableDue,
      totalSettledAmount: totalClearedAmount,
      unpaidCycles,
      overdueCycles,
      pendingCycles,
      txns,
      pendingVerificationTotal,
      totalSubmittableRemaining,
      anyRejected,
      reminderMode,
      overdueTotal: overdueCycles.reduce((s, c) => s + c.remainingDue, 0),
      pendingTotal: pendingCycles.reduce((s, c) => s + c.remainingDue, 0),
      maxDaysOverdue: overdueCycles.reduce((m, c) => Math.max(m, c.daysOverdue), 0),
      graceDaysRemaining: pendingCycles[0]?.graceDaysRemaining || 3,
      primaryCycle: overdueCycles[0] || pendingCycles[0] || unpaidCycles[0] || null
    };
  }, [panelRestoId, restaurantProfile?.name, liveRestoOrders, orders, billingLedger, settlements, dueSettlementAmount, totalClearedAmount]);

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedSettlementCycleId, setSelectedSettlementCycleId] = useState('');
  const [settlementSuccessMsg, setSettlementSuccessMsg] = useState('');
  const [sliderSuccessNotice, setSliderSuccessNotice] = useState('');

  // When payment proof is submitted, immediately refresh live settlements so the blue
  // "Thank you for submitting your payment!" banner appears cleanly without duplicate green alerts.
  const handlePaymentProofSubmitted = async () => {
    const live = await fetchRestaurantSettlementsFromSupabase(panelRestoId);
    if (live) setSettlements(live);
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
  const displayOrders = useMemo(() => {
    const byOrderKey = new Map();
    (liveRestoOrders || []).forEach(o => {
      const normalized = {
        id: String(o.id),
        orderNumber: o.order_number || o.orderNumber || `#ORD-${String(o.id).slice(-4)}`,
        restaurantId: o.restaurant_id || o.restaurantId || panelRestoId,
        tableNumber: o.table_number || o.tableNumber || 'Table 01',
        customerName: o.customer_name || o.customerName || 'Customer',
        items: Array.isArray(o.items) ? o.items : [],
        subtotal: Number(o.subtotal || 0),
        vat: Number(o.vat || 0),
        serviceFee: Number(o.service_fee || o.serviceFee || 0),
        totalAmount: Number(o.total_amount ?? o.totalAmount ?? 0),
        paymentMethod: o.payment_method || o.paymentMethod || 'Cash',
        paymentStatus: o.payment_status || o.paymentStatus || 'pending',
        orderStatus: o.order_status || o.orderStatus || 'pending',
        createdAt: o.created_at || o.createdAt,
        displayTime: o.created_at
          ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : (o.displayTime || 'Recent')
      };
      const key = normalized.orderNumber || normalized.id;
      byOrderKey.set(key, normalized);
    });
    (orders || []).forEach(o => {
      const key = o.orderNumber || o.order_number || String(o.id);
      if ((o.restaurantId || o.restaurant_id || panelRestoId) === panelRestoId && !byOrderKey.has(key)) {
        byOrderKey.set(key, o);
      }
    });
    return Array.from(byOrderKey.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [liveRestoOrders, orders, panelRestoId]);

  const filteredOrders = useMemo(() => {
    return displayOrders.filter(o => {
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
  }, [displayOrders, orderStatusFilter, orderSearchQuery]);

  // Handlers
  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    onAddCategory(newCategoryName.trim(), newCategoryNameNative.trim());
    setNewCategoryName('');
    setNewCategoryNameNative('');
  };

  const handleCreateSubcategory = (e) => {
    e.preventDefault();
    if (!newSubcategoryName.trim()) return;
    const newSub = {
      id: `sub_${Date.now()}`,
      category: newSubcategoryParent,
      name: newSubcategoryName.trim(),
      name_native: newSubcategoryNameNative.trim() || undefined,
      name_bn: newSubcategoryNameNative.trim() || undefined,
      displayOrder: Date.now()
    };
    onAddSubcategory && onAddSubcategory(newSub);
    setNewSubcategoryName('');
    setNewSubcategoryNameNative('');
  };

  const handleToggleVat = (e) => {
    e?.preventDefault?.();
    const nextVatEnabled = !profileForm.vatEnabled;
    const updated = {
      ...profileForm,
      vatEnabled: nextVatEnabled,
      vatRate: Math.max(0, parseFloat(profileForm.vatRate) || 0),
      serviceChargeRate: Math.max(0, parseFloat(profileForm.serviceChargeRate) || 0),
      tableCount: parseInt(profileForm.tableCount, 10) || 12
    };
    setProfileForm(updated);
    if (onSaveRestaurantProfile) {
      onSaveRestaurantProfile(updated);
    }
    setSettingsSuccessMessage(nextVatEnabled ? '✅ Government VAT / Tax is now Active.' : '⚠️ Government VAT / Tax is now Disabled.');
    setTimeout(() => setSettingsSuccessMessage(''), 4000);
  };

  const handleToggleServiceCharge = (e) => {
    e?.preventDefault?.();
    const nextScEnabled = !profileForm.serviceChargeEnabled;
    const updated = {
      ...profileForm,
      serviceChargeEnabled: nextScEnabled,
      vatRate: Math.max(0, parseFloat(profileForm.vatRate) || 0),
      serviceChargeRate: Math.max(0, parseFloat(profileForm.serviceChargeRate) || 0),
      tableCount: parseInt(profileForm.tableCount, 10) || 12
    };
    setProfileForm(updated);
    if (onSaveRestaurantProfile) {
      onSaveRestaurantProfile(updated);
    }
    setSettingsSuccessMessage(nextScEnabled ? '✅ Restaurant Service Charge is now Active.' : '⚠️ Restaurant Service Charge is now Disabled.');
    setTimeout(() => setSettingsSuccessMessage(''), 4000);
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
      { id: 'table-qr', label: 'Table QR Management', icon: LayoutGrid },
      { id: 'categories', label: 'Create Category', icon: Layers, badge: uniqueCategories.length },
      { id: 'subcategories', label: 'Create Sub-Category', icon: Tag, badge: subcategories.length },
      { id: 'sliders', label: 'Featured Sliders', icon: Sparkles, badge: featuredSliders.filter(s => s.isActive).length },
      {
        id: 'settlement',
        label: 'Settlement',
        icon: Wallet,
        badge: settlementLifecycle.unpaidCycles.length > 0 ? settlementLifecycle.unpaidCycles.length : null,
        badgeColor: 'bg-red-500'
      },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'support', label: 'Support', icon: Headphones, badge: tickets.filter(t => t.status === 'Open').length || 'Live' }
    ];

    const resultTabs = [...defaultTabs];
    if (hasDashboardAccess) {
      resultTabs.unshift({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard });
    }
    if (hasOrderManageAccess) {
      resultTabs.push({
        id: 'orders',
        label: 'Order Manage',
        icon: ShoppingBag,
        badge: displayOrders.filter(o => o.orderStatus === 'pending').length || null,
        badgeColor: 'bg-amber-600'
      });
    }
    if (hasPaymentsAccess) {
      resultTabs.push({ id: 'payments', label: 'Payments', icon: CreditCard });
    }
    return resultTabs;
  }, [hasDashboardAccess, hasOrderManageAccess, hasPaymentsAccess, foods.length, uniqueCategories.length, subcategories.length, featuredSliders, tickets, orders, settlementLifecycle.unpaidCycles.length]);

  // Tab Title & Breadcrumb Metadata for Modern Top Bar
  const tabMeta = useMemo(() => {
    switch (activeTab) {
      case 'table-qr':
        return {
          breadcrumb: 'TABLE QR',
          title: 'Table QR Management',
          subtitle: 'Manage table-wise QR codes for your restaurant menu'
        };
      case 'foods':
        return {
          breadcrumb: 'FOODS',
          title: 'Food Items & Universal Menu Engine',
          subtitle: 'Manage food items, categories, and your digital menu'
        };
      case 'categories':
        return {
          breadcrumb: 'CATEGORIES',
          title: 'Category Management',
          subtitle: 'Organize and structure food categories for your digital menu'
        };
      case 'subcategories':
        return {
          breadcrumb: 'SUB-CATEGORIES',
          title: 'Sub-Category / Food Type Management',
          subtitle: 'Configure food sub-types and custom variations'
        };
      case 'sliders':
        return {
          breadcrumb: 'FEATURED SLIDERS',
          title: 'Featured Specials Slider Management',
          subtitle: 'Create and manage promotional banner sliders'
        };
      case 'dashboard':
        return {
          breadcrumb: 'DASHBOARD',
          title: 'Dashboard Overview',
          subtitle: 'Real-time restaurant performance, analytics, and sales'
        };
      case 'orders':
        return {
          breadcrumb: 'ORDERS',
          title: 'Order Management',
          subtitle: 'Track, fulfill, and monitor customer table orders'
        };
      case 'payments':
        return {
          breadcrumb: 'PAYMENTS',
          title: 'Customer Payments & Transactions',
          subtitle: 'View settlement history and customer payment records'
        };
      case 'settings':
        return {
          breadcrumb: 'SETTINGS',
          title: 'Restaurant Profile & Credentials Settings',
          subtitle: 'Configure restaurant information, timings, and credentials'
        };
      case 'settlement':
        return {
          breadcrumb: 'SETTLEMENT',
          title: 'Platform Fee Settlement',
          subtitle: 'Track weekly settlement cycles, pending dues, overdue balances, and payment history'
        };
      case 'support':
        return {
          breadcrumb: 'SUPPORT',
          title: 'Support Tickets & 24/7 Live Care',
          subtitle: 'Get help, raise support tickets, and contact team 24/7'
        };
      default:
        return {
          breadcrumb: String(activeTab || 'MENU').toUpperCase(),
          title: 'Restaurant Portal',
          subtitle: 'Digital food menu restaurant management engine'
        };
    }
  }, [activeTab]);

  return (
    <div className={`min-h-screen w-full flex flex-col md:flex-row font-sans select-auto ${isDark ? 'dark bg-[#0B0F19] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
      }`}>

      {/* ======================================================== */}
      {/* 1. SIDEBAR NAVIGATION                                    */}
      {/* ======================================================== */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen ${
          isSidebarCollapsed ? 'md:w-20' : 'md:w-72 md:min-w-[280px]'
        } w-[82vw] max-w-[315px] ${
          isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
        } border-r flex flex-col justify-between transition-all duration-200 ease-in-out shrink-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sticky Brand & Restaurant Header - STAYS PINNED AT TOP EVEN WHEN SCROLLING */}
        <div className={`h-[106px] px-3.5 border-b flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} shrink-0 sticky top-0 z-20 ${
          isDark ? 'border-slate-800 bg-[#111827]' : 'border-slate-200 bg-white'
        }`}>
          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : 'min-w-0 flex-1'}`}>
            {/* Brand Logo Box with Studio Backdrop & Rounded Aesthetic */}
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-sm transition-all ${
                isSidebarCollapsed ? 'cursor-pointer hover:scale-105' : ''
              } ${
                profileForm.logo 
                  ? 'bg-white border border-slate-200/90 dark:border-slate-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.08)]' 
                  : 'bg-gradient-to-br from-orange-500 to-amber-600 border border-orange-400/40 text-white'
              }`}
              onClick={() => {
                if (isSidebarCollapsed) setIsSidebarCollapsed(false);
              }}
              title={isSidebarCollapsed ? (profileForm.name || 'Restaurant Panel') : undefined}
            >
              {profileForm.logo ? (
                <img
                  src={profileForm.logo}
                  alt={profileForm.name || 'Restaurant Logo'}
                  className="w-full h-full object-contain scale-110 select-none filter contrast-[1.03] brightness-[1.01]"
                />
              ) : (
                <Utensils className="w-7 h-7 text-white" />
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="truncate min-w-0">
                <h2 className={`text-base font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`} title={profileForm.name}>
                  {profileForm.name || 'Restaurant Panel'}
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-2 h-2 rounded-full ${isPremiumActive ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
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
              className="hidden md:flex p-1.5 rounded-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-1"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white shrink-0 ml-1"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Body Container - Seamless Scrolling without affecting header */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {/* Navigation Links */}
          <nav className="p-2.5 space-y-1.5">
            {isSidebarCollapsed && (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-full flex items-center justify-center p-2.5 rounded-[12px] text-slate-400 hover:text-orange-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2 cursor-pointer"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            )}
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const currentPath = typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : `/${currentRestoSlug}/admin`;
              const itemHref = `${currentPath}?tab=${item.id}`;
              return (
                <a
                  key={item.id}
                  href={itemHref}
                  onClick={(e) => {
                    // Standard left-click without keyboard modifiers switches tab smoothly in-page
                    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault();
                      handleTabSelect(item.id);
                      setIsMobileMenuOpen(false); // Seamless mobile drawer close on tap
                    }
                  }}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-3'} rounded-[12px] text-sm font-semibold tracking-wide transition-all cursor-pointer no-underline select-none ${isActive
                      ? 'bg-[#f95700] text-white font-bold shadow-sm'
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
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-[8px] shrink-0 ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs'
                        : item.badgeColor
                          ? `${item.badgeColor} text-white`
                          : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
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

          {/* Restaurant Unique 3D Digital Menu QR Code Card */}
          {!isSidebarCollapsed && (
            <div className="px-3 mb-3 shrink-0">
              <div className={`p-3.5 rounded-[20px] border transition-all relative overflow-hidden ${
                isDark 
                  ? 'bg-gradient-to-b from-[#18120e] via-[#1c1510] to-[#140e0a] border-orange-950/80 shadow-[0_4px_16px_rgba(0,0,0,0.3)]' 
                  : 'bg-gradient-to-b from-[#fffbf8] via-[#fff5ee] to-[#ffeedf] border-orange-100/90 shadow-[0_4px_16px_rgba(249,87,0,0.06)]'
              }`}>
                {/* Subtle peach background glow */}
                <div 
                  className="pointer-events-none absolute -right-6 -bottom-6 w-28 h-28 rounded-full opacity-40 dark:opacity-20 blur-xl"
                  style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }}
                />

                {/* Header Pill Badge */}
                <div className="flex items-center justify-center mb-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] bg-[#ffede2] dark:bg-orange-950/60 border border-orange-200/90 dark:border-orange-800/50 text-[#c44000] dark:text-orange-300 font-bold text-[11px] shadow-2xs">
                    <QrCode className="w-3.5 h-3.5 text-[#c44000] dark:text-orange-400 shrink-0" />
                    <span>Your Restaurant QR Code</span>
                  </div>
                </div>

                {/* Subtitle */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-snug px-1 mb-3 font-medium">
                  Let customers scan to view your digital menu instantly on their phone.
                </p>

                {/* QR Code Container */}
                <div className="bg-white dark:bg-slate-900 rounded-[18px] p-2.5 sm:p-3 border border-slate-100 dark:border-slate-800 shadow-[0_4px_14px_rgba(0,0,0,0.06)] flex items-center justify-center max-w-[165px] mx-auto">
                  <QRCodeSVG
                    value={currentMenuUrl}
                    size={142}
                    fgColor="#ea580c"
                    bgColor="transparent"
                    level="M"
                    includeMargin={false}
                    className="block"
                  />
                </div>

                {/* Scan to Open Menu label with Smartphone icon */}
                <div className="flex items-center justify-center gap-1.5 mt-2.5 mb-3 text-slate-800 dark:text-slate-200">
                  <Smartphone className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                  <span className="text-xs font-bold tracking-tight">Scan to Open Menu</span>
                </div>

                {/* Action Buttons: Share QR Code & Copy */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShareQrCode}
                    className="flex-1 py-2.5 px-3.5 rounded-[12px] bg-[#f95700] hover:bg-[#ea580c] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_2px_8px_rgba(249,87,0,0.25)] hover:scale-[1.01]"
                    title="Share digital menu QR code"
                  >
                    <Share2 className="w-3.5 h-3.5 text-white shrink-0" />
                    <span>{copiedQr ? 'Copied Link!' : 'Share QR Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyQrLink}
                    className={`w-10 h-10 rounded-[12px] border transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                      copiedQr 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-400' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs'
                    }`}
                    title="Copy menu URL to clipboard"
                  >
                    {copiedQr ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Plan Status (Read-Only — Controlled Exclusively by Super Admin) */}
          {!isSidebarCollapsed && (
            <div className="p-2.5 shrink-0">
              <div className={`p-3 rounded-[12px] border text-[11px] ${isDark ? 'bg-[#0B0F19] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold uppercase tracking-wider text-[9px] text-slate-500">Plan Status</span>
                  <span className={`px-2 py-0.5 rounded-[6px] font-bold text-[9px] ${isPremiumActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                    {isPremiumActive ? 'PREMIUM' : 'STANDARD'}
                  </span>
                </div>
                {isPremiumActive ? (
                  <>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Premium Access Active</span>
                    </div>
                    <ul className="space-y-1 text-[10.5px] mb-2">
                      {hasDashboardAccess && (
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>Live Dashboard</span>
                        </li>
                      )}
                      {hasOrderManageAccess && (
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>Order Management</span>
                        </li>
                      )}
                      {hasPaymentsAccess && (
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>Customer Payments</span>
                        </li>
                      )}
                    </ul>
                  </>
                ) : (
                  <p className="text-[10px] leading-snug mb-2">
                    Orders, Payments &amp; Live Dashboard are currently locked.
                  </p>
                )}
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Managed by platform administrator.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer Controls - PINNED AT BOTTOM */}
        <div className={`p-3 border-t space-y-2 shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          {/* View Customer Menu */}
          <a
            href={currentMenuUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                setIsMobileMenuOpen(false);
                onBackToMenu();
              }
            }}
            title={isSidebarCollapsed ? "Customer 3D Menu" : undefined}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-[12px] border text-xs font-semibold transition-colors cursor-pointer no-underline ${isDark
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
              }`}
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-orange-600 shrink-0" />
              {!isSidebarCollapsed && <span>Customer 3D Menu</span>}
            </div>
            {!isSidebarCollapsed && <span className="text-[10px] text-slate-500 font-bold uppercase">Exit</span>}
          </a>

          {/* Logout */}
          <button
            onClick={onLogout}
            title={isSidebarCollapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-2 px-3.5 py-2.5'} rounded-[12px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold transition-colors cursor-pointer`}
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

        {/* Modern Restaurant Panel Top Bar matching provided specifications */}
        <div className="sticky top-0 z-30 shrink-0">
          <RestaurantTopBar
            restaurantName={profileForm.name || "Hungry Bite Café"}
            restaurantLogo={profileForm.logo || ""}
            planName={isPremiumActive ? "Premium Active" : "Standard Menu"}
            section={tabMeta.breadcrumb}
            pageTitle={tabMeta.title}
            pageSubtitle={tabMeta.subtitle}
            notificationCount={22}
            sidebarCollapsed={isSidebarCollapsed}
            showIdentity={false}
            actionLabel={activeTab === 'sliders' ? 'Create Slider' : 'Add New Food'}
            darkMode={isDark}
            onToggleDarkMode={toggleTheme}
            onToggleSidebar={() => {
              if (window.innerWidth < 768) {
                setIsMobileMenuOpen(prev => !prev);
              } else {
                setIsSidebarCollapsed(prev => !prev);
              }
            }}
            onOpenNotifications={() => handleTabSelect('support')}
            onAddNewFood={
              activeTab === 'foods'
                ? () => { setEditingFood(null); setIsWizardOpen(true); }
                : activeTab === 'sliders'
                ? () => { setEditingSlider(null); setIsSliderWizardOpen(true); }
                : null
            }
          />
        </div>

        {/* Restaurant Suspension Warning Alert Banner (Matches Reference Specification Exactly) */}
        {isSuspended && (
          <div className="mx-3 sm:mx-6 mt-3 sm:mt-4 p-4 sm:p-5 rounded-[22px] bg-gradient-to-r from-[#fff1f2] via-[#ffe4e6] to-[#fff1f2] dark:from-[#251217] dark:via-[#35151e] dark:to-[#251217] border border-rose-200/90 dark:border-rose-900/60 shadow-[0_4px_20px_rgba(244,63,94,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all animate-[fadeIn_0.3s_ease-out]">
            <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300/60 dark:border-rose-800/60 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400 shadow-sm">
                <AlertTriangle size={24} strokeWidth={2.3} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    Your restaurant is currently
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-950/90 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800">
                    Suspended
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 font-medium leading-relaxed">
                  Your Digital Menu service is currently disabled. To reactivate your service, please contact Customer Care right now.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  <Info size={13} className="text-rose-500 shrink-0" />
                  <span>To know why your restaurant has been suspended, please contact Customer Care.</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Support CTA Pill Button */}
            <a
              href={`https://wa.me/8801700000000?text=Hello%20Support,%20my%20restaurant%20(${encodeURIComponent(profileForm.name || 'Restaurant')})%20is%20currently%20suspended.%20Please%20help%20reactivate.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00c653] hover:bg-[#00b04a] text-white font-bold text-sm shadow-[0_4px_14px_rgba(0,198,83,0.35)] transition-all hover:scale-105 shrink-0 select-none no-underline cursor-pointer"
              title="Contact Customer Support on WhatsApp"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>WhatsApp Support</span>
            </a>
          </div>
        )}

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

        {/* 3-State Platform Fee Settlement Banners (Pending / Overdue / After Submit Payment) */}
        {/* Automatically vanishes once Super Admin verifies payment & balance clears */}
        {activeTab !== 'settlement' && settlementLifecycle.reminderMode === 'verification_pending' && (
          <div className="mx-4 sm:mx-6 mt-3 px-4 sm:px-6 py-3.5 rounded-[12px] bg-gradient-to-r from-[#1D63D0] via-[#1352B8] to-[#0B3C91] text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-[10px] bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-[18px] font-extrabold tracking-tight leading-snug">
                  Thank you for submitting your payment!
                </div>
                <div className="text-xs sm:text-[13px] text-blue-100 mt-0.5">
                  We&apos;ll notify you once our team verifies your payment.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between lg:justify-end gap-5 sm:gap-6 shrink-0">
              <div className="hidden lg:block h-10 w-px bg-white/25" />
              <div>
                <div className="text-[11px] font-semibold text-blue-100">Submitted amount</div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono leading-tight">
                  ৳{settlementLifecycle.pendingVerificationTotal.toFixed(2)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 border border-white/25 text-[11px] font-semibold text-white">
                  <Clock className="w-3 h-3" />
                  <span>Awaiting verification</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[9px] border border-white/80 hover:bg-white/15 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  <span>View submission</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'settlement' && settlementLifecycle.reminderMode === 'overdue' && (
          <div className="mx-4 sm:mx-6 mt-3 px-4 sm:px-6 py-3.5 rounded-[12px] bg-gradient-to-r from-[#C81E1E] via-[#B91C1C] to-[#991B1B] text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-[10px] bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-[18px] font-extrabold tracking-tight leading-snug">
                  Platform fee payment overdue
                </div>
                <div className="text-xs sm:text-[13px] text-red-100 mt-0.5 flex items-center flex-wrap gap-2">
                  <span>Due {formatDhakaDate(settlementLifecycle.primaryCycle?.paymentDueDate)} ·</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                    {settlementLifecycle.maxDaysOverdue} day{settlementLifecycle.maxDaysOverdue === 1 ? '' : 's'} overdue
                  </span>
                </div>
                {settlementLifecycle.anyRejected && (
                  <div className="mt-1 text-[11.5px] font-semibold text-amber-200">
                    Previous submission rejected ({settlementLifecycle.anyRejected.transactionRef}): {settlementLifecycle.anyRejected.rejectionReason}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between lg:justify-end gap-5 sm:gap-6 shrink-0">
              <div className="hidden lg:block h-10 w-px bg-white/25" />
              <div>
                <div className="text-[11px] font-semibold text-red-100">Outstanding amount</div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono leading-tight">
                  ৳{settlementLifecycle.overdueTotal.toFixed(2)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettlementModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-white hover:bg-slate-100 text-[#0F172A] text-xs sm:text-sm font-bold shadow-sm cursor-pointer transition-colors shrink-0"
              >
                <span>Settle Due</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab !== 'settlement' && settlementLifecycle.reminderMode === 'pending' && (
          <div className="mx-4 sm:mx-6 mt-3 px-4 sm:px-6 py-3.5 rounded-[12px] bg-gradient-to-r from-[#FACC15] via-[#FBBF24] to-[#F59E0B] text-[#0F172A] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                    {settlementLifecycle.graceDaysRemaining} day{settlementLifecycle.graceDaysRemaining === 1 ? '' : 's'} remaining
                  </span>
                </div>
                {settlementLifecycle.anyRejected && (
                  <div className="mt-1 text-[11.5px] font-bold text-[#991B1B]">
                    Previous submission rejected ({settlementLifecycle.anyRejected.transactionRef}): {settlementLifecycle.anyRejected.rejectionReason}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between lg:justify-end gap-5 sm:gap-6 shrink-0">
              <div className="hidden lg:block h-10 w-px bg-black/15" />
              <div>
                <div className="text-[11px] font-semibold text-[#0F172A]/80">Outstanding amount</div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono leading-tight text-[#0F172A]">
                  ৳{settlementLifecycle.pendingTotal.toFixed(2)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettlementModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#0B1324] hover:bg-[#17233D] text-white text-xs sm:text-sm font-bold shadow-sm cursor-pointer transition-colors shrink-0"
              >
                <span>Settle Due</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Section Content with Full Native Scrolling */}
        <main className={`p-4 sm:p-6 flex-1 space-y-6 w-full mx-auto pb-16 ${
          activeTab === 'table-qr' ? 'max-w-[1850px] px-3 sm:px-8' : 'max-w-7xl'
        }`}>

          {/* ====================================================== */}
          {/* SECTION: TABLE QR MANAGEMENT                           */}
          {/* ====================================================== */}
          {activeTab === 'table-qr' && (
            <TableQRManagement
              restaurant={{
                id: panelRestoId,
                name: profileForm.name || 'Monkey Bhai',
                slug: currentRestoSlug
              }}
              repository={supabaseTableRepository}
              isDark={isDark}
              isSuperAdmin={false}
            />
          )}

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

                {/* 10 Metric / KPI Cards (2 Columns on mobile app, 5 Columns on desktop matching RPDS 004) */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 pt-1 relative z-10">
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
                      trend: `${metrics.totalOrders} Confirmed`,
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
                      value: `৳${settlementLifecycle.totalPayableDue}`,
                      icon: Wallet,
                      trend: settlementLifecycle.pendingVerificationTotal > 0
                        ? 'Verification Pending'
                        : settlementLifecycle.totalPayableDue > 0
                        ? 'Due to pay'
                        : 'All Settled',
                      comparison: settlementLifecycle.pendingVerificationTotal > 0
                        ? `৳${settlementLifecycle.pendingVerificationTotal} in review`
                        : settlementLifecycle.totalPayableDue > 0
                        ? 'Payable Pending + Overdue'
                        : 'Paid in Full',
                      trendType: settlementLifecycle.totalPayableDue > 0 ? 'up' : 'neutral',
                      sparkColor: settlementLifecycle.totalPayableDue > 0 ? 'orange' : 'gray',
                      action: () => setActiveTab('settlement'),
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
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 relative ${
                          isDark ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400' : 'bg-orange-50 border border-orange-200/60 text-orange-500'
                        }`}>
                          <card.icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                          {card.isCartWithClock && (
                            <Clock className="w-2.5 h-2.5 text-orange-600 absolute -bottom-0.5 -right-0.5 bg-orange-100 dark:bg-orange-950 rounded-full stroke-[2.5]" />
                          )}
                        </div>
                        <span className={`text-[11px] sm:text-[13px] font-bold truncate tracking-tight ${
                          isDark ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          {card.title}
                        </span>
                      </div>

                      {/* Middle Row: Big Metric Value with Count-Up Animation + Sparkline Chart with Left-to-Right Draw Animation */}
                      <div className="flex items-end justify-between gap-1.5 pt-0.5 pb-1">
                        <span className={`text-xl sm:text-[26px] font-black tabular-nums tracking-tight leading-none ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          <AnimatedCounter value={card.value} duration={1300} />
                        </span>

                        {/* Sparkline Wave Chart with Smooth Gradient & Draw Animation from start to end */}
                        <svg className="w-14 sm:w-20 h-8 sm:h-10 overflow-visible shrink-0 transition-transform duration-300 group-hover:scale-105" viewBox="0 0 80 32" fill="none">
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
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by food title or category..."
                    value={foodSearchQuery}
                    onChange={(e) => setFoodSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${
                      isDark ? 'bg-[#0F1420] border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-2xs'
                    }`}
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    onClick={() => setSelectedFoodCategory('All')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      selectedFoodCategory === 'All'
                        ? 'bg-[#f95700] text-white shadow-xs'
                        : isDark
                          ? 'bg-[#0F1420] border border-slate-800 text-slate-400 hover:text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    All
                  </button>
                  {uniqueCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedFoodCategory(cat)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        selectedFoodCategory === cat
                          ? 'bg-[#f95700] text-white shadow-xs'
                          : isDark
                            ? 'bg-[#0F1420] border border-slate-800 text-slate-400 hover:text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3-Column Food Items Catalog Grid matching User Screenshot */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {filteredFoods.map(food => {
                  const isPub = food.is_published !== false && food.status !== 'draft' && food.status !== 'unpublished';
                  const portionCount = food.customizable?.portions?.length || 1;
                  const addonCount = food.customizable?.addons?.length || 0;

                  return (
                    <div
                      key={food.id}
                      className={`rounded-[28px] border flex flex-col justify-between overflow-hidden transition-all duration-300 group shadow-xs hover:shadow-xl ${
                        isDark
                          ? 'bg-[#0F1420] border-slate-800 hover:border-slate-700'
                          : 'bg-white border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      {/* Top Framed Food Image Box */}
                      <div className={`h-64 sm:h-72 relative flex items-center justify-center p-6 overflow-hidden ${
                        isDark
                          ? 'bg-gradient-to-b from-[#0d121c] to-[#080b11]'
                          : 'bg-gradient-to-b from-[#F8FAFC] to-[#EDF2F7]'
                      }`}>
                        {/* Tag Badge (top-left) - e.g. BEST SELLER */}
                        {food.tag ? (
                          <span className="absolute top-4 left-4 px-3.5 py-1.5 rounded-xl bg-[#f54900] text-white text-[11px] font-black uppercase tracking-wider shadow-xs z-10 select-none">
                            {food.tag}
                          </span>
                        ) : (
                          <span className="absolute top-4 left-4 px-3.5 py-1.5 rounded-xl bg-[#f54900] text-white text-[11px] font-black uppercase tracking-wider shadow-xs z-10 select-none">
                            BEST SELLER
                          </span>
                        )}

                        {/* Rating Badge (top-right) */}
                        <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 z-10 shadow-xs border ${
                          isDark
                            ? 'bg-slate-900/95 text-white border-slate-800'
                            : 'bg-white/95 text-slate-900 border-slate-200/70'
                        }`}>
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                          <span>{food.rating ? Number(food.rating).toFixed(1) : '4.9'}</span>
                        </div>

                        {/* Centered Food Photo */}
                        {food.image ? (
                          <img
                            src={resolveMediaUrl(food.image)}
                            alt={food.title}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => { e.target.src = '/Food.gif'; }}
                            className="max-h-52 sm:max-h-56 max-w-[90%] object-contain drop-shadow-[0_16px_28px_rgba(0,0,0,0.18)] group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <Utensils className="w-12 h-12 mb-2 opacity-30" />
                            <span className="text-xs font-semibold">No Photo</span>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          {/* Title */}
                          <h3
                            className={`text-xl sm:text-2xl font-black tracking-tight leading-tight line-clamp-2 ${
                              isDark ? 'text-white' : 'text-slate-950'
                            }`}
                            title={food.title}
                          >
                            {food.title}
                          </h3>

                          {/* Price */}
                          <div className="text-2xl sm:text-[26px] font-black text-[#f54900] leading-none flex items-center">
                            <span className="font-noto-bengali font-black mr-0.5">{currency}</span>
                            {Number(food.price || 0).toFixed(2)}
                          </div>

                          {/* Category / Subcategory */}
                          <div className={`text-xs sm:text-sm font-semibold ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {food.category}{food.subcategory ? ` / ${food.subcategory}` : ''}
                          </div>

                          {/* Description Snippet */}
                          <p className={`text-xs sm:text-sm font-normal leading-relaxed line-clamp-2 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {food.description || 'Prepared fresh with premium quality ingredients.'}
                          </p>
                        </div>

                        {/* Portions & Add-ons Badges with Icons */}
                        <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                          <div className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                            isDark
                              ? 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                              : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                          }`}>
                            <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
                            <span>{portionCount} {portionCount === 1 ? 'size' : 'sizes'}</span>
                          </div>

                          <div className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                            isDark
                              ? 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                              : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                          }`}>
                            <PlusCircle className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
                            <span>{addonCount} {addonCount === 1 ? 'add-on' : 'add-ons'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Status and Action Buttons */}
                      <div className={`px-5 sm:px-6 py-4 border-t flex items-center justify-between text-xs ${
                        isDark ? 'border-slate-800' : 'border-slate-100'
                      }`}>
                        <button
                          type="button"
                          onClick={() => onToggleFoodStatus && onToggleFoodStatus(food.id)}
                          className={`flex items-center gap-1.5 font-bold px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                            isPub
                              ? 'text-emerald-700 dark:text-emerald-300 bg-[#EBFBF2] dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60'
                              : 'text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <CheckCircle2 className={`w-4 h-4 ${isPub ? 'text-emerald-600 fill-emerald-600/20' : 'text-slate-400'}`} />
                          <span>{isPub ? 'Live on menu' : 'Draft / Off'}</span>
                        </button>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFood(food);
                              setIsWizardOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 transition-colors cursor-pointer"
                            title="Edit Food Item"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${food.title}"?`)) {
                                onDeleteFood && onDeleteFood(food.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete Food Item"
                          >
                            <Trash2 className="w-5 h-5" />
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

                <form onSubmit={handleCreateCategory} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Category Name (English) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Traditional Biryani, Chef Specials, Mocktails..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                      />
                    </div>
                    <div>
                      <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Category Name ({nativeLang.nativeName})
                      </label>
                      <input
                        type="text"
                        placeholder={`e.g. ${nativeLang.nativeName === 'বাংলা' ? 'ঐতিহ্যবাহী বিরিয়ানি, শেফ স্পেশাল...' : 'Native Category Name...'}`}
                        value={newCategoryNameNative}
                        onChange={(e) => setNewCategoryNameNative(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Category</span>
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 font-semibold">Quick Suggestions:</span>
                  {[
                    { en: 'Main Course', native: 'প্রধান খাবার' },
                    { en: 'Appetizers', native: 'অ্যাপেটাইজার' },
                    { en: 'Beverages', native: 'পানীয়' },
                    { en: 'Dessert', native: 'ডেজার্ট' },
                    { en: 'Chef Specials', native: 'শেফ স্পেশাল' },
                    { en: 'Seafood', native: 'সামুদ্রিক খাবার' },
                    { en: 'Snacks', native: 'স্ন্যাক্স' },
                    { en: 'Fast Food', native: 'ফাস্ট ফুড' }
                  ].map(cat => (
                    <button
                      key={cat.en}
                      type="button"
                      onClick={() => {
                        setNewCategoryName(cat.en);
                        setNewCategoryNameNative(cat.native);
                      }}
                      className={`px-2 py-1 rounded-[5px] text-[11px] border cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      + {cat.en} <span className="opacity-70 text-[10px]">({cat.native})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category List Table with Drag-and-Drop Reordering */}
              <div className={`rounded-[5px] border overflow-hidden ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                }`}>
                <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${isDark ? 'border-slate-800 bg-[#0B0F19]' : 'border-slate-300 bg-slate-50'}`}>
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Active Menu Categories ({uniqueCategories.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Drag &amp; drop to reorder. This exact serial order is shown under &apos;All Items&apos; on the customer digital menu.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-center">
                    <span className="text-[10px] font-semibold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 inline-flex items-center gap-1">
                      <GripVertical className="w-3 h-3" /> Drag to Reorder
                    </span>
                  </div>
                </div>

                <div className={`divide-y text-xs ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {uniqueCategories.map((catName, index) => {
                    const count = foods.filter(f => f.category === catName).length;
                    const isDefault = catName === 'All';
                    const isEditing = editingCategory === catName;
                    const nativeCatName = categoryTranslations?.[catName] || initialCategoryTranslations?.[catName];
                    const isDragging = draggedCategoryIndex === index;
                    const isDropTarget = dragOverCategoryIndex === index && draggedCategoryIndex !== index;

                    return (
                      <div
                        key={catName}
                        draggable={!isEditing}
                        onDragStart={(e) => handleCategoryDragStart(e, index)}
                        onDragOver={(e) => handleCategoryDragOver(e, index)}
                        onDragLeave={(e) => handleCategoryDragLeave(e, index)}
                        onDrop={(e) => handleCategoryDrop(e, index)}
                        onDragEnd={handleCategoryDragEnd}
                        className={`p-3.5 sm:p-4 flex items-center justify-between transition-all select-none ${
                          isDragging
                            ? 'opacity-40 bg-orange-500/15 scale-[0.99] border-y-2 border-dashed border-orange-500'
                            : isDropTarget
                              ? 'bg-orange-500/15 border-t-2 border-orange-500 shadow-md'
                              : isDark
                                ? 'hover:bg-slate-800/40'
                                : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 pr-3 sm:pr-4">
                          {/* Drag Handle with Grip icon */}
                          {!isEditing && (
                            <div
                              className={`p-1 rounded cursor-grab active:cursor-grabbing transition-colors ${
                                isDark ? 'text-slate-500 hover:text-orange-400 hover:bg-slate-800' : 'text-slate-400 hover:text-orange-600 hover:bg-slate-200'
                              }`}
                              title="Drag to change category order"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                          )}

                          {/* Serial Number Badge */}
                          <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                            isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}>
                            {index + 1}
                          </span>

                          <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center font-bold shrink-0 ${
                            isDark ? 'bg-slate-800 text-orange-400' : 'bg-slate-100 text-orange-600'
                          }`}>
                            <Layers className="w-4 h-4" />
                          </div>
                          
                          {isEditing ? (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
                              <input
                                type="text"
                                autoFocus
                                placeholder="English Category Name"
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                className={`px-2.5 py-1.5 rounded-[5px] border text-xs sm:text-sm font-semibold flex-1 focus:outline-none focus:border-orange-500 ${
                                  isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                              <input
                                type="text"
                                placeholder={`Native Name (${nativeLang.nativeName})`}
                                value={editCategoryNameNative}
                                onChange={(e) => setEditCategoryNameNative(e.target.value)}
                                className={`px-2.5 py-1.5 rounded-[5px] border text-xs sm:text-sm font-semibold flex-1 focus:outline-none focus:border-orange-500 ${
                                  isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (editCategoryName.trim()) {
                                    onUpdateCategory && onUpdateCategory(catName, editCategoryName.trim(), editCategoryNameNative.trim());
                                  }
                                  setEditingCategory(null);
                                }}
                                className="px-2.5 py-1.5 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs cursor-pointer shadow-xs shrink-0"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategory(null)}
                                className="px-2.5 py-1.5 rounded-[5px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer shrink-0"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {catName}
                                </span>
                                {(categoryTranslations?.[catName] || initialCategoryTranslations?.[catName]) && (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-[4px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                    {categoryTranslations?.[catName] || initialCategoryTranslations?.[catName]}
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-500 text-[11px] block mt-0.5">{count} food items currently assigned</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          {!isDefault && !isEditing && (
                            <>
                              {/* Quick Move Up/Down Controls */}
                              <div className={`flex items-center border rounded-[5px] overflow-hidden ${
                                isDark ? 'border-slate-700 bg-slate-800/80' : 'border-slate-300 bg-slate-100'
                              }`}>
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveCategory(index, index - 1)}
                                  className={`p-1 transition-colors ${
                                    index === 0
                                      ? 'opacity-25 cursor-not-allowed text-slate-500'
                                      : isDark
                                        ? 'text-slate-300 hover:text-orange-400 hover:bg-slate-700 cursor-pointer'
                                        : 'text-slate-700 hover:text-orange-600 hover:bg-slate-200 cursor-pointer'
                                  }`}
                                  title="Move Up"
                                  aria-label="Move Up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === uniqueCategories.length - 1}
                                  onClick={() => handleMoveCategory(index, index + 1)}
                                  className={`p-1 transition-colors ${
                                    index === uniqueCategories.length - 1
                                      ? 'opacity-25 cursor-not-allowed text-slate-500'
                                      : isDark
                                        ? 'text-slate-300 hover:text-orange-400 hover:bg-slate-700 cursor-pointer'
                                        : 'text-slate-700 hover:text-orange-600 hover:bg-slate-200 cursor-pointer'
                                  }`}
                                  title="Move Down"
                                  aria-label="Move Down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(catName);
                                  setEditCategoryName(catName);
                                  setEditCategoryNameNative(categoryTranslations?.[catName] || initialCategoryTranslations?.[catName] || '');
                                }}
                                className={`px-2.5 sm:px-3 py-1 rounded-[5px] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                  isDark ? 'text-slate-400 hover:text-orange-400 hover:bg-slate-800' : 'text-slate-600 hover:text-orange-600 hover:bg-slate-100'
                                }`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteCategory && onDeleteCategory(catName)}
                                className="px-2.5 sm:px-3 py-1 rounded-[5px] text-slate-500 hover:text-red-600 text-xs font-medium cursor-pointer"
                              >
                                Delete
                              </button>
                            </>
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

                <form onSubmit={handleCreateSubcategory} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Parent Category <span className="text-red-500">*</span>
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

                    <div>
                      <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Sub-Category Name (English) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kacchi Biryani, Double Beef Burger, Cold Brew..."
                        value={newSubcategoryName}
                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                      />
                    </div>

                    <div>
                      <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Sub-Category Name ({nativeLang.nativeName})
                      </label>
                      <input
                        type="text"
                        placeholder={`e.g. ${nativeLang.nativeName === 'বাংলা' ? 'কাচ্চি বিরিয়ানি, ডাবল বিফ বার্গার...' : 'Native Subcategory Name...'}`}
                        value={newSubcategoryNameNative}
                        onChange={(e) => setNewSubcategoryNameNative(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Sub-Category</span>
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 font-semibold">Common Food Types:</span>
                  {[
                    { en: 'Biryani & Rice', native: 'বিরিয়ানি ও রাইস' },
                    { en: 'Burgers', native: 'বার্গার' },
                    { en: 'Sourdough Pizza', native: 'সাওয়ারডাফ পিজ্জা' },
                    { en: 'Crispy Chicken', native: 'ক্রিস্পি চিকেন' },
                    { en: 'Chilled Coffee', native: 'কোল্ড কফি' },
                    { en: 'Mocktails', native: 'মকটেল' },
                    { en: 'Kunafa & Sweets', native: 'কুনাফা ও সুইটস' },
                    { en: 'Artisan Gelato', native: 'আর্টিসান জেলাটো' }
                  ].map(type => (
                    <button
                      key={type.en}
                      type="button"
                      onClick={() => {
                        setNewSubcategoryName(type.en);
                        setNewSubcategoryNameNative(type.native);
                      }}
                      className={`px-2 py-1 rounded-[5px] text-[11px] border cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      + {type.en} <span className="opacity-70 text-[10px]">({type.native})</span>
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
                    const isEditing = editingSubcategory?.id === sub.id;
                    const nativeSubName = sub.name_native || sub.name_bn || initialSubcategoryTranslations?.[sub.name];

                    return (
                      <div key={sub.id} className={`p-4 flex items-center justify-between ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                        }`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                          <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center font-bold shrink-0 ${isDark ? 'bg-slate-800 text-orange-400' : 'bg-slate-100 text-orange-600'
                            }`}>
                            <Tag className="w-4 h-4" />
                          </div>

                          {isEditing ? (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
                              <select
                                value={editSubcategoryParent}
                                onChange={(e) => setEditSubcategoryParent(e.target.value)}
                                className={`px-2.5 py-1.5 rounded-[5px] border text-xs sm:text-sm font-semibold focus:outline-none focus:border-orange-500 cursor-pointer ${
                                  isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              >
                                {uniqueCategories.filter(c => c !== 'All').map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>

                              <input
                                type="text"
                                autoFocus
                                placeholder="English Name"
                                value={editSubcategoryName}
                                onChange={(e) => setEditSubcategoryName(e.target.value)}
                                className={`px-2.5 py-1.5 rounded-[5px] border text-xs sm:text-sm font-semibold flex-1 focus:outline-none focus:border-orange-500 ${
                                  isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />

                              <input
                                type="text"
                                placeholder={`Native (${nativeLang.nativeName})`}
                                value={editSubcategoryNameNative}
                                onChange={(e) => setEditSubcategoryNameNative(e.target.value)}
                                className={`px-2.5 py-1.5 rounded-[5px] border text-xs sm:text-sm font-semibold flex-1 focus:outline-none focus:border-orange-500 ${
                                  isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editSubcategoryName.trim()) {
                                      onUpdateSubcategory && onUpdateSubcategory({
                                        ...sub,
                                        category: editSubcategoryParent,
                                        name: editSubcategoryName.trim(),
                                        name_native: editSubcategoryNameNative.trim() || undefined,
                                        name_bn: editSubcategoryNameNative.trim() || undefined
                                      });
                                    }
                                    setEditingSubcategory(null);
                                  }}
                                  className="px-2.5 py-1.5 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs cursor-pointer shadow-xs"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSubcategory(null)}
                                  className="px-2.5 py-1.5 rounded-[5px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {sub.name}
                                </span>
                                {nativeSubName && (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-[4px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                    {nativeSubName}
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-500 text-[11px] block mt-0.5">
                                Parent: <span className="font-semibold">{sub.category}</span> &bull; {assignedFoods} dishes assigned
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!isEditing && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubcategory(sub);
                                  setEditSubcategoryName(sub.name);
                                  setEditSubcategoryNameNative(sub.name_native || sub.name_bn || initialSubcategoryTranslations?.[sub.name] || '');
                                  setEditSubcategoryParent(sub.category);
                                }}
                                className={`px-3 py-1 rounded-[5px] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                  isDark ? 'text-slate-400 hover:text-orange-400 hover:bg-slate-800' : 'text-slate-600 hover:text-orange-600 hover:bg-slate-100'
                                }`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteSubcategory && onDeleteSubcategory(sub.id)}
                                className="px-3 py-1 rounded-[5px] text-slate-400 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
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

              {/* Slider Success / Broadcast Notice Banner */}
              {sliderSuccessNotice && (
                <div className="p-3.5 rounded-[5px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>{sliderSuccessNotice}</span>
                  </div>
                  <button
                    onClick={() => setSliderSuccessNotice('')}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

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
                      className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-sm'
                        }`}
                    >
                      {/* Realistic Banner Card Inside - Exact Match with Image 1 (200px) */}
                      <div className="flex-1 relative overflow-hidden bg-[#140D07] h-[200px]">
                        {/* Background */}
                        {slide.bgImage ? (
                          <>
                            <img
                              src={resolveMediaUrl(slide.bgImage)}
                              alt={slide.title}
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 w-full h-full object-cover object-center"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-transparent pointer-events-none z-10" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 pointer-events-none z-10" />
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-[#231409] via-[#170c04] to-[#0d0703]" />
                            <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-[#F59E0B]/15 blur-3xl pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent pointer-events-none z-10" />
                          </>
                        )}

                        {/* Floating Food Preview Image on Right */}
                        {(() => {
                          const linkedFood = foods.find(f => String(f.id) === String(slide.foodId || slide.id));
                          const displaySlideImage = linkedFood?.image || slide.image;
                          if (!displaySlideImage) return null;
                          return (
                            <div className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center z-15 pointer-events-none">
                              <img
                                src={resolveMediaUrl(displaySlideImage)}
                                alt={slide.title}
                                loading="lazy"
                                decoding="async"
                                onError={(e) => { e.target.src = '/Food.gif'; }}
                                className={slide.isPng !== false ? "w-full h-full object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.85)] scale-110" : "w-32 h-32 sm:w-36 sm:h-36 object-cover rounded-full border border-white/20 shadow-2xl"}
                              />
                            </div>
                          );
                        })()}

                        {/* Left Content: Badge, Title, Price & Explore Combo */}
                        <div className="relative z-20 h-full p-4 flex flex-col justify-between max-w-[58%]">
                          <div className="space-y-1.5">
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#F59E0B] bg-black/40 text-[#F59E0B] text-[10px] font-black uppercase tracking-wider w-fit">
                              {slide.badge || 'DHAMAKA OFFER'}
                            </div>
                            <h4 className="text-white font-extrabold text-base sm:text-lg tracking-tight leading-snug line-clamp-2">
                              {slide.title}
                            </h4>
                          </div>

                          <div className="pt-2 mt-auto space-y-2">
                            <span className="text-[#F59E0B] font-black text-2xl tracking-tight tabular-nums block leading-none">
                              {currency}{Number(slide.price || 0).toFixed(2)}
                            </span>
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] text-xs font-bold w-fit">
                              Explore combo →
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Controls Footer */}
                      <div className={`p-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${isDark ? 'bg-[#0B0F19] border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onToggleFeaturedSlider && onToggleFeaturedSlider(slide.id)}
                            className={`flex items-center gap-1.5 font-bold cursor-pointer ${slide.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                              }`}
                          >
                            {slide.isActive ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                            <span>{slide.isActive ? 'Active on Digital Menu' : 'Inactive'}</span>
                          </button>

                          {/* Auto Notification Toggle */}
                          <button
                            type="button"
                            onClick={() => onToggleAutoNotification && onToggleAutoNotification(slide.id)}
                            className={`flex items-center gap-1.5 font-bold cursor-pointer px-2 py-0.5 rounded-[5px] border transition-colors ${
                              slide.autoNotification
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                            }`}
                            title={slide.autoNotification ? 'Auto Notification is ON (will broadcast to followers upon edit/update)' : 'Auto Notification is OFF (silent updates)'}
                          >
                            {slide.autoNotification ? <ToggleRight className="w-4 h-4 text-amber-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                            <span className="text-[11px]">Auto Notification</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={async () => {
                              if (onBroadcastSliderNotification) {
                                await onBroadcastSliderNotification(slide);
                                setSliderSuccessNotice(`🔔 Push notification broadcasted to all followers for "${slide.title}"!`);
                                setTimeout(() => setSliderSuccessNotice(''), 5000);
                              }
                            }}
                            className={`p-1.5 rounded-[5px] transition-colors cursor-pointer ${
                              isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:text-amber-600 hover:bg-slate-200/70'
                            }`}
                            title="Send Push Notification to Followers"
                          >
                            <Bell className="w-3.5 h-3.5 text-amber-500" />
                          </button>

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
                              onClick={handleToggleVat}
                              className={`px-3 py-1.5 rounded-[5px] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                                profileForm.vatEnabled
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                              }`}
                              title={profileForm.vatEnabled ? 'Click to Disable VAT (Instant Auto-Save)' : 'Click to Activate VAT (Instant Auto-Save)'}
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
                              onClick={handleToggleServiceCharge}
                              className={`px-3 py-1.5 rounded-[5px] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                                profileForm.serviceChargeEnabled
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                              }`}
                              title={profileForm.serviceChargeEnabled ? 'Click to Disable Service Charge (Instant Auto-Save)' : 'Click to Activate Service Charge (Instant Auto-Save)'}
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
          {/* SECTION: PLATFORM FEE SETTLEMENT                       */}
          {/* ====================================================== */}
          {activeTab === 'settlement' && (
            <RestaurantSettlementView
              isDark={isDark}
              restaurantName={restaurantProfile?.name || 'Restaurant'}
              settlementLifecycle={settlementLifecycle}
              onOpenSettleModal={(cycleId) => {
                setSelectedSettlementCycleId(cycleId || settlementLifecycle.primaryCycle?.id || '');
                setIsSettlementModalOpen(true);
              }}
              onRefresh={handlePaymentProofSubmitted}
            />
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
          {activeTab === 'dashboard' && hasDashboardAccess && (
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
                      {displayOrders.slice(0, 5).map(order => (
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
                                  {it.quantity || 1}x {it.name || it.title || 'Item'} ({it.portion || 'Standard'}){it.addons ? ` · ${it.addons}` : ''}
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
          {activeTab === 'orders' && hasOrderManageAccess && (
            <RestaurantOrderManagementView
              orders={displayOrders}
              foods={foods}
              currency={currency}
              isDark={isDark}
              onUpdateOrderStatus={(orderId, newStatus) => {
                setLiveRestoOrders(prev =>
                  (prev || []).map(o => String(o.id) === String(orderId) ? { ...o, order_status: newStatus } : o)
                );
                onUpdateOrderStatus && onUpdateOrderStatus(orderId, newStatus);
              }}
            />
          )}

          {/* ====================================================== */}
          {/* SECTION 9: PAYMENTS (PREMIUM ONLY)                     */}
          {/* ====================================================== */}
          {activeTab === 'payments' && hasPaymentsAccess && (
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
        restaurant={restaurantProfile || activeRestaurant}
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
        onSave={async (slide) => {
          const isEditMode = Boolean(editingSlider);
          const wasAutoNotifOn = Boolean(slide.autoNotification ?? editingSlider?.autoNotification);
          const finalSlide = {
            ...slide,
            autoNotification: wasAutoNotifOn
          };
          await onAddFeaturedSlider(finalSlide);
          setEditingSlider(null);
          if (isEditMode && wasAutoNotifOn && finalSlide.isActive !== false) {
            setSliderSuccessNotice(`🔔 Push notification broadcasted to all followers for "${finalSlide.title}"!`);
          } else if (isEditMode) {
            setSliderSuccessNotice(`✅ Slider "${finalSlide.title}" updated successfully.`);
          } else {
            setSliderSuccessNotice(`🎉 Slider "${finalSlide.title}" created successfully!`);
          }
          setTimeout(() => setSliderSuccessNotice(''), 6000);
        }}
        foods={foods}
        editingSlider={editingSlider}
        currency={currency}
        restaurant={restaurantProfile}
        theme={theme}
      />

      {/* Redesigned Platform Fee Due Settlement Modal (Method 01 QR + Method 02 Proof Submission) */}
      <RestaurantDueSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => {
          setIsSettlementModalOpen(false);
          setSelectedSettlementCycleId('');
        }}
        isDark={isDark}
        restaurantId={panelRestoId}
        restaurantName={restaurantProfile?.name || 'Restaurant'}
        unpaidCycles={settlementLifecycle.unpaidCycles}
        allSubmittedTransactions={settlementLifecycle.txns}
        initialCycleId={selectedSettlementCycleId || settlementLifecycle.primaryCycle?.id || ''}
        merchantQRConfig={merchantQRConfig}
        onSubmitted={handlePaymentProofSubmitted}
      />

    </div>
  );
}
