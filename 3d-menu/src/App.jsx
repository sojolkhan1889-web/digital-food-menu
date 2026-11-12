import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Utensils,
  ShoppingBag,
  Flame,
  Pizza,
  Dessert,
  Coffee,
  CheckCircle2,
  Wallet,
  Banknote,
  CreditCard,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronUp,
  ChevronDown,
  Check,
  Rotate3d,
  Layers,
  Zap,
  Play,
  Pause,
  Star,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  Receipt,
  ArrowLeft,
  Bell
} from 'lucide-react';

import foodGif from './assets/Food.gif';
import burgerPng from './assets/burger_hd.png';
import pizzaPng from './assets/pizza_hd.png';
import chickenPng from './assets/korean_chicken_hd.png';
import macchiatoPng from './assets/iced_macchiato_hd.png';
import RestaurantPanel from './admin/RestaurantPanel';
import RestaurantLogin from './admin/RestaurantLogin';
import SuperAdminPanel from './admin/super/SuperAdminPanel';
import SuperAdminLogin from './admin/super/SuperAdminLogin';
import { getSuperAdminAuthSession, setSuperAdminAuthSession } from './admin/super/superAdminStore';
import {
  getStoredFoods,
  saveStoredFoods,
  loadFoodsFromIndexedDB,
  getStoredCategories,
  saveStoredCategories,
  getStoredOrders,
  saveStoredOrders,
  addStoredOrder,
  getStoredPayments,
  getAdminAuthSession,
  setAdminAuthSession,
  syncFoodToSupabase,
  deleteFoodFromSupabase,
  syncCategoryToSupabase,
  deleteCategoryFromSupabase,
  fetchRemoteData,
  getStoredSubcategories,
  saveStoredSubcategories,
  syncSubcategoryToSupabase,
  deleteSubcategoryFromSupabase,
  getStoredFeaturedSliders,
  saveStoredFeaturedSliders,
  syncSliderToSupabase,
  deleteSliderFromSupabase,
  getRestaurantProfile,
  saveRestaurantProfile,
  saveStoredRestaurantProfile,
  syncSettingsToSupabase,
  fetchLiveSettingsFromSupabase,
  getStoredTickets,
  recordMenuScan,
  fetchLiveOrdersFromSupabase,
  fetchLiveMenuScansFromSupabase,
  saveStoredTickets,
  syncTicketToSupabase,
  getStoredChatMessages,
  saveStoredChatMessages,
  syncChatMessageToSupabase,
  getSuperAdminConfig,
  saveSuperAdminConfig,
  isCustomerFollowingRestaurant,
  syncCustomerFollowStatusFromSupabase,
  recordRestaurantFollow,
  ensurePushSubscriptionSync,
  broadcastRestaurantNotification,
  fetchLatestRestaurantNotifications,
  showBrowserNotification,
  fetchLiveFollowersFromSupabase
} from './data/menuStore';
import { supabase } from './lib/supabaseClient';
import RestaurantHeader from './components/RestaurantHeader';

const categories = [
  { name: 'All', icon: Utensils },
  { name: 'Main Course', icon: Flame },
  { name: 'Appetizers', icon: Pizza },
  { name: 'Beverages', icon: Coffee },
  { name: 'Dessert', icon: Dessert }
];

// Restaurant Configuration (Master Admin / Backend Settings)
// Can be updated dynamically from admin panel or API in the future
const defaultRestaurantConfig = {
  // Premium Features: OFF by default on food menu
  // Activated only when enabled from Master Admin Panel
  premiumFeatures: {
    enableOrderButton: false,      // Order button & Customization Modal
    enableCartPage: false,         // Add to Cart slide-over page
    enablePaymentModal: false      // DGM Payment Features (Confirm & Pay modal)
  },
  // In-card configuration breakdown toggles (controlled via Master Admin, enabled by default)
  breakdown: {
    enablePortions: true,
    enableAddons: true,
    enableQuantity: true,
    enableSubtotal: true,
    enableVat: true,
    enableServiceFee: true
  },
  // Sub-features within customization
  features: {
    enableSpiceLevel: false,      // Currently hidden on frontend
    enableKitchenNotes: false,    // Currently hidden on frontend
    enablePortions: true,
    enableAddons: true
  },
  financials: {
    vatRate: 0.05,               // 5% VAT
    serviceFeeDineIn: 2.00,
    serviceFeeTakeaway: 1.00
  },
  labels: {
    portionTitle: 'Portion Size',
    addonsTitle: 'Add-ons & Toppings',
    spiceLevelTitle: 'Spice Level',
    kitchenNoteTitle: 'Special Kitchen Note',
    kitchenNotePlaceholder: 'e.g. Extra sauce, no onions...',
    totalAmountText: 'Total Amount',
    paymentModalTitle: 'DGM Payment Features'
  }
};

// Rounds any price or amount to a whole number / round figure (পূর্ণ সংখ্যা), e.g. 28.63 -> 29
export const formatPrice = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return '0';
  return Math.round(num).toString();
};

// Formats review count: under 1,000 -> count, 1,000+ -> 'k', 1,000,000+ (10 lakh) -> 'M'
export const formatReviewCount = (count) => {
  if (count === undefined || count === null || count === '') return '1.2k';
  const num = Number(count);
  if (isNaN(num)) return '1.2k';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toLocaleString();
};

export default function App() {
  // Master Admin Dynamic Configuration State
  const [adminConfig, setAdminConfig] = useState(defaultRestaurantConfig);

  // Helper to determine if current URL targets superadmin route
  const checkIsSuperAdminRoute = () => {
    if (typeof window === 'undefined') return false;
    const path = (window.location.pathname || '').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();
    return (
      path.includes('/super-admin') ||
      path.includes('/superadmin') ||
      path.includes('super-admin') ||
      path.includes('superadmin') ||
      hash.includes('super-admin') ||
      hash.includes('superadmin') ||
      search.includes('super-admin') ||
      search.includes('superadmin')
    );
  };

  // Helper to determine if current URL targets admin route
  const checkIsAdminRoute = () => {
    if (typeof window === 'undefined') return false;
    if (checkIsSuperAdminRoute()) return false;
    const path = (window.location.pathname || '').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();
    return (
      path.includes('/admin') ||
      path.includes('/restaurant') ||
      hash.includes('admin') ||
      hash.includes('restaurant') ||
      search.includes('admin') ||
      search.includes('restaurant')
    );
  };

  // View Mode: 'menu' (Customer 3D View), 'admin' (Restaurant Portal), or 'superadmin' (Master SaaS Platform)
  const [currentView, setCurrentView] = useState(() => {
    if (checkIsSuperAdminRoute()) return 'superadmin';
    if (checkIsAdminRoute()) return 'admin';
    return 'menu';
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(getAdminAuthSession);
  const [isSuperAdminAuthenticated, setIsSuperAdminAuthenticated] = useState(getSuperAdminAuthSession);

  // Dynamic Foods, Categories, Orders, and Payments from Menu Store
  const [foodsList, setFoodsList] = useState(getStoredFoods);
  const [categoriesList, setCategoriesList] = useState(getStoredCategories);
  const [subcategoriesList, setSubcategoriesList] = useState(getStoredSubcategories);
  const [featuredSliders, setFeaturedSliders] = useState(getStoredFeaturedSliders);
  const [restaurantProfile, setRestaurantProfile] = useState(getRestaurantProfile);
  const [ticketsList, setTicketsList] = useState(getStoredTickets);
  const [chatMessagesList, setChatMessagesList] = useState(getStoredChatMessages);
  const [superAdminConfig, setSuperAdminConfig] = useState(getSuperAdminConfig);
  const [ordersList, setOrdersList] = useState(getStoredOrders);
  const [paymentsList, setPaymentsList] = useState(getStoredPayments);
  const [tableNumber, setTableNumber] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('table') || params.get('tableNumber');
        if (t) return decodeURIComponent(t);
      } catch (e) {
        // fallback
      }
    }
    return 'Table 04';
  });
  const currency = restaurantProfile?.currency || '$';
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  // Navigation helpers for Clean Browser URLs
  const navigateToMenu = () => {
    if (typeof window !== 'undefined' && window.history.pushState) {
      if (
        window.location.pathname.includes('/admin') ||
        window.location.pathname.includes('/super-admin') ||
        window.location.pathname.includes('/superadmin')
      ) {
        window.history.pushState({}, '', '/');
      }
      window.location.hash = '';
    }
    setCurrentView('menu');
  };

  const navigateToAdmin = () => {
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', '/admin');
    }
    setCurrentView('admin');
  };

  const navigateToSuperAdmin = () => {
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', '/super-admin');
    }
    setCurrentView('superadmin');
  };

  // Listen for hash & popstate changes to navigate directly to /superadmin, /admin or #admin
  useEffect(() => {
    const handleLocationChange = () => {
      if (checkIsSuperAdminRoute()) {
        setCurrentView('superadmin');
      } else if (checkIsAdminRoute()) {
        setCurrentView('admin');
      } else {
        setCurrentView('menu');
      }
    };
    handleLocationChange();
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Fast hydration of high-res cached foods from IndexedDB on startup (runs in 1-5ms)
  useEffect(() => {
    loadFoodsFromIndexedDB().then(idbFoods => {
      if (idbFoods && idbFoods.length >= 8) {
        setFoodsList(idbFoods);
      }
    });
  }, []);

  // Fetch latest cloud data from Supabase on mount
  useEffect(() => {
    fetchRemoteData().then(({
      remoteFoods,
      remoteCategories,
      remoteSubcategories,
      remoteSliders,
      remoteSettings,
      remoteTickets,
      remoteChat,
      remoteOrders
    }) => {
      if (remoteFoods && remoteFoods.length > 0) {
        setFoodsList(remoteFoods);
        saveStoredFoods(remoteFoods);
      }
      if (remoteCategories && remoteCategories.length > 0) {
        setCategoriesList(prev => {
          const merged = Array.from(new Set([...prev, ...remoteCategories].filter(c => Boolean(c) && String(c).toLowerCase() !== 'all')));
          saveStoredCategories(merged);
          return merged;
        });
      }
      if (remoteSubcategories && remoteSubcategories.length > 0) {
        setSubcategoriesList(remoteSubcategories);
        saveStoredSubcategories(remoteSubcategories);
      }
      if (remoteSliders && remoteSliders.length > 0) {
        setFeaturedSliders(prev => {
          const remoteIds = new Set(remoteSliders.map(s => String(s.id)));
          const uncommitted = prev.filter(s => !remoteIds.has(String(s.id)));
          const merged = [...uncommitted, ...remoteSliders];
          saveStoredFeaturedSliders(merged);
          return merged;
        });
      }
      if (remoteSettings) {
        setRestaurantProfile(prev => ({ ...prev, ...remoteSettings }));
        saveStoredRestaurantProfile(remoteSettings);
      }
      if (remoteTickets && remoteTickets.length > 0) {
        setTicketsList(remoteTickets);
        saveStoredTickets(remoteTickets);
      }
      if (remoteChat && remoteChat.length > 0) {
        setChatMessagesList(remoteChat);
        saveStoredChatMessages(remoteChat);
      }
      if (remoteOrders && remoteOrders.length > 0) {
        setOrdersList(remoteOrders);
        saveStoredOrders(remoteOrders);
      }
    });
  }, []);

  // Realtime subscription for live orders (Instant sub-second sync across panels with ZERO constant polling overhead)
  useEffect(() => {
    let isMounted = true;
    const syncOrders = async () => {
      const live = await fetchLiveOrdersFromSupabase('resto_001');
      if (isMounted && live && live.length > 0) {
        setOrdersList(live);
        saveStoredOrders(live);
      }
    };

    // 1. Instant Realtime WebSocket sync when customer places/updates an order or restaurant settings change
    const syncSettings = async () => {
      const liveSettings = await fetchLiveSettingsFromSupabase('resto_001');
      if (isMounted && liveSettings) {
        setRestaurantProfile(prev => {
          const merged = { ...prev, ...liveSettings };
          saveStoredRestaurantProfile(merged);
          return merged;
        });
      }
    };

    const ordersChannel = supabase
      .channel('realtime_orders_app_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          if (isMounted) syncOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_settings' },
        () => {
          if (isMounted) syncSettings();
        }
      )
      .subscribe();

    // 2. Refresh when window is focused or tab becomes active
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncOrders();
        syncSettings();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 3. Gentle backup fallback (60s instead of 6s, only when tab is visible)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncOrders();
      }
    }, 60000);

    return () => {
      isMounted = false;
      supabase.removeChannel(ordersChannel);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, []);

  // Record real menu scan in Supabase menu_scans when customer accesses the digital menu view
  // Uses ref lock so customer exploring food cards, opening modals, closing sheets or browsing never triggers extra scans
  const hasRecordedScanRef = useRef(false);

  useEffect(() => {
    if (currentView === 'menu' && !hasRecordedScanRef.current) {
      hasRecordedScanRef.current = true;
      recordMenuScan('resto_001', tableNumber || 'Table 04');
    }
  }, [currentView, tableNumber]);

  // Active Featured Sliders or fallback to foodsList for Digital Menu (declared early before any useEffect)
  const activeFeaturedSliders = useMemo(() => {
    return featuredSliders.filter(s => s.isActive !== false);
  }, [featuredSliders]);

  // Food IDs currently featured in active promotional sliders (Category Isolation Engine)
  const activeFeaturedFoodIds = useMemo(() => {
    const ids = new Set();
    activeFeaturedSliders.forEach(s => {
      const fId = s.foodId || s.food_id;
      if (fId) ids.add(String(fId));
    });
    return ids;
  }, [activeFeaturedSliders]);

  // Only published active foods are displayed on the Customer Digital Menu frontend
  const publishedFoods = useMemo(() => {
    return foodsList.filter(f => f.is_published !== false && f.status !== 'unpublished' && f.status !== 'draft');
  }, [foodsList]);

  // Regular category dishes (Dishes in active Featured Specials are isolated from regular categories)
  const regularCategoryFoods = useMemo(() => {
    return publishedFoods.filter(f => !activeFeaturedFoodIds.has(String(f.id)));
  }, [publishedFoods, activeFeaturedFoodIds]);

  // Navigation & Category states
  const [activeCategory, setActiveCategory] = useState('All Items');
  
  // Specific dish activated from clicking a Featured Special slider (with promotional discount applied)
  const [selectedFeaturedDish, setSelectedFeaturedDish] = useState(null);

  const filteredFoods = useMemo(() => {
    if (activeCategory === 'All Items' || activeCategory === 'All') {
      return regularCategoryFoods;
    }
    return regularCategoryFoods.filter(f => f.category === activeCategory);
  }, [regularCategoryFoods, activeCategory]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Active food on the 3D stage: priority given to selected featured promotional dish
  const activeFood = selectedFeaturedDish || filteredFoods[currentIndex] || filteredFoods[0] || publishedFoods[0] || null;

  const carouselItems = useMemo(() => {
    return activeFeaturedSliders.length > 0 ? activeFeaturedSliders : publishedFoods;
  }, [activeFeaturedSliders, publishedFoods]);

  // Handlers for Restaurant Manager (Local Storage + Supabase sync)
  const handleAddFoodFromPanel = (savedFood) => {
    const exists = foodsList.some(f => String(f.id) === String(savedFood.id));
    let updated;
    if (exists) {
      updated = foodsList.map(f => String(f.id) === String(savedFood.id) ? savedFood : f);
    } else {
      updated = [savedFood, ...foodsList];
    }
    setFoodsList(updated);
    saveStoredFoods(updated);

    // Sync to Supabase
    syncFoodToSupabase(savedFood);

    // If new category, add to categories list and sync
    if (savedFood.category && !categoriesList.includes(savedFood.category)) {
      const updatedCats = Array.from(new Set([...categoriesList, savedFood.category]));
      setCategoriesList(updatedCats);
      saveStoredCategories(updatedCats);
      syncCategoryToSupabase(savedFood.category);
    }

    if (!exists) {
      setActiveCategory('All Items');
      setCurrentIndex(0);
    }
  };

  const handleDeleteFoodFromPanel = (foodId) => {
    const cleanId = String(foodId);
    const updated = foodsList.filter(f => String(f.id) !== cleanId);
    setFoodsList(updated);
    saveStoredFoods(updated);
    deleteFoodFromSupabase(cleanId);
    setCurrentIndex(0);
  };

  const handleToggleFoodStatus = (foodId) => {
    const cleanId = String(foodId);
    const updated = foodsList.map(f => {
      if (String(f.id) === cleanId) {
        const isCurrentlyPub = f.is_published !== false && f.status !== 'draft' && f.status !== 'unpublished';
        const changed = {
          ...f,
          is_published: !isCurrentlyPub,
          status: !isCurrentlyPub ? 'published' : 'unpublished'
        };
        syncFoodToSupabase(changed);
        return changed;
      }
      return f;
    });
    setFoodsList(updated);
    saveStoredFoods(updated);
  };

  const handleAddCategory = (catName) => {
    if (!categoriesList.includes(catName)) {
      const updatedCats = Array.from(new Set([...categoriesList, catName]));
      setCategoriesList(updatedCats);
      saveStoredCategories(updatedCats);
      syncCategoryToSupabase(catName);
    }
  };

  const handleUpdateCategory = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return;
    const cleanNew = newName.trim();
    const updatedCats = categoriesList.map(c => c === oldName ? cleanNew : c);
    setCategoriesList(updatedCats);
    saveStoredCategories(updatedCats);

    const updatedFoods = foodsList.map(f => f.category === oldName ? { ...f, category: cleanNew } : f);
    setFoodsList(updatedFoods);
    saveStoredFoods(updatedFoods);
    updatedFoods.filter(f => f.category === cleanNew).forEach(f => syncFoodToSupabase(f));

    const updatedSubs = subcategoriesList.map(s => s.category === oldName ? { ...s, category: cleanNew } : s);
    setSubcategoriesList(updatedSubs);
    saveStoredSubcategories(updatedSubs);

    deleteCategoryFromSupabase(oldName);
    syncCategoryToSupabase(cleanNew);
  };

  const handleUpdateSubcategory = (updatedSub) => {
    const updated = subcategoriesList.map(s => s.id === updatedSub.id ? updatedSub : s);
    setSubcategoriesList(updated);
    saveStoredSubcategories(updated);
    syncSubcategoryToSupabase(updatedSub);
  };

  const handleDeleteCategory = (catName) => {
    const updatedCats = categoriesList.filter(c => c !== catName);
    setCategoriesList(updatedCats);
    saveStoredCategories(updatedCats);
    deleteCategoryFromSupabase(catName);
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    const updated = ordersList.map(o => o.id === orderId ? { ...o, orderStatus: newStatus } : o);
    setOrdersList(updated);
    saveStoredOrders(updated);
  };

  const handleAddSubcategory = (newSub) => {
    const updated = [newSub, ...subcategoriesList];
    setSubcategoriesList(updated);
    saveStoredSubcategories(updated);
    syncSubcategoryToSupabase(newSub);
  };

  const handleDeleteSubcategory = (subId) => {
    const updated = subcategoriesList.filter(s => s.id !== subId);
    setSubcategoriesList(updated);
    saveStoredSubcategories(updated);
    deleteSubcategoryFromSupabase(subId);
  };

  const handleBroadcastSliderNotification = async (slide) => {
    if (!slide) return;
    try {
      const followersData = await fetchLiveFollowersFromSupabase('resto_001');
      const recipientsCount = followersData?.totalFollowers || 1;
      const currencySymbol = restaurantProfile?.currency || '৳';
      const priceStr = slide.price ? ` (${currencySymbol}${slide.price})` : '';
      const bodyText = `${slide.badge ? `[${slide.badge}] ` : ''}${slide.subtitle || 'Special offer now live on our 3D menu!'}${priceStr}`;
      const targetUrl = `/?openSlide=${encodeURIComponent(slide.id || '')}${slide.foodId ? `&foodId=${encodeURIComponent(slide.foodId)}` : ''}`;

      await broadcastRestaurantNotification('resto_001', {
        sliderId: slide.id,
        foodId: slide.foodId || '',
        title: `🔥 New Special Offer: ${slide.title}!`,
        body: bodyText,
        icon: restaurantProfile?.logo || '/monkey_bhai_logo.png',
        image: slide.image || null,
        url: targetUrl,
        recipientsCount: recipientsCount
      });
    } catch (notifErr) {
      console.warn('Broadcast notification error:', notifErr);
    }
  };

  const handleAddFeaturedSlider = async (newSlide) => {
    const exists = featuredSliders.some(s => String(s.id) === String(newSlide.id));
    let updated;
    if (exists) {
      updated = featuredSliders.map(s => String(s.id) === String(newSlide.id) ? newSlide : s);
    } else {
      updated = [newSlide, ...featuredSliders];
    }
    setFeaturedSliders(updated);
    saveStoredFeaturedSliders(updated);
    await syncSliderToSupabase(newSlide);

    // If published and active, broadcast push notification to all followers
    if (newSlide.isActive !== false) {
      await handleBroadcastSliderNotification(newSlide);
    }
  };

  const handleDeleteFeaturedSlider = (slideId) => {
    const updated = featuredSliders.filter(s => s.id !== slideId);
    setFeaturedSliders(updated);
    saveStoredFeaturedSliders(updated);
    deleteSliderFromSupabase(slideId);
  };

  const handleToggleFeaturedSlider = (slideId) => {
    const updated = featuredSliders.map(s => {
      if (s.id === slideId) {
        const toggled = { ...s, isActive: !s.isActive };
        syncSliderToSupabase(toggled);
        return toggled;
      }
      return s;
    });
    setFeaturedSliders(updated);
    saveStoredFeaturedSliders(updated);
  };

  const handleSaveRestaurantProfile = (updatedProfile) => {
    setRestaurantProfile(updatedProfile);
    saveRestaurantProfile(updatedProfile);
  };

  const handleAddTicket = (newTicket) => {
    const updated = [newTicket, ...ticketsList];
    setTicketsList(updated);
    saveStoredTickets(updated);
    syncTicketToSupabase(newTicket);
  };

  const handleSendMessage = (newMsg) => {
    if (newMsg._clearAll) {
      setChatMessagesList([]);
      saveStoredChatMessages([]);
      return;
    }
    const updated = [...chatMessagesList, newMsg];
    setChatMessagesList(updated);
    saveStoredChatMessages(updated);
    syncChatMessageToSupabase(newMsg);
  };

  const handleUpdateSuperAdminConfig = (updatedCfg) => {
    setSuperAdminConfig(updatedCfg);
    saveSuperAdminConfig(updatedCfg);
  };

  // UI States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [menuOfferIndex, setMenuOfferIndex] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [showDetailScrollHint, setShowDetailScrollHint] = useState(false);
  const [showSelectedListScrollHint, setShowSelectedListScrollHint] = useState(false);
  const [badgeMode, setBadgeMode] = useState('tag'); // 'tag' | 'rating'
  const menuScrollContainerRef = useRef(null);
  const detailScrollContainerRef = useRef(null);
  const selectedListScrollContainerRef = useRef(null);

  // Dynamic Badge Toggle: Swaps between Tag ('Best Selling') and Rating every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setBadgeMode(prev => (prev === 'tag' ? 'rating' : 'tag'));
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Restaurant Follow State (Customer Connection & Marketing Notifications)
  const [isFollowing, setIsFollowing] = useState(() => isCustomerFollowingRestaurant('resto_001'));
  const [isFollowBannerVisible, setIsFollowBannerVisible] = useState(() => !isCustomerFollowingRestaurant('resto_001'));
  const [isFadingOutFollowBanner, setIsFadingOutFollowBanner] = useState(false);
  const followBannerTimerRef = useRef(null);

  // Sync customer following status from Supabase DB on initial load/refresh
  useEffect(() => {
    let isMounted = true;
    syncCustomerFollowStatusFromSupabase('resto_001').then((dbFollowed) => {
      if (!isMounted) return;
      setIsFollowing(dbFollowed);
      if (dbFollowed) {
        setIsFollowBannerVisible(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFollowRestaurant = async () => {
    await recordRestaurantFollow('resto_001');
    setIsFollowing(true);

    // 8 seconds after following, the follow banner disappears
    if (followBannerTimerRef.current) clearTimeout(followBannerTimerRef.current);
    followBannerTimerRef.current = setTimeout(() => {
      setIsFadingOutFollowBanner(true);
      setTimeout(() => {
        setIsFollowBannerVisible(false);
        setIsFadingOutFollowBanner(false);
      }, 700);
    }, 8000);
  };

  useEffect(() => {
    return () => {
      if (followBannerTimerRef.current) clearTimeout(followBannerTimerRef.current);
    };
  }, []);

  // Automatically sync Web Push subscription with Supabase for active followers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isFollower = isCustomerFollowingRestaurant('resto_001');
      const hasPermission = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      if (isFollower || hasPermission) {
        ensurePushSubscriptionSync('resto_001').catch(() => {});
      }
    }
  }, [isFollowing]);

  // Live Follower Notification Banner State (For Customer 3D Menu)
  const [followerNotification, setFollowerNotification] = useState(null);
  const followerNotifTimerRef = useRef(null);

  // Open and display the promoted special dish directly on the 3D home screen
  const handleActivateOfferDish = (sliderId, foodId) => {
    // 1. Ensure view is Customer Menu
    if (currentView !== 'menu') {
      navigateToMenu();
    }

    // 2. Close all open overlays and modals so the customer directly sees the home screen
    setIsMenuOpen(false);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    setIsSearchOpen(false);
    setIsCustomizeOpen(false);
    setFollowerNotification(null);

    // 3. Find matching slider
    let targetSlide = featuredSliders.find(s => String(s.id) === String(sliderId));
    if (!targetSlide && sliderId) {
      const stored = getStoredFeaturedSliders();
      targetSlide = stored.find(s => String(s.id) === String(sliderId));
    }

    const resolvedFoodId = foodId || targetSlide?.foodId;

    // 4. Find matching food item
    let targetFood = foodsList.find(f => String(f.id) === String(resolvedFoodId));
    if (!targetFood && targetSlide) {
      targetFood = foodsList.find(f => f.title === targetSlide.foodTitle || f.title === targetSlide.title);
    }
    if (!targetFood && publishedFoods.length > 0) {
      targetFood = publishedFoods[0];
    }

    // 5. Land on home screen with the offer food showcased in 3D
    if (targetFood) {
      const promoFood = {
        ...targetFood,
        price: (targetSlide && targetSlide.price !== undefined) ? targetSlide.price : targetFood.price,
        promoBadge: (targetSlide && targetSlide.badge) ? targetSlide.badge : 'FEATURED SPECIAL',
        promoTitle: (targetSlide && targetSlide.title) ? targetSlide.title : targetFood.title
      };
      setSelectedPortion(0);
      setSelectedFeaturedDish(promoFood);
      setActiveCategory('All Items');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenNotificationDish = (notif) => {
    if (!notif) return;
    handleActivateOfferDish(notif.slider_id, notif.food_id || notif.foodId);
  };

  // Follower Notification Realtime & Polling Listener
  useEffect(() => {
    const handleIncomingNotification = async (notif) => {
      if (!notif || !notif.id) return;

      // Check if user has followed this restaurant
      const isUserFollower = isCustomerFollowingRestaurant('resto_001');
      if (!isUserFollower) return;

      // Deduplication: only alert once per notification ID
      const notifKey = `dgm_notif_seen_${notif.id}`;
      if (localStorage.getItem(notifKey)) return;

      // Ignore notifications older than 24 hours (so recent notifications are NEVER dropped by clock skew)
      const notifTimeStr = notif.created_at ? String(notif.created_at).replace(' ', 'T') : null;
      const notifTime = notifTimeStr ? new Date(notifTimeStr).getTime() : Date.now();
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (!isNaN(notifTime) && notifTime < twentyFourHoursAgo) {
        localStorage.setItem(notifKey, 'true');
        return;
      }

      localStorage.setItem(notifKey, 'true');

      // 1. In-App Floating Notification Banner (Visible on digital menu) - instant non-blocking
      setFollowerNotification(notif);

      if (followerNotifTimerRef.current) clearTimeout(followerNotifTimerRef.current);
      followerNotifTimerRef.current = setTimeout(() => {
        setFollowerNotification(null);
      }, 14000);

      // 2. Native System / Browser Notification (Phone screen / Desktop OS) - non-blocking
      const notifTargetUrl = notif.url || `/?openSlide=${encodeURIComponent(notif.slider_id || '')}`;
      showBrowserNotification(notif.title || '🔥 New Special Offer from Moneky Bhai!', {
        body: notif.body || 'Check out our newly published special dish on the 3D menu!',
        icon: notif.icon || restaurantProfile?.logo || '/monkey_bhai_logo.png',
        image: notif.image || undefined,
        tag: notif.id,
        data: {
          url: notifTargetUrl,
          sliderId: notif.slider_id,
          foodId: notif.food_id || notif.foodId || ''
        }
      }).catch(err => {
        console.warn('showBrowserNotification caught:', err);
      });
    };

    // Layer 1: Supabase Direct Broadcast Channel (instant websocket message)
    let broadcastChannel = null;
    try {
      broadcastChannel = supabase
        .channel('dgm_restaurant_realtime_broadcast')
        .on('broadcast', { event: 'new_slider_notif' }, (data) => {
          if (data?.payload) {
            handleIncomingNotification(data.payload);
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime broadcast subscribe caught:', e);
    }

    // Layer 2: Supabase Postgres Changes Channel (database insert event)
    let dbChannel = null;
    try {
      dbChannel = supabase
        .channel('realtime_restaurant_notifications_db')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'restaurant_notifications'
          },
          (payload) => {
            if (payload?.new && (payload.new.restaurant_id === 'resto_001' || !payload.new.restaurant_id)) {
              handleIncomingNotification(payload.new);
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Database channel subscribe caught:', e);
    }

    // Layer 3: Gentle Visibility-Aware Fallback (60s instead of 3s; Layers 1 & 2 handle instant delivery via WebSocket)
    const checkLatestNotifs = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestRestaurantNotifications('resto_001', 3).then((latest) => {
          if (Array.isArray(latest)) {
            latest.forEach(notif => {
              handleIncomingNotification(notif);
            });
          }
        }).catch(() => {});
      }
    };

    window.addEventListener('focus', checkLatestNotifs);
    document.addEventListener('visibilitychange', checkLatestNotifs);

    const pollInterval = setInterval(checkLatestNotifs, 60000);

    return () => {
      if (broadcastChannel) supabase.removeChannel(broadcastChannel);
      if (dbChannel) supabase.removeChannel(dbChannel);
      window.removeEventListener('focus', checkLatestNotifs);
      document.removeEventListener('visibilitychange', checkLatestNotifs);
      clearInterval(pollInterval);
      if (followerNotifTimerRef.current) clearTimeout(followerNotifTimerRef.current);
    };
  }, [restaurantProfile?.logo, featuredSliders, publishedFoods, isFollowing]);

  // Handle URL redirect query parameters on initial page load (e.g. from Push Notification click)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const openSlide = params.get('openSlide');
      const openFood = params.get('foodId');
      if (openSlide || openFood) {
        handleActivateOfferDish(openSlide, openFood);
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (e) {}
  }, [foodsList.length, featuredSliders.length]);

  // Handle Service Worker postMessage & Desktop Notification click events
  useEffect(() => {
    const handleSwMessage = (event) => {
      if (event.data?.type === 'DGM_NOTIFICATION_CLICK') {
        const { sliderId, foodId } = event.data.data || {};
        handleActivateOfferDish(sliderId, foodId);
      }
    };

    const handleCustomNotifClick = (event) => {
      const { sliderId, foodId } = event.detail || {};
      handleActivateOfferDish(sliderId, foodId);
    };

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }
    window.addEventListener('dgm_notification_click', handleCustomNotifClick);

    return () => {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
      window.removeEventListener('dgm_notification_click', handleCustomNotifClick);
    };
  }, [foodsList, featuredSliders, publishedFoods]);


  // Customization Modal State
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [selectedPortion, setSelectedPortion] = useState(0);
  const [selectedPortions, setSelectedPortions] = useState([]);
  const [visibleQtyItems, setVisibleQtyItems] = useState({});
  const qtyTimersRef = useRef({});

  const showQtyControl = (id) => {
    if (qtyTimersRef.current[id]) {
      clearTimeout(qtyTimersRef.current[id]);
    }
    setVisibleQtyItems(prev => ({ ...prev, [id]: true }));
    qtyTimersRef.current[id] = setTimeout(() => {
      setVisibleQtyItems(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      delete qtyTimersRef.current[id];
    }, 5000);
  };

  const [selectedSpice, setSelectedSpice] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [customQuantity, setCustomQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Cart & Order State
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [diningMode, setDiningMode] = useState('dine-in'); // 'dine-in' or 'takeaway'
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('select-payment'); // 'select-payment' | 'processing' | 'success'
  const [paymentMethod, setPaymentMethod] = useState('bkash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [placedOrderDetails, setPlacedOrderDetails] = useState(null);

  // Customer Selected Items List (Add to List Flow)
  const [selectedList, setSelectedList] = useState(() => {
    try {
      const raw = localStorage.getItem('dgm_customer_selected_items');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  const [isSelectedListOpen, setIsSelectedListOpen] = useState(false);
  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false);
  const [orderConfirmationSuccess, setOrderConfirmationSuccess] = useState(false);
  const [addToListToast, setAddToListToast] = useState(null);

  // Automated Order Confirmation Popup states (fires 2 seconds after leaving customization without adding to list)
  const [isAutoConfirmPopupOpen, setIsAutoConfirmPopupOpen] = useState(false);
  const [autoConfirmSource, setAutoConfirmSource] = useState('customization'); // 'customization' | 'selectedList'
  const autoConfirmTimerRef = useRef(null);
  const pendingUnconfirmedItemRef = useRef(null);

  useEffect(() => {
    return () => {
      if (autoConfirmTimerRef.current) {
        clearTimeout(autoConfirmTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('dgm_customer_selected_items', JSON.stringify(selectedList));
    } catch (e) {}
  }, [selectedList]);

  // 3D Holographic Touch & Mouse Drag Rotation Controls
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [scale, setScale] = useState(1);
  const [imageAspectScale, setImageAspectScale] = useState(1);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const touchStartPos = useRef({ x: 0, y: 0 });
  const initialTouchDistance = useRef(null);
  const initialScale = useRef(1);

  // Auto-Carousel & Interactive Touch-Swipe / Pause-on-Hold for Menu Offer Banner
  const [isCarouselPressed, setIsCarouselPressed] = useState(false);
  const carouselTouchStartX = useRef(0);
  const carouselTouchStartY = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    if (isMenuOpen) {
      setIsCarouselHovered(false);
      setIsCarouselPressed(false);
      isSwiping.current = false;
    }
  }, [isMenuOpen]);

  // Cycles every 3.8s, but completely pauses when user is tapping, holding down or hovering over the slider
  useEffect(() => {
    if (!isMenuOpen || isCarouselHovered || isCarouselPressed) return;
    const timer = setInterval(() => {
      setMenuOfferIndex(prev => (prev + 1) % (carouselItems.length || 1));
    }, 3800);
    return () => clearInterval(timer);
  }, [isMenuOpen, isCarouselHovered, isCarouselPressed, carouselItems.length]);

  const handleCarouselTouchStart = (e) => {
    setIsCarouselPressed(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    carouselTouchStartX.current = clientX;
    carouselTouchStartY.current = clientY;
    isSwiping.current = false;
  };

  const handleCarouselTouchMove = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - carouselTouchStartX.current;
    const deltaY = clientY - carouselTouchStartY.current;

    // Detect horizontal swipe
    if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
      isSwiping.current = true;
    }
  };

  const handleCarouselTouchEnd = (e) => {
    setIsCarouselPressed(false);
    const clientX = e?.changedTouches ? e.changedTouches[0].clientX : e?.clientX;
    if (clientX !== undefined && carouselTouchStartX.current !== 0) {
      const deltaX = clientX - carouselTouchStartX.current;
      // Threshold for slide change (35px)
      if (Math.abs(deltaX) > 35) {
        if (deltaX < 0) {
          setMenuOfferIndex(prev => (prev + 1) % (carouselItems.length || 1));
        } else {
          setMenuOfferIndex(prev => (prev - 1 + carouselItems.length) % (carouselItems.length || 1));
        }
      }
    }
    carouselTouchStartX.current = 0;
    setTimeout(() => {
      isSwiping.current = false;
    }, 60);
  };

  // Periodic subtle popup scroll indicator (shows initially after 1s then every 10s if content is scrollable)
  useEffect(() => {
    if (!isMenuOpen) {
      setShowScrollHint(false);
      return;
    }

    const checkAndShow = () => {
      if (menuScrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = menuScrollContainerRef.current;
        if (scrollHeight - scrollTop - clientHeight > 30) {
          setShowScrollHint(true);
          setTimeout(() => setShowScrollHint(false), 3500);
        }
      }
    };

    // First hint after 1.5s when modal opens
    const initialTimer = setTimeout(checkAndShow, 1500);

    // Then repeats every 10s
    const interval = setInterval(checkAndShow, 8000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isMenuOpen]);

  // Periodic subtle popup scroll indicator for Details & Customization Modal (shows initially after 1.2s then every 8s if scrollable)
  useEffect(() => {
    if (!isDetailSheetOpen) {
      setShowDetailScrollHint(false);
      return;
    }

    const checkAndShow = () => {
      if (detailScrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = detailScrollContainerRef.current;
        if (scrollHeight - scrollTop - clientHeight > 30) {
          setShowDetailScrollHint(true);
          setTimeout(() => setShowDetailScrollHint(false), 3500);
        }
      }
    };

    const initialTimer = setTimeout(checkAndShow, 1200);
    const interval = setInterval(checkAndShow, 8000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isDetailSheetOpen]);

  // Periodic subtle popup scroll indicator for Selected Food Items Modal (shows initially after 1s then every 8s if scrollable)
  useEffect(() => {
    if (!isSelectedListOpen) {
      setShowSelectedListScrollHint(false);
      return;
    }

    const checkAndShow = () => {
      if (selectedListScrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = selectedListScrollContainerRef.current;
        if (scrollHeight - scrollTop - clientHeight > 35) {
          setShowSelectedListScrollHint(true);
          setTimeout(() => setShowSelectedListScrollHint(false), 3500);
        }
      }
    };

    const initialTimer = setTimeout(checkAndShow, 1000);
    const interval = setInterval(checkAndShow, 8000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isSelectedListOpen, selectedList.length]);

  // Reset 3D transformation and calculate adaptive aspect-ratio zoom when switching food item
  useEffect(() => {
    setRotX(0);
    setRotY(0);
    setScale(1);
    if (activeFood && activeFood.customizable) {
      setSelectedPortion(0);
      setSelectedPortions([]);
      setVisibleQtyItems({});
      setSelectedSpice(0);
      setSelectedAddons([]);
      setCustomQuantity(1);
      setSpecialInstructions('');
    }

    if (!activeFood?.image) {
      setImageAspectScale(1);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      // If wide landscape image (ratio > 1.25, like 16:9), boost zoom up to 1.30x so dish isn't shrunken by container
      if (ratio > 1.25) {
        const boost = Math.min(1.30, 1 + (ratio - 1) * 0.38);
        setImageAspectScale(boost);
      } else if (ratio < 0.85) {
        setImageAspectScale(1.08);
      } else {
        // High-density 1:1 square
        setImageAspectScale(1.04);
      }
    };
    img.src = activeFood.image;
  }, [activeFood?.id, activeFood?.image]);

  // Food Navigation
  const handleNextFood = (e) => {
    e?.stopPropagation();
    if (selectedFeaturedDish) {
      setSelectedFeaturedDish(null);
    }
    if (filteredFoods.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % filteredFoods.length);
  };
  const handlePrevFood = (e) => {
    e?.stopPropagation();
    if (selectedFeaturedDish) {
      setSelectedFeaturedDish(null);
    }
    if (filteredFoods.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + filteredFoods.length) % filteredFoods.length);
  };

  // 3D Touch Interaction Handlers
  const getDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      initialTouchDistance.current = getDistance(e.touches);
      initialScale.current = scale;
      isDragging.current = false;
    } else if (e.touches.length === 1) {
      isDragging.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialTouchDistance.current) {
      const currentDistance = getDistance(e.touches);
      const factor = currentDistance / initialTouchDistance.current;
      setScale(Math.max(0.85, Math.min(initialScale.current * factor, 2.2)));
    } else if (e.touches.length === 1 && isDragging.current) {
      const deltaX = e.touches[0].clientX - lastPos.current.x;
      const deltaY = e.touches[0].clientY - lastPos.current.y;
      setRotY(prev => prev + deltaX * 0.65);
      setRotX(prev => Math.max(-55, Math.min(55, prev - deltaY * 0.65)));
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e) => {
    isDragging.current = false;
    if (e.touches.length < 2) initialTouchDistance.current = null;
  };

  // 3D Mouse Interaction Handlers
  const handleMouseDown = (e) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - lastPos.current.x;
    const deltaY = e.clientY - lastPos.current.y;
    setRotY(prev => prev + deltaX * 0.65);
    setRotX(prev => Math.max(-55, Math.min(55, prev - deltaY * 0.65)));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Multi-Portion Selection & Quantity Handlers (Auto-hides Qty after 5s)
  const togglePortion = (portionIdx) => {
    const id = `portion-${portionIdx}`;
    setSelectedPortions(prev => {
      const exists = prev.some(p => p.idx === portionIdx);
      if (exists) {
        if (!visibleQtyItems[id]) {
          showQtyControl(id);
          return prev;
        }
        return prev.filter(p => p.idx !== portionIdx);
      }
      showQtyControl(id);
      return [...prev, { idx: portionIdx, quantity: 1 }];
    });
    setSelectedPortion(portionIdx);
  };

  const updatePortionQuantity = (portionIdx, delta) => {
    const id = `portion-${portionIdx}`;
    showQtyControl(id);
    setSelectedPortions(prev => {
      const existing = prev.find(p => p.idx === portionIdx);
      if (!existing) {
        if (delta > 0) {
          return [...prev, { idx: portionIdx, quantity: 1 }];
        }
        return prev;
      }
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(p => p.idx !== portionIdx);
      }
      return prev.map(p => p.idx === portionIdx ? { ...p, quantity: newQty } : p);
    });
  };

  const unselectPortion = (portionIdx) => {
    const id = `portion-${portionIdx}`;
    if (qtyTimersRef.current[id]) {
      clearTimeout(qtyTimersRef.current[id]);
      delete qtyTimersRef.current[id];
    }
    setVisibleQtyItems(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedPortions(prev => prev.filter(p => p.idx !== portionIdx));
  };

  // Toggle Customization Addon (Auto-hides Qty after 5s)
  const toggleAddon = (addon) => {
    const id = `addon-${addon.id}`;
    setSelectedAddons(prev => {
      const exists = prev.some(a => a.id === addon.id);
      if (exists) {
        if (!visibleQtyItems[id]) {
          showQtyControl(id);
          return prev;
        }
        return prev.filter(a => a.id !== addon.id);
      }
      showQtyControl(id);
      return [...prev, { ...addon, quantity: 1 }];
    });
  };

  // Modify Individual Addon Quantity
  const updateAddonQuantity = (addonId, delta) => {
    const id = `addon-${addonId}`;
    showQtyControl(id);
    setSelectedAddons(prev => {
      const existing = prev.find(a => a.id === addonId);
      if (!existing) {
        if (delta > 0) {
          const addonObj = activeFood?.customizable?.addons?.find(a => a.id === addonId);
          if (addonObj) return [...prev, { ...addonObj, quantity: 1 }];
        }
        return prev;
      }
      const newQty = (existing.quantity || 1) + delta;
      if (newQty <= 0) {
        return prev.filter(a => a.id !== addonId);
      }
      return prev.map(a => a.id === addonId ? { ...a, quantity: newQty } : a);
    });
  };

  const unselectAddon = (addonId) => {
    const id = `addon-${addonId}`;
    if (qtyTimersRef.current[id]) {
      clearTimeout(qtyTimersRef.current[id]);
      delete qtyTimersRef.current[id];
    }
    setVisibleQtyItems(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedAddons(prev => prev.filter(a => a.id !== addonId));
  };

  // Real-time Portion & Addon Calculation
  const hasCustomPortions = Boolean(activeFood?.customizable?.portions && activeFood.customizable.portions.length > 0);
  const primaryPortionIdx = selectedPortions[0]?.idx ?? selectedPortion;
  const currentPortion = activeFood?.customizable?.portions?.[primaryPortionIdx] || activeFood?.customizable?.portions?.[0];

  const currentPortionPrice = hasCustomPortions && currentPortion
    ? (currentPortion.price !== undefined ? Number(currentPortion.price) : (Number(activeFood?.price || 0) + Number(currentPortion.extra || 0)))
    : Number(activeFood?.price || 0);

  const currentPortionOldPrice = hasCustomPortions && currentPortion
    ? (currentPortion.oldPrice !== undefined
        ? Number(currentPortion.oldPrice)
        : (activeFood?.oldPrice ? (Number(activeFood.oldPrice) + Number(currentPortion.extra || 0)) : undefined))
    : (activeFood?.oldPrice ? Number(activeFood.oldPrice) : undefined);

  // Universal Portion Discount Resolver for Top-Left Home Badge:
  // ONLY shows when ALL portions share the exact same percentage (e.g. 20% OFF)
  // OR the exact same flat discount amount (e.g. ৳50 OFF).
  // If portions have different discounts or any portion has no discount, returns null.
  const uniformDiscountBadge = useMemo(() => {
    if (!activeFood) return null;
    const portions = activeFood.customizable?.portions;

    if (Array.isArray(portions) && portions.length > 0) {
      const baseOldPrice = Number(activeFood.oldPrice || 0);

      const discounts = portions.map(p => {
        const selling = Number(p.price !== undefined ? p.price : (Number(activeFood.price || 0) + Number(p.extra || 0)));
        const regular = Number(
          p.oldPrice !== undefined
            ? p.oldPrice
            : (p.regularPrice !== undefined
                ? p.regularPrice
                : (baseOldPrice > 0 ? baseOldPrice + Number(p.extra || 0) : selling))
        );

        if (regular > selling && regular > 0) {
          const flat = Math.round((regular - selling) * 100) / 100;
          const pct = Math.round(((regular - selling) / regular) * 100);
          return { hasDiscount: true, flat, pct };
        }
        return { hasDiscount: false, flat: 0, pct: 0 };
      });

      // If any portion has no discount, do NOT show
      if (discounts.some(d => !d.hasDiscount)) {
        return null;
      }

      // 1. Check if all portions have the same percentage discount (e.g. 20% OFF)
      const firstPct = discounts[0].pct;
      const allSamePct = discounts.every(d => Math.abs(d.pct - firstPct) <= 1);
      if (allSamePct && firstPct > 0) {
        return `${firstPct}% OFF`;
      }

      // 2. Check if all portions have the same flat discount amount (e.g. ৳50 OFF)
      const firstFlat = discounts[0].flat;
      const allSameFlat = discounts.every(d => Math.abs(d.flat - firstFlat) < 0.5);
      if (allSameFlat && firstFlat > 0) {
        return `FLAT ${currency}${Math.round(firstFlat)} OFF`;
      }

      // If portions have different discounts, DO NOT show
      return null;
    }

    // Single price dish (no portions)
    const selling = Number(activeFood.price || 0);
    const regular = Number(activeFood.oldPrice || 0);
    if (regular > selling && regular > 0) {
      const pct = Math.round(((regular - selling) / regular) * 100);
      if (pct > 0) {
        return `${pct}% OFF`;
      }
    }

    return null;
  }, [activeFood, currency]);

  // Calculate sum of all selected portions
  const portionsTotal = hasCustomPortions
    ? selectedPortions.reduce((sum, sp) => {
        const pObj = activeFood.customizable.portions[sp.idx];
        if (!pObj) return sum;
        const pSelling = pObj.price !== undefined
          ? Number(pObj.price)
          : ((Number(activeFood?.price) || 0) + (Number(pObj.extra) || 0));
        return sum + (pSelling * (sp.quantity || 1));
      }, 0)
    : (currentPortionPrice * customQuantity);

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + ((Number(a.price) || 0) * (a.quantity || 1)), 0);
  const currentItemTotalPrice = portionsTotal + addonsTotal;
  const currentItemUnitPrice = currentItemTotalPrice;

  // Real-time In-Card Price Calculation for Customer Display
  const hasSelectedItem = hasCustomPortions
    ? (selectedPortions.length > 0 || selectedAddons.length > 0)
    : true;

  const cardSubtotal = currentItemTotalPrice;

  // Dynamic VAT calculation from restaurantProfile (configured via Settings)
  const vatEnabled = restaurantProfile?.vatEnabled !== false;
  const vatType = restaurantProfile?.vatType || 'percentage';
  const vatRate = Number(restaurantProfile?.vatRate ?? 5.0);
  const isVatActive = adminConfig.breakdown.enableVat && vatEnabled;
  const cardVat = !isVatActive || !hasSelectedItem ? 0 : (
    vatType === 'flat' 
      ? vatRate 
      : (cardSubtotal * (vatRate / 100))
  );

  // Dynamic Service Charge calculation from restaurantProfile (configured via Settings)
  const serviceChargeEnabled = restaurantProfile?.serviceChargeEnabled !== false;
  const serviceChargeType = restaurantProfile?.serviceChargeType || 'flat';
  const serviceChargeRate = Number(restaurantProfile?.serviceChargeRate ?? 2.0);
  const isServiceChargeActive = adminConfig.breakdown.enableServiceFee && serviceChargeEnabled;
  const cardServiceFee = !isServiceChargeActive ? 0 : (
    serviceChargeType === 'flat'
      ? serviceChargeRate
      : (cardSubtotal * (serviceChargeRate / 100))
  );

  // When customer has not chosen/selected any item from the menu, table service charge & VAT are not counted into the grand total
  const cardGrandTotal = hasSelectedItem
    ? Math.round(Math.max(0, cardSubtotal + cardVat + cardServiceFee))
    : 0;

  // Selected List Financial Calculations
  const selectedListSubtotal = selectedList.reduce((sum, item) => sum + ((Number(item.totalPrice) || 0) * (item.quantity || 1)), 0);
  const selectedListVat = !isVatActive ? 0 : (
    vatType === 'flat' ? vatRate : (selectedListSubtotal * (vatRate / 100))
  );
  const selectedListServiceFee = !isServiceChargeActive ? 0 : (
    serviceChargeType === 'flat' ? serviceChargeRate : (selectedListSubtotal * (serviceChargeRate / 100))
  );
  const selectedListGrandTotal = Math.round(Math.max(0, selectedListSubtotal + selectedListVat + selectedListServiceFee));
  const selectedListCount = selectedList.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const isItemMatchWithFood = (item, food) => {
    if (!item || !food) return false;
    if (item.foodId && food.id && String(item.foodId) === String(food.id)) return true;
    if (item.title && food.title && String(item.title).trim().toLowerCase() === String(food.title).trim().toLowerCase()) return true;
    return false;
  };

  const existingSelectedListItem = useMemo(() => {
    if (!activeFood) return null;
    return selectedList.find(item => isItemMatchWithFood(item, activeFood)) || null;
  }, [selectedList, activeFood?.id, activeFood?.title]);
  const isItemAlreadyInList = Boolean(existingSelectedListItem);

  // Add or update customized food item in selected list from Food Details modal
  const handleAddToListFromDetail = () => {
    if (!activeFood) return;

    if (hasCustomPortions && selectedPortions.length === 0) {
      setAddToListToast('Please select at least one portion size!');
      setTimeout(() => setAddToListToast(null), 3000);
      return;
    }

    const portionsToAdd = hasCustomPortions && selectedPortions.length > 0
      ? selectedPortions.map(sp => {
          const pObj = activeFood?.customizable?.portions?.[sp.idx];
          const pSelling = pObj?.price !== undefined
            ? Number(pObj.price)
            : ((Number(activeFood?.price) || 0) + (Number(pObj?.extra) || 0));
          return {
            idx: sp.idx,
            name: pObj?.name || 'Standard Portion',
            quantity: sp.quantity || 1,
            unitPrice: pSelling,
            totalPrice: pSelling * (sp.quantity || 1)
          };
        })
      : [{
          name: 'Standard Portion',
          quantity: customQuantity,
          unitPrice: currentPortionPrice,
          totalPrice: currentPortionPrice * customQuantity
        }];

    const portionSummaryText = portionsToAdd.map(p => `${p.name} (x${p.quantity})`).join(', ');

    const newItem = {
      cartId: `${activeFood.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      foodId: activeFood.id,
      title: activeFood.title,
      image: activeFood.image,
      isPng: activeFood.isPng,
      tag: activeFood.tag,
      category: activeFood.category,
      portion: portionSummaryText,
      portions: portionsToAdd,
      addons: selectedAddons.map(a => ({ ...a, quantity: a.quantity || 1 })),
      unitPrice: currentItemTotalPrice,
      quantity: 1,
      totalPrice: currentItemTotalPrice,
      addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    let wasUpdated = false;
    setSelectedList(prev => {
      const exists = prev.some(item => isItemMatchWithFood(item, activeFood));
      if (exists) {
        wasUpdated = true;
        return prev.map(item => {
          if (!isItemMatchWithFood(item, activeFood)) return item;
          return {
            ...item,
            foodId: activeFood.id || item.foodId,
            title: activeFood.title,
            image: activeFood.image,
            isPng: activeFood.isPng,
            tag: activeFood.tag,
            category: activeFood.category,
            portion: portionSummaryText,
            portions: portionsToAdd,
            addons: selectedAddons.map(a => ({ ...a, quantity: a.quantity || 1 })),
            unitPrice: currentItemTotalPrice,
            quantity: item.quantity || 1,
            totalPrice: currentItemTotalPrice,
            addedAt: item.addedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        });
      }
      return [...prev, newItem];
    });

    setIsDetailSheetOpen(false);

    // Cancel any pending auto confirm popup timer since item was added/updated
    if (autoConfirmTimerRef.current) {
      clearTimeout(autoConfirmTimerRef.current);
      autoConfirmTimerRef.current = null;
    }
    pendingUnconfirmedItemRef.current = null;
    setIsAutoConfirmPopupOpen(false);

    // Reset local customization state for next food item
    setSelectedPortions([]);
    setSelectedAddons([]);
    setCustomQuantity(1);
    setVisibleQtyItems({});

    // Directly redirect customer into Selected Food Items modal
    setIsSelectedListOpen(true);

    const toastText = isItemAlreadyInList || wasUpdated
      ? `"${activeFood.title}" updated in your list!`
      : `"${activeFood.title}" added to your selected items!`;
    setAddToListToast(toastText);
    setTimeout(() => setAddToListToast(null), 3000);
  };

  const updateSelectedListItemQuantity = (cartId, delta) => {
    setSelectedList(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const nextQty = (item.quantity || 1) + delta;
        if (nextQty <= 0) return null;
        return {
          ...item,
          quantity: nextQty
        };
      }
      return item;
    }).filter(Boolean));
  };

  const removeSelectedListItem = (cartId) => {
    setSelectedList(prev => prev.filter(item => item.cartId !== cartId));
  };

  const handleConfirmOrderWithWaiter = () => {
    const newOrder = {
      id: `ord_${Date.now()}`,
      orderNumber: `DGM-${Math.floor(1000 + Math.random() * 9000)}`,
      restaurantId: 'resto_001',
      restaurantName: restaurantProfile?.name || 'Moneky Bhai',
      tableNumber: tableNumber || 'Table 04',
      customerName: 'Customer (Table 04)',
      diningMode: 'dine-in',
      items: selectedList.map(item => ({
        name: item.title,
        portion: item.portion,
        addons: item.addons?.map(a => `${a.name} (x${a.quantity || 1})`).join(', ') || '',
        quantity: item.quantity || 1,
        price: (Number(item.totalPrice) || 0) * (item.quantity || 1)
      })),
      subtotal: selectedListSubtotal,
      vat: selectedListVat,
      serviceFee: selectedListServiceFee,
      totalAmount: selectedListGrandTotal,
      paymentMethod: 'Cash / Waiter',
      paymentStatus: 'pending',
      orderStatus: 'confirmed',
      confirmedWithWaiter: true,
      customerConfirmed: true,
      customerConfirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      date: 'Just now'
    };

    const updatedOrders = addStoredOrder(newOrder);
    if (updatedOrders) {
      setOrdersList(updatedOrders);
    }

    if (autoConfirmTimerRef.current) {
      clearTimeout(autoConfirmTimerRef.current);
      autoConfirmTimerRef.current = null;
    }
    pendingUnconfirmedItemRef.current = null;
    setIsAutoConfirmPopupOpen(false);

    setSelectedList([]);
    setIsConfirmOrderModalOpen(false);
    setIsSelectedListOpen(false);

    setOrderConfirmationSuccess(true);
    setTimeout(() => setOrderConfirmationSuccess(false), 5000);
  };

  // Open customization modal, hydrate previously added selections if already in list, and cancel running timers
  const handleOpenDetailSheet = () => {
    if (autoConfirmTimerRef.current) {
      clearTimeout(autoConfirmTimerRef.current);
      autoConfirmTimerRef.current = null;
    }
    setIsAutoConfirmPopupOpen(false);

    if (activeFood) {
      const existingItem = selectedList.find(item => isItemMatchWithFood(item, activeFood));
      if (existingItem) {
        const foodPortions = activeFood.customizable?.portions || [];
        if (foodPortions.length > 0 && Array.isArray(existingItem.portions)) {
          const restoredPortions = [];
          existingItem.portions.forEach(ep => {
            let matchIdx = -1;
            if (typeof ep.idx === 'number' && foodPortions[ep.idx] && foodPortions[ep.idx].name === ep.name) {
              matchIdx = ep.idx;
            } else {
              matchIdx = foodPortions.findIndex(fp => fp.name === ep.name);
            }
            if (matchIdx !== -1 && !restoredPortions.some(rp => rp.idx === matchIdx)) {
              restoredPortions.push({ idx: matchIdx, quantity: ep.quantity || 1 });
            }
          });
          setSelectedPortions(restoredPortions);
          if (restoredPortions.length > 0) {
            setSelectedPortion(restoredPortions[0].idx);
          }
        } else {
          setSelectedPortions([]);
        }

        const foodAddons = activeFood.customizable?.addons || [];
        if (foodAddons.length > 0 && Array.isArray(existingItem.addons)) {
          const restoredAddons = [];
          existingItem.addons.forEach(ea => {
            const matchAddon = foodAddons.find(fa =>
              (fa.id !== undefined && ea.id !== undefined && String(fa.id) === String(ea.id)) ||
              fa.name === ea.name
            );
            if (matchAddon && !restoredAddons.some(ra => ra.id === matchAddon.id)) {
              restoredAddons.push({ ...matchAddon, quantity: ea.quantity || 1 });
            }
          });
          setSelectedAddons(restoredAddons);
        } else {
          setSelectedAddons([]);
        }

        if (foodPortions.length === 0 && existingItem.portions?.[0]?.quantity) {
          setCustomQuantity(existingItem.portions[0].quantity);
        }
        setVisibleQtyItems({});
      }
    }

    setIsDetailSheetOpen(true);
  };

  // User closes customization modal without adding to list -> start 2-second timer for home screen popup
  const handleCloseDetailSheetWithoutAdd = () => {
    if (activeFood) {
      const portionsToAdd = hasCustomPortions && selectedPortions.length > 0
        ? selectedPortions.map(sp => {
            const pObj = activeFood?.customizable?.portions?.[sp.idx];
            const pSelling = pObj?.price !== undefined
              ? Number(pObj.price)
              : ((Number(activeFood?.price) || 0) + (Number(pObj?.extra) || 0));
            return {
              name: pObj?.name || 'Standard',
              quantity: sp.quantity || 1,
              unitPrice: pSelling,
              totalPrice: pSelling * (sp.quantity || 1)
            };
          })
        : [{
            name: 'Standard',
            quantity: customQuantity || 1,
            unitPrice: currentPortionPrice,
            totalPrice: currentPortionPrice * (customQuantity || 1)
          }];

      const portionSummaryText = portionsToAdd.map(p => `${p.name} (x${p.quantity})`).join(', ');

      pendingUnconfirmedItemRef.current = {
        cartId: `${activeFood.id}-${Date.now()}`,
        foodId: activeFood.id,
        title: activeFood.title,
        image: activeFood.image,
        isPng: activeFood.isPng,
        tag: activeFood.tag,
        category: activeFood.category,
        portion: portionSummaryText,
        portions: portionsToAdd,
        addons: selectedAddons.map(a => ({ ...a, quantity: a.quantity || 1 })),
        unitPrice: currentItemTotalPrice,
        quantity: 1,
        totalPrice: currentItemTotalPrice,
        addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }

    setIsDetailSheetOpen(false);
    setAutoConfirmSource('customization');

    // Cancel existing timer if any
    if (autoConfirmTimerRef.current) {
      clearTimeout(autoConfirmTimerRef.current);
    }

    // Immediately show mandatory order confirmation popup right upon exiting customization (200ms)
    // Customer won't have time to navigate anywhere else before answering
    autoConfirmTimerRef.current = setTimeout(() => {
      setIsAutoConfirmPopupOpen(true);
    }, 200);
  };

  // When customer exits Selected Food Items modal without answering (accidentally closes with X or outside tap)
  const handleCloseSelectedListWithoutConfirm = () => {
    setIsSelectedListOpen(false);

    if (selectedList && selectedList.length > 0) {
      setAutoConfirmSource('selectedList');
      if (autoConfirmTimerRef.current) {
        clearTimeout(autoConfirmTimerRef.current);
      }
      // Immediately show mandatory order confirmation popup (200ms)
      autoConfirmTimerRef.current = setTimeout(() => {
        setIsAutoConfirmPopupOpen(true);
      }, 200);
    }
  };

  // When customer clicks "Not yet — Keep Browsing" button inside Selected Food Items modal
  const handleDismissSelectedListWithoutPopup = () => {
    if (autoConfirmTimerRef.current) {
      clearTimeout(autoConfirmTimerRef.current);
      autoConfirmTimerRef.current = null;
    }
    setIsSelectedListOpen(false);
  };

  // Confirm order from the 2-second automated home screen popup
  const handleConfirmOrderFromAutoPopup = () => {
    let itemsToOrder = [];
    if (selectedList && selectedList.length > 0) {
      itemsToOrder = selectedList;
    } else if (pendingUnconfirmedItemRef.current) {
      itemsToOrder = [pendingUnconfirmedItemRef.current];
    } else if (activeFood) {
      itemsToOrder = [{
        name: activeFood.title,
        portion: 'Standard',
        addons: '',
        unitPrice: Number(activeFood.price) || 0,
        quantity: 1,
        totalPrice: Number(activeFood.price) || 0
      }];
    }

    const subtotal = itemsToOrder.reduce((acc, it) => acc + (Number(it.totalPrice || it.unitPrice || 0) * (it.quantity || 1)), 0);
    const vat = Math.round(subtotal * 0.05);
    const serviceFee = subtotal > 0 ? 5 : 0;
    const grandTotal = subtotal + vat + serviceFee;

    const newOrder = {
      id: `ord_${Date.now()}`,
      orderNumber: `DGM-${Math.floor(1000 + Math.random() * 9000)}`,
      restaurantId: 'resto_001',
      restaurantName: restaurantProfile?.name || 'Moneky Bhai',
      tableNumber: tableNumber || 'Table 04',
      customerName: 'Customer (Table 04)',
      diningMode: 'dine-in',
      items: itemsToOrder.map(item => ({
        name: item.title || item.name,
        portion: item.portion || 'Standard',
        addons: Array.isArray(item.addons)
          ? item.addons.map(a => `${a.name} (x${a.quantity || 1})`).join(', ')
          : (item.addons || ''),
        quantity: item.quantity || 1,
        price: (Number(item.totalPrice || item.unitPrice) || 0) * (item.quantity || 1)
      })),
      subtotal: subtotal,
      vat: vat,
      serviceFee: serviceFee,
      totalAmount: grandTotal,
      paymentMethod: 'Cash / Waiter',
      paymentStatus: 'pending',
      orderStatus: 'confirmed',
      confirmedWithWaiter: true,
      customerConfirmed: true,
      customerConfirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      date: 'Just now'
    };

    const updatedOrders = addStoredOrder(newOrder);
    if (updatedOrders) {
      setOrdersList(updatedOrders);
    }

    setSelectedList([]);
    pendingUnconfirmedItemRef.current = null;
    setIsAutoConfirmPopupOpen(false);

    setOrderConfirmationSuccess(true);
    setTimeout(() => setOrderConfirmationSuccess(false), 5000);
  };

  const handleDismissAutoPopup = () => {
    setIsAutoConfirmPopupOpen(false);
  };

  // Add Item to Cart
  const handleAddToCart = () => {
    const portionsToAdd = hasCustomPortions && selectedPortions.length > 0
      ? selectedPortions.map(sp => {
          const pObj = activeFood?.customizable?.portions?.[sp.idx];
          const pSelling = pObj?.price !== undefined
            ? Number(pObj.price)
            : ((Number(activeFood?.price) || 0) + (Number(pObj?.extra) || 0));
          return {
            name: pObj?.name || 'Standard',
            quantity: sp.quantity || 1,
            unitPrice: pSelling,
            totalPrice: pSelling * (sp.quantity || 1)
          };
        })
      : [{
          name: 'Standard',
          quantity: customQuantity,
          unitPrice: currentPortionPrice,
          totalPrice: currentPortionPrice * customQuantity
        }];

    const portionSummaryText = portionsToAdd.map(p => `${p.name} (x${p.quantity})`).join(', ');

    const newItem = {
      cartId: `${activeFood.id}-${Date.now()}`,
      foodId: activeFood.id,
      title: activeFood.title,
      image: activeFood.image,
      isPng: activeFood.isPng,
      portion: portionSummaryText,
      portions: portionsToAdd,
      portionQuantity: portionsToAdd.reduce((sum, p) => sum + p.quantity, 0),
      spice: activeFood.customizable?.spiceLevels?.[selectedSpice] || 'Standard',
      addons: selectedAddons.map(a => ({ ...a, quantity: a.quantity || 1 })),
      unitPrice: currentItemTotalPrice,
      quantity: 1,
      totalPrice: currentItemTotalPrice,
      instructions: specialInstructions
    };

    setCart(prev => [...prev, newItem]);
    setIsCustomizeOpen(false);
    setSelectedPortion(0);
    setSelectedPortions([{ idx: 0, quantity: 1 }]);
    setCustomQuantity(1);
    setSelectedAddons([]);
    setSpecialInstructions('');
  };

  // Modify Cart Item Quantity
  const updateCartItemQuantity = (cartId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        return {
          ...item,
          quantity: newQty,
          totalPrice: item.unitPrice * newQty
        };
      }
      return item;
    }).filter(Boolean));
  };

  const removeCartItem = (cartId) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  // Cart Financials with dynamic VAT & Service Charge
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = !isVatActive ? 0 : (
    vatType === 'flat' ? vatRate : (subtotal * (vatRate / 100))
  );
  const serviceFee = !isServiceChargeActive ? 0 : (
    serviceChargeType === 'flat' ? serviceChargeRate : (subtotal * (serviceChargeRate / 100))
  );
  const grandTotal = Math.round(Math.max(0, subtotal + tax + serviceFee));
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Category Selection from Menu
  const selectCategoryFromMenu = (catName) => {
    setSelectedFeaturedDish(null);
    setActiveCategory(catName);
    setCurrentIndex(0);
    setIsMenuOpen(false);
  };

  // Jump directly to an offer from the carousel (Apply Featured Promo discount & isolate on home stage)
  const selectOfferFromCarousel = (offer) => {
    if (isSwiping.current) return; // Prevent selection if user was swiping
    setIsCarouselHovered(false);
    setIsCarouselPressed(false);
    const targetFoodId = offer.foodId || offer.food_id || offer.id;
    const targetFood = foodsList.find(f => String(f.id) === String(targetFoodId)) ||
                       foodsList.find(f => f.title?.toLowerCase() === offer.title?.toLowerCase());

    if (targetFood) {
      const promoPrice = offer.price !== undefined && offer.price !== '' ? Number(offer.price) : targetFood.price;
      const originalPrice = Number(targetFood.oldPrice || targetFood.price || 0);

      // Calculate discount ratio from original to promo price
      const discountRatio = originalPrice > promoPrice && originalPrice > 0
        ? (originalPrice - promoPrice) / originalPrice
        : 0;

      // Deeply update portions so the promotional discount is applied to the portions list in the customization modal!
      let promoCustomizable = targetFood.customizable ? { ...targetFood.customizable } : undefined;
      if (promoCustomizable?.portions && promoCustomizable.portions.length > 0) {
        promoCustomizable.portions = promoCustomizable.portions.map((p, idx) => {
          const pOriginal = Number(p.oldPrice || p.regularPrice || p.price || (originalPrice + Number(p.extra || 0)));
          let pSelling;
          if (idx === 0) {
            // First/base portion directly matches the promo price set in the slider wizard
            pSelling = promoPrice;
          } else {
            // Subsequent portion sizes receive proportional promotional discount
            if (discountRatio > 0) {
              pSelling = Math.round(pOriginal * (1 - discountRatio));
            } else {
              pSelling = p.price !== undefined ? Number(p.price) : (promoPrice + Number(p.extra || 0));
            }
          }
          return {
            ...p,
            price: pSelling,
            oldPrice: pOriginal > pSelling ? pOriginal : (p.oldPrice || pOriginal),
            extra: Math.max(0, pSelling - promoPrice)
          };
        });
      }

      const promoFood = {
        ...targetFood,
        price: promoPrice,
        oldPrice: originalPrice > promoPrice ? originalPrice : (targetFood.oldPrice || originalPrice),
        tag: targetFood.tag || 'Best Selling', // Preserves ONLY the food's own promotional tag from Menu Builder
        customizable: promoCustomizable
      };

      setSelectedPortion(0);
      setSelectedFeaturedDish(promoFood);
    }
    setIsMenuOpen(false);
  };

  // Confirm Order Execution
  const handleConfirmOrder = () => {
    setCheckoutStep('processing');
    const orderIdNum = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrderRecord = {
      id: `ord_${Date.now()}`,
      orderNumber: orderIdNum,
      tableNumber,
      customerName: customerName.trim() || 'Guest Customer',
      customerPhone: customerPhone.trim() || '',
      diningMode,
      items: cart.map(item => ({
        title: item.title,
        portion: item.portion?.name || 'Standard',
        quantity: item.quantity,
        price: item.totalPrice
      })),
      subtotal,
      vat: tax,
      serviceFee,
      totalAmount: grandTotal,
      paymentMethod: paymentMethod === 'bkash' ? 'bKash' : paymentMethod === 'nagad' ? 'Nagad' : paymentMethod === 'card' ? 'Credit Card' : 'Cash',
      paymentStatus: paymentMethod === 'cash' ? 'unpaid' : 'paid',
      orderStatus: 'pending',
      createdAt: new Date().toISOString(),
      displayTime: 'Just now'
    };

    setTimeout(() => {
      const updatedOrders = addStoredOrder(newOrderRecord);
      setOrdersList(updatedOrders);
      setPaymentsList(getStoredPayments());

      setPlacedOrderDetails({
        orderId: orderIdNum,
        items: [...cart],
        diningMode,
        tableNumber: diningMode === 'dine-in' ? tableNumber : null,
        total: formatPrice(grandTotal),
        payment: paymentMethod,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        prepEst: '15-20 Mins'
      });
      setCart([]);
      setCheckoutStep('success');
    }, 1000);
  };

  // Helper to map icons to category names
  const getCategoryIcon = (catName) => {
    switch (catName) {
      case 'All Items':
      case 'All': return Sparkles;
      case 'Main Course': return Utensils;
      case 'Appetizers': return Pizza;
      case 'Beverages': return Coffee;
      case 'Dessert': return Dessert;
      default: return Utensils;
    }
  };

  const dynamicCategories = useMemo(() => {
    // Primary Category: 'All Items' is always the first category across all restaurants
    const restCategories = Array.from(new Set(categoriesList)).filter(
      c => Boolean(c) && c !== 'All' && c !== 'All Items'
    );
    return ['All Items', ...restCategories].map(name => ({
      name,
      icon: getCategoryIcon(name)
    }));
  }, [categoriesList]);

  // ========================================================
  // SUPER ADMIN MASTER SAAS PLATFORM VIEW
  // Accessed via Domain/superadmin or http://localhost:5173/superadmin
  // ========================================================
  if (currentView === 'superadmin') {
    if (!isSuperAdminAuthenticated) {
      return (
        <SuperAdminLogin
          onLoginSuccess={() => {
            setIsSuperAdminAuthenticated(true);
            setSuperAdminAuthSession(true);
          }}
          onBackToMenu={navigateToMenu}
          onGoToRestaurantPortal={navigateToAdmin}
        />
      );
    }

    return (
      <SuperAdminPanel
        onLogout={() => {
          setIsSuperAdminAuthenticated(false);
          setSuperAdminAuthSession(false);
          setCurrentView('superadmin');
        }}
        onGoToCustomerMenu={navigateToMenu}
        onGoToRestaurantPortal={navigateToAdmin}
      />
    );
  }

  if (currentView === 'admin') {
    if (!isAdminAuthenticated) {
      return (
        <RestaurantLogin
          onLoginSuccess={() => {
            setIsAdminAuthenticated(true);
            setAdminAuthSession(true);
          }}
          onBackToMenu={navigateToMenu}
        />
      );
    }

    return (
      <RestaurantPanel
        foods={foodsList}
        categories={categoriesList}
        subcategories={subcategoriesList}
        featuredSliders={featuredSliders}
        orders={ordersList}
        payments={paymentsList}
        restaurantProfile={restaurantProfile}
        tickets={ticketsList}
        chatMessages={chatMessagesList}
        superAdminConfig={superAdminConfig}
        onAddFood={handleAddFoodFromPanel}
        onDeleteFood={handleDeleteFoodFromPanel}
        onToggleFoodStatus={handleToggleFoodStatus}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onUpdateCategory={handleUpdateCategory}
        onAddSubcategory={handleAddSubcategory}
        onUpdateSubcategory={handleUpdateSubcategory}
        onDeleteSubcategory={handleDeleteSubcategory}
        onAddFeaturedSlider={handleAddFeaturedSlider}
        onDeleteFeaturedSlider={handleDeleteFeaturedSlider}
        onToggleFeaturedSlider={handleToggleFeaturedSlider}
        onBroadcastSliderNotification={handleBroadcastSliderNotification}
        onSaveRestaurantProfile={handleSaveRestaurantProfile}
        onAddTicket={handleAddTicket}
        onSendMessage={handleSendMessage}
        onUpdateSuperAdminConfig={handleUpdateSuperAdminConfig}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onBackToMenu={navigateToMenu}
        onLogout={() => {
          setIsAdminAuthenticated(false);
          setAdminAuthSession(false);
          setCurrentView('admin');
        }}
      />
    );
  }

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#06080D] font-sans text-slate-100 flex flex-col select-none touch-none">

      {/* ======================================================== */}
      {/* 1. AR HOLOGRAM AMBIENT BACKGROUND                        */}
      {/* ======================================================== */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Soft radial reflection matching active food */}
        <div
          className="absolute inset-0 transition-all duration-1000 ease-out opacity-35"
          style={{
            background: `radial-gradient(circle at 50% 38%, ${activeFood.ambientGlow} 0%, rgba(6, 8, 13, 0.98) 72%)`
          }}
        />

        {/* Ambient floating light orbs */}
        <div
          className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-[100px] transition-all duration-1000 opacity-40"
          style={{ background: activeFood.ambientGlow }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[120px] transition-all duration-1000 opacity-30"
          style={{ background: activeFood.ambientGlow }}
        />
      </div>

      {/* ======================================================== */}
      {/* 2. TOP APP HEADER (RestaurantHeader Component)           */}
      {/* ======================================================== */}
      <div className="relative z-40 w-full max-w-xl mx-auto px-3 sm:px-4 pt-3 sm:pt-3.5 shrink-0">
        <RestaurantHeader
          name={restaurantProfile?.name || 'Moneky Bhai'}
          logoUrl={restaurantProfile?.logo || null}
          brand="24 DIGITAL"
          welcomeText="Welcome, Our Dear Guest"
          isFollowing={isFollowing}
          onFollow={handleFollowRestaurant}
          onMenuClick={() => setIsMenuOpen(true)}
          onLogoClick={navigateToAdmin}
          rightExtra={
            adminConfig.premiumFeatures.enableCartPage ? (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 rounded-full bg-[#120E09]/95 hover:bg-[#22180E] active:scale-95 border-2 border-slate-700/80 hover:border-[#F59E0B] text-white transition-all cursor-pointer shadow-md"
                aria-label="View Order Cart"
              >
                <ShoppingBag className="w-4 h-4 text-orange-400" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-extrabold text-[10px] flex items-center justify-center border border-[#06080D] shadow-md animate-bounce">
                    {totalCartCount}
                  </span>
                )}
              </button>
            ) : null
          }
        />
      </div>

      {/* ======================================================== */}
      {/* 3. 3D AR FLOATING & AUTO-ROTATING FOOD STAGE             */}
      {/* ======================================================== */}
      <main
        className="relative flex-1 w-full max-w-xl mx-auto flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
        style={{ perspective: '1200px' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Promotional Floating Badge (Top-Left of food stage) - Only when all portions have uniform discount */}
        {uniformDiscountBadge ? (
          <div className="absolute top-4.5 left-4 z-30 pointer-events-auto">
            <div className="animate-promo-glow px-3 py-1.5 rounded-2xl bg-gradient-to-r from-red-600/90 via-orange-600/90 to-amber-500/90 border border-white/30 text-white shadow-xl flex items-center gap-1.5 backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 animate-bounce" />
              <span className="text-[11px] font-black uppercase tracking-wider">
                {uniformDiscountBadge}
              </span>
              <span className="text-[10px] text-white/80 font-medium hidden sm:inline">• Limited Deal</span>
            </div>
          </div>
        ) : null}

        {/* Floating Sparkle Decorative Elements */}
        <div className="absolute top-1/4 left-10 pointer-events-none animate-sparkle-1 text-amber-300/60">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="absolute top-1/3 right-12 pointer-events-none animate-sparkle-2 text-orange-400/70">
          <Sparkles className="w-4 h-4" />
        </div>

        {/* Hologram Floating Container */}
        <div className="relative flex flex-col items-center justify-center animate-hologram-float pointer-events-none">

          {/* Hologram Table Projection Pedestal Ring */}
          <div
            className="absolute -bottom-10 w-72 sm:w-80 h-16 rounded-[100%] blur-[28px] animate-pedestal pointer-events-none transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse, ${activeFood?.ambientGlow || 'rgba(234, 88, 12, 0.45)'} 0%, transparent 75%)`
            }}
          />

          {/* Interactive 3D Rotation Canvas with Adaptive Zoom */}
          <div
            className="relative transition-transform duration-75 ease-linear flex items-center justify-center"
            style={{
              transform: `scale(${scale * imageAspectScale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Subtle soft backlight behind food */}
            <div
              className="absolute inset-0 m-auto w-72 h-72 sm:w-80 sm:h-80 rounded-full blur-[60px] opacity-45 pointer-events-none transition-all duration-700"
              style={{ background: activeFood?.ambientGlow || 'rgba(234, 88, 12, 0.45)' }}
            />

            {/* Food Image with authentic PNG transparency, depth shadow & live floating animation */}
            <div className="relative flex items-center justify-center">
              {/* Hot Food subtle steam shimmer effect */}
              {activeFood.category !== 'Beverages' && (
                <div className="absolute -top-12 w-48 h-28 bg-gradient-to-t from-white/15 to-transparent blur-xl pointer-events-none animate-steam" />
              )}

              <img
                src={activeFood.image}
                alt={activeFood.title}
                draggable="false"
                className="pointer-events-none select-none transition-all duration-300 w-80 h-80 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] max-w-[90vw] max-h-[46vh] object-contain drop-shadow-[0_32px_50px_rgba(0,0,0,0.92)] animate-food-live"
              />
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 4. CLEAN COMPACT FOOD TITLE & BOTTOM BAR                  */}
      {/* ======================================================== */}
      <footer className="relative z-40 w-full max-w-xl mx-auto px-4 pb-4 shrink-0 flex flex-col items-center">

        {/* Compact Food Card Trigger - Matching exact screenshot */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleOpenDetailSheet}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOpenDetailSheet();
            }
          }}
          className="w-full rounded-[20px] sm:rounded-[22px] bg-[#0c101c]/90 backdrop-blur-xl border border-white/10 hover:border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] px-5 py-4 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 transition-all duration-200 relative group select-none"
          aria-label={`View details for ${activeFood?.title}`}
        >
          {/* Row: Food Title on Left | (Strikethrough Old Price + Main Price) & Details > on Right */}
          <div className="flex items-center justify-between gap-3">
            {/* Left Column: Food Title (Wraps to 2 lines if long, category removed) */}
            <div className="min-w-0 flex-1 pr-2">
              <h2 className="text-white font-bold text-lg sm:text-[20px] tracking-tight leading-snug line-clamp-2">
                {activeFood.title}
              </h2>
            </div>

            {/* Right Column: Prices on top line, Details > below with generous gap */}
            <div className="shrink-0 flex flex-col items-end justify-center text-right">
              {/* Price Line: Strikethrough Discount/Old Price on the LEFT, Main Price on the RIGHT */}
              <div className="flex items-baseline justify-end gap-2 sm:gap-2.5">
                {currentPortionOldPrice && currentPortionOldPrice > currentPortionPrice ? (
                  <span className="text-sm sm:text-base text-slate-400/90 line-through tabular-nums font-medium leading-none">
                    {currency}{formatPrice(currentPortionOldPrice)}
                  </span>
                ) : null}
                <span className="text-[#F59E0B] font-bold text-2xl sm:text-[26px] tabular-nums leading-none tracking-tight">
                  {currency}{formatPrice(currentPortionPrice)}
                </span>
              </div>

              {/* Bottom Line: Details + Arrow with tight standard gap and flush right alignment */}
              <div className="flex items-center justify-end mt-2 sm:mt-2.5 -mr-0.5">
                <span className="text-sm sm:text-[14.5px] font-semibold text-white/90 group-hover:text-amber-400 inline-flex items-center gap-0.5 transition-colors leading-none">
                  <span>Details</span>
                  <ChevronRight className="w-4 h-4 stroke-[2.4] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BOTTOM ACTION BAR: <  [ VIEW SELECTED ITEMS ]  >        */}
        {/* ======================================================== */}
        <div className="w-full flex items-center justify-between gap-2.5 sm:gap-3 pt-3">
          {/* Previous Food */}
          <button
            onClick={handlePrevFood}
            className="p-3.5 rounded-2xl hologram-glass hover:bg-white/15 active:scale-90 text-white transition-all cursor-pointer shrink-0"
            aria-label="Previous Dish"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Center Box: VIEW SELECTED ITEMS Button - True Centered with Right Arrow */}
          <button
            onClick={() => setIsSelectedListOpen(true)}
            className={`flex-1 py-3.5 px-8 sm:px-10 rounded-2xl border relative flex items-center justify-center cursor-pointer active:scale-[0.98] transition-all group select-none ${
              selectedList.length > 0
                ? 'cta-order-btn border-white/20 text-white shadow-[0_8px_22px_rgba(234,88,12,0.45)]'
                : 'hologram-glass border-white/10 text-white/80 hover:text-white hover:border-white/20'
            }`}
            aria-label="View Selected Items"
          >
            {/* True Centered Content: Checklist Icon + Title & Counter */}
            <div className="flex items-center justify-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-5 h-5 flex items-center justify-center shrink-0 text-white">
                <svg className="w-4 h-4 stroke-[2.4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 17 2 2 4-4" />
                  <path d="m3 7 2 2 4-4" />
                  <path d="M13 6h8" />
                  <path d="M13 12h8" />
                  <path d="M13 18h8" />
                </svg>
              </div>

              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider truncate text-white">
                VIEW SELECTED ITEMS ({selectedListCount})
              </span>
            </div>

            {/* Right Chevron: Anchored to the right side */}
            <div className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform stroke-[2.5]" />
            </div>
          </button>

          {/* Next Food */}
          <button
            onClick={handleNextFood}
            className="p-3.5 rounded-2xl hologram-glass hover:bg-white/15 active:scale-90 text-white transition-all cursor-pointer shrink-0"
            aria-label="Next Dish"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 4.1 PRODUCT CUSTOMIZATION & DETAILS MODAL                 */}
      {/* 100% Clean, Premium & Spacious Glassmorphism (Not full page) */}
      {/* ======================================================== */}
      {isDetailSheetOpen && (
        <div
          onClick={handleCloseDetailSheetWithoutAdd}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/65 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl mx-auto h-[88vh] sm:h-[86vh] max-h-[92vh] glass-sheet rounded-t-[32px] sm:rounded-[36px] px-5 sm:px-6 pt-3.5 pb-3 sm:pt-4 sm:pb-4 flex flex-col overflow-hidden animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] relative border-t sm:border border-[#F59E0B]/30 shadow-[0_0_60px_rgba(0,0,0,0.85)]"
          >
            {/* Top Sheet Drag Handle & Close */}
            <div className="flex items-center justify-between pb-2 shrink-0">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mr-8" />
              <button
                onClick={handleCloseDetailSheetWithoutAdd}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white transition-all cursor-pointer"
                aria-label="Close details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Header: Title, Category & Description */}
            <div className="pt-1 sm:pt-1.5 pb-3 border-b border-white/10 shrink-0">
              <div className="mb-3 sm:mb-3.5">
                <h2 className="text-white font-black text-xl sm:text-2xl tracking-tight leading-tight">
                  {activeFood.title}
                </h2>
              </div>
              <div className="flex items-center gap-2.5 mb-2">
                {/* TOP RATED / Tag Badge with increased height & luminous border glow */}
                <span className="px-3 py-1 sm:px-3.5 sm:py-1 rounded-full bg-[#F59E0B]/15 border-2 border-[#F59E0B] text-[#F59E0B] text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-[0_0_14px_rgba(245,158,11,0.5),inset_0_0_8px_rgba(245,158,11,0.25)] flex items-center justify-center shrink-0">
                  {activeFood.tag}
                </span>

                {/* Category Text with increased font size */}
                <span className="text-xs sm:text-[13px] text-slate-300 font-semibold tracking-wide">
                  {activeFood.category}
                </span>

                {/* Rating with formatted Review Count (k for thousands, M for 10 lakh+) */}
                <span className="text-xs sm:text-[13px] text-[#F59E0B] font-bold flex items-center gap-1 shrink-0">
                  <Star className="w-3.5 h-3.5 fill-[#F59E0B]" />
                  <span>{activeFood.rating?.toFixed(1) || '4.9'}</span>
                  <span className="text-slate-400 font-medium text-[11px] sm:text-xs ml-0.5">
                    ({formatReviewCount(activeFood.ratingCount || activeFood.reviewsCount || activeFood.reviews || (activeFood.id ? (activeFood.id * 540 + 1200) : 1240))})
                  </span>
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-normal">
                {activeFood.description}
              </p>
            </div>

            {/* Scrollable Customization Body with Spacious Height */}
            <div
              ref={detailScrollContainerRef}
              className="flex-1 min-h-0 overflow-y-auto pt-3 pb-0 space-y-4 pr-1 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >

              {/* 1. CHOOSE PORTIONS */}
              {adminConfig.breakdown.enablePortions && activeFood.customizable?.portions && (
                <div>
                  <h3 className="text-[11px] font-extrabold tracking-widest uppercase text-[#F59E0B] mb-2.5">
                    CHOOSE PORTIONS
                  </h3>
                  <div className="space-y-2.5">
                    {activeFood.customizable.portions.map((portion, idx) => {
                      const selectedItem = selectedPortions.find(p => p.idx === idx);
                      const isSelected = Boolean(selectedItem);
                      const portionQty = selectedItem?.quantity || 1;
                      const isQtyVisible = Boolean(visibleQtyItems[`portion-${idx}`]);

                      const pSellingPrice = portion.price !== undefined
                        ? Number(portion.price)
                        : ((Number(activeFood?.price) || 0) + (Number(portion.extra) || 0));
                      const pOldPrice = portion.oldPrice !== undefined
                        ? Number(portion.oldPrice)
                        : (activeFood?.oldPrice ? (Number(activeFood.oldPrice) + (Number(portion.extra) || 0)) : undefined);

                      return (
                        <div
                          key={idx}
                          onClick={() => togglePortion(idx)}
                          className={`w-full py-4 sm:py-4.5 px-4 sm:px-5 min-h-[58px] sm:min-h-[64px] rounded-2xl flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'glass-row-selected' : 'glass-row'
                            }`}
                        >
                          {/* Checkbox style box & Title with increased font size */}
                          <div className="flex items-center gap-3.5 min-w-0 pr-2">
                            <div
                              onClick={(e) => {
                                if (isSelected) {
                                  e.stopPropagation();
                                  unselectPortion(idx);
                                }
                              }}
                              className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-all ${isSelected ? 'border-[#F59E0B] bg-[#F59E0B]' : 'border-slate-500'
                                }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                            </div>
                            <span className={`text-[15px] sm:text-base font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {portion.name}
                            </span>
                          </div>

                          {/* Right Side: Quantity Counter & Price with increased digit size */}
                          <div className="flex items-center gap-3 shrink-0">
                            {isSelected && isQtyVisible && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 bg-black/60 border border-[#F59E0B]/60 rounded-xl px-2 py-1 shadow-md animate-[fadeIn_0.15s_ease-out]"
                              >
                                <button
                                  onClick={() => updatePortionQuantity(idx, -1)}
                                  className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer"
                                  aria-label="Decrease portion quantity"
                                >
                                  <Minus className="w-3.5 h-3.5 text-white" />
                                </button>
                                <span className="text-sm font-black text-white min-w-4 text-center tabular-nums">
                                  {portionQty}
                                </span>
                                <button
                                  onClick={() => updatePortionQuantity(idx, 1)}
                                  className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer"
                                  aria-label="Increase portion quantity"
                                >
                                  <Plus className="w-3.5 h-3.5 text-white" />
                                </button>
                              </div>
                            )}

                            {isSelected && !isQtyVisible && portionQty > 1 && (
                              <span className="text-xs font-black text-[#F59E0B] bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2 py-0.5 rounded-md">
                                ×{portionQty}
                              </span>
                            )}

                            {/* Product Price & Discount Display (Increased Digit Size) */}
                            <div className="flex items-center gap-2 text-right">
                              <span className={`text-base sm:text-lg font-black tabular-nums ${isSelected ? 'text-[#F59E0B]' : 'text-slate-200'}`}>
                                {currency}{formatPrice(pSellingPrice * (isSelected ? portionQty : 1))}
                              </span>
                              {pOldPrice && pOldPrice > pSellingPrice && (
                                <span className="text-xs sm:text-sm text-slate-400/70 line-through tabular-nums">
                                  {currency}{formatPrice(pOldPrice * (isSelected ? portionQty : 1))}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. CHOOSE EXTRA ADDON'S */}
              {adminConfig.breakdown.enableAddons && activeFood.customizable?.addons && activeFood.customizable.addons.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-extrabold tracking-widest uppercase text-[#F59E0B] mb-2.5">
                    CHOOSE EXTRA ADDON'S
                  </h3>
                  <div className="space-y-2.5">
                    {activeFood.customizable.addons.map((addon) => {
                      const selectedAddonItem = selectedAddons.find(a => a.id === addon.id);
                      const isSelected = Boolean(selectedAddonItem);
                      const addonQty = selectedAddonItem?.quantity || 1;
                      const isQtyVisible = Boolean(visibleQtyItems[`addon-${addon.id}`]);

                      return (
                        <div
                          key={addon.id}
                          onClick={() => toggleAddon(addon)}
                          className={`w-full py-4 sm:py-4.5 px-4 sm:px-5 min-h-[58px] sm:min-h-[64px] rounded-2xl flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'glass-row-selected' : 'glass-row'
                            }`}
                        >
                          {/* Checkbox style box & Title with increased font size */}
                          <div className="flex items-center gap-3.5 min-w-0 pr-2">
                            <div
                              onClick={(e) => {
                                if (isSelected) {
                                  e.stopPropagation();
                                  unselectAddon(addon.id);
                                }
                              }}
                              className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-all ${isSelected ? 'border-[#F59E0B] bg-[#F59E0B]' : 'border-slate-500'
                                }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                            </div>
                            <span className={`text-[15px] sm:text-base font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {addon.name}
                            </span>
                          </div>

                          {/* Right Side: Quantity Counter & Price Tag (Increased Digit Size) */}
                          <div className="flex items-center gap-3 shrink-0">
                            {isSelected && isQtyVisible && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 bg-black/60 border border-[#F59E0B]/60 rounded-xl px-2 py-1 shadow-md animate-[fadeIn_0.15s_ease-out]"
                              >
                                <button
                                  onClick={() => updateAddonQuantity(addon.id, -1)}
                                  className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer"
                                  aria-label="Decrease addon quantity"
                                >
                                  <Minus className="w-3.5 h-3.5 text-white" />
                                </button>
                                <span className="text-sm font-black text-white min-w-4 text-center tabular-nums">
                                  {addonQty}
                                </span>
                                <button
                                  onClick={() => updateAddonQuantity(addon.id, 1)}
                                  className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer"
                                  aria-label="Increase addon quantity"
                                >
                                  <Plus className="w-3.5 h-3.5 text-white" />
                                </button>
                              </div>
                            )}

                            {isSelected && !isQtyVisible && addonQty > 1 && (
                              <span className="text-xs font-black text-[#F59E0B] bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2 py-0.5 rounded-md">
                                ×{addonQty}
                              </span>
                            )}

                            {/* Price Tag with larger digit */}
                            <span className={`text-base sm:text-lg font-black tabular-nums ${isSelected ? 'text-[#F59E0B]' : 'text-slate-300'}`}>
                              +{currency}{formatPrice(addon.price * (isSelected ? addonQty : 1))}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Explicit 18px Guaranteed Free Space below the last selection box */}
              <div className="h-[18px] shrink-0" aria-hidden="true" />
            </div>

            {/* Bottom Action Bar: Divider Line + Left: Item Total amount & Price, Right: (+) ADD TO LIST Button */}
            <div className="pt-3.5 pb-2 border-t border-white/10 shrink-0 flex items-center justify-between gap-4">
              {/* Left Side: Item Total amount & Digit with Currency */}
              <div className="flex flex-col justify-center min-w-0">
                <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-slate-400">
                  Item Total amount
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#F59E0B] tracking-tight tabular-nums leading-tight">
                  {currency}{formatPrice(currentItemTotalPrice)}
                </span>
              </div>

              {/* Right Side: Solid Profile Color (#f59e0b) (+) ADD TO LIST / UPDATE YOUR LIST Button */}
              <button
                onClick={handleAddToListFromDetail}
                disabled={hasCustomPortions && selectedPortions.length === 0}
                className={`px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-black text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-lg cursor-pointer shrink-0 ${
                  hasCustomPortions && selectedPortions.length === 0
                    ? 'bg-white/20 text-slate-400 cursor-not-allowed border border-white/10'
                    : 'bg-[#F59E0B] hover:bg-[#d97706] active:scale-95 text-black shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                }`}
                aria-label={isItemAlreadyInList ? 'Update Your List' : 'Add to List'}
              >
                {/* Circular Action Icon */}
                <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center shrink-0">
                  {isItemAlreadyInList ? (
                    <RefreshCw className="w-3.5 h-3.5 text-black stroke-[2.8]" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-black stroke-[3]" />
                  )}
                </div>
                <span className="tracking-wider uppercase font-black">
                  {isItemAlreadyInList ? 'UPDATE YOUR LIST' : 'ADD TO LIST'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add to List Toast Feedback */}
      {addToListToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-[#141d2e]/95 border border-[#F59E0B]/50 text-white px-5 py-3 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl flex items-center gap-3 animate-[slideDown_0.25s_ease-out]">
          <div className="w-7 h-7 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/50 flex items-center justify-center text-[#F59E0B] shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-100">{addToListToast}</span>
        </div>
      )}

      {/* Order Confirmed Success Popup */}
      {orderConfirmationSuccess && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="max-w-md w-full bg-[#0d1424]/95 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-[0_0_60px_rgba(16,185,129,0.2)] animate-[scaleUp_0.25s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-white font-black text-xl tracking-tight">Order Confirmed!</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Thank you! Your order confirmation has been noted by the restaurant for {tableNumber || 'Table 04'}. The waiter will serve your food shortly.
              </p>
            </div>
            <button
              onClick={() => setOrderConfirmationSuccess(false)}
              className="w-full py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-extrabold text-sm transition-all shadow-lg cursor-pointer"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4.15 MANDATORY ORDER CONFIRMATION POPUP (CANNOT BE DISMISSED OUTSIDE) */}
      {/* Matches reference screenshot media_1794458766645_e708b220.jpg */}
      {/* ======================================================== */}
      {isAutoConfirmPopupOpen && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-[fadeIn_0.2s_ease-out] select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm sm:max-w-md bg-[#121826]/95 border border-white/10 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] animate-[scaleUp_0.25s_cubic-bezier(0.16,1,0.3,1)] space-y-4 relative"
          >
            {/* Header: Cloche Plate Icon + Text */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v2" />
                  <path d="M4 18h16" />
                  <path d="M4 18c0-4.418 3.582-8 8-8s8 3.582 8 8" />
                  <path d="M2 20h20" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-white font-bold text-lg sm:text-xl tracking-tight leading-snug">
                  {autoConfirmSource === 'customization'
                    ? 'Have you ordered this item with the waiter?'
                    : (selectedList.length > 1
                        ? 'Have you ordered these items with the waiter?'
                        : 'Have you ordered this item with the waiter?')}
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-300/80 font-normal leading-relaxed">
                  Please tap an answer below. Your response helps us improve PhoneMenu for everyone! 😊
                </p>
              </div>
            </div>

            {/* Buttons: Yes, I ordered (White) & Not yet — Keep browsing (Glass Dark) */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleConfirmOrderFromAutoPopup}
                className="w-full py-3.5 px-6 rounded-full bg-white hover:bg-slate-100 active:scale-[0.98] text-black font-bold text-sm sm:text-base tracking-normal flex items-center justify-center gap-2.5 shadow-[0_4px_25px_rgba(255,255,255,0.2)] cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-5 h-5 text-black stroke-[2.5]" />
                <span>Yes, I ordered</span>
              </button>

              <button
                onClick={handleDismissAutoPopup}
                className="w-full py-3 px-6 rounded-full bg-white/[0.05] hover:bg-white/10 active:scale-[0.98] border border-white/15 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RotateCcw className="w-4 h-4 text-white" />
                <span>Not yet — Keep browsing</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4.2 YOUR SELECTED ITEMS MODAL (PREVIOUS TRUE GLASSMORPHISM) */}
      {/* Refined with 'YES, I ORDERED' White Button & Dividers     */}
      {/* ======================================================== */}
      {isSelectedListOpen && (
        <div
          onClick={handleCloseSelectedListWithoutConfirm}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass-sheet rounded-3xl sm:rounded-[36px] p-5 sm:p-6 flex flex-col max-h-[92vh] overflow-hidden animate-[scaleUp_0.25s_cubic-bezier(0.16,1,0.3,1)] relative border border-[#F59E0B]/30 shadow-[0_0_50px_rgba(245,158,11,0.18)]"
          >
            {/* Top Header: Previous Signature Glassmorphic Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]">
                  <svg className="w-5 h-5 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 17 2 2 4-4" />
                    <path d="m3 7 2 2 4-4" />
                    <path d="M13 6h8" />
                    <path d="M13 12h8" />
                    <path d="M13 18h8" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-black text-lg sm:text-xl tracking-tight leading-tight">
                    Selected Food Items
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {selectedList.length} dish{selectedList.length !== 1 ? 'es' : ''} in your list
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseSelectedListWithoutConfirm}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Container with List Cards, Live Price Summary & Order Confirmation */}
            <div
              ref={selectedListScrollContainerRef}
              className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 no-scrollbar [scrollbar-width:none]"
            >
              {selectedList.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                    <Utensils className="w-7 h-7 stroke-[1.5]" />
                  </div>
                  <p className="text-white font-bold text-sm">No items selected yet</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Browse our digital menu and tap "+ ADD TO LIST" on any food item to add it here.
                  </p>
                  <button
                    onClick={handleDismissSelectedListWithoutPopup}
                    className="mt-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. Food Cards List (Detailed Sublist Breakdown Design) */}
                  <div className="space-y-3">
                    {selectedList.map((item) => {
                      const normalizedAddons = Array.isArray(item.addons) ? item.addons : [];
                      const hasAddons = normalizedAddons.length > 0;
                      const addonsSum = normalizedAddons.reduce(
                        (sum, a) => sum + (Number(a.price) || 0) * (a.quantity || 1),
                        0
                      );
                      const normalizedPortions =
                        Array.isArray(item.portions) && item.portions.length > 0
                          ? item.portions
                          : [
                              {
                                name: item.portion || 'Standard Portion',
                                quantity: 1,
                                totalPrice: Math.max(0, (Number(item.totalPrice) || 0) - addonsSum)
                              }
                            ];

                      const sublistSections = [
                        {
                          key: 'portion',
                          label: 'PORTION',
                          isFirst: true,
                          isFinal: !hasAddons,
                          rows: normalizedPortions.map((p, idx) => {
                            const qty = p.quantity || 1;
                            const price =
                              p.totalPrice !== undefined
                                ? Number(p.totalPrice)
                                : Number(p.unitPrice || 0) * qty;
                            return {
                              rowKey: `p-${idx}`,
                              name: p.name,
                              qty,
                              priceText: `${currency}${formatPrice(price)}`
                            };
                          })
                        },
                        ...(hasAddons
                          ? [
                              {
                                key: 'addons',
                                label: 'EXTRA ADD-ONS',
                                isFirst: false,
                                isFinal: true,
                                rows: normalizedAddons.map((addon, idx) => {
                                  const qty = addon.quantity || 1;
                                  const price = (Number(addon.price) || 0) * qty;
                                  return {
                                    rowKey: addon.id || `a-${idx}`,
                                    name: addon.name,
                                    qty,
                                    priceText: `+${currency}${formatPrice(price)}`
                                  };
                                })
                              }
                            ]
                          : [])
                      ];

                      return (
                        <div
                          key={item.cartId}
                          className="p-4 sm:p-5 rounded-2xl bg-[#11131b]/95 border border-white/10 hover:border-white/20 transition-all shadow-md"
                        >
                          {/* Top Row: Thumbnail + Full Item Name (No Truncation) + Delete Button */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-xl object-contain bg-[#090b10] border border-white/10 p-1 shrink-0"
                              />
                              <h4 className="text-white font-extrabold text-base sm:text-[17px] leading-snug whitespace-normal break-words">
                                {item.title}
                              </h4>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeSelectedListItem(item.cartId)}
                              className="p-1.5 -mr-1 -mt-0.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all cursor-pointer shrink-0"
                              aria-label="Remove item"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                            </button>
                          </div>

                          {/* Middle Sublist: Portion & Extra Add-ons Timeline */}
                          <div className="mt-3.5 ml-2 sm:ml-2.5">
                            {sublistSections.map((section) => (
                              <React.Fragment key={section.key}>
                                <div className="flex items-stretch gap-2.5">
                                  <div className="w-5 relative shrink-0" aria-hidden="true">
                                    <span
                                      className={`absolute left-1/2 -translate-x-1/2 ${
                                        section.isFirst ? 'top-0.5' : 'top-0'
                                      } bottom-0 border-l-[1.5px] border-dashed border-[#F59E0B]/45`}
                                    />
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 leading-none ${
                                      section.isFirst ? 'pb-1.5' : 'pt-2.5 pb-1.5'
                                    }`}
                                  >
                                    {section.label}
                                  </span>
                                </div>

                                {section.rows.map((row, rIdx) => {
                                  const isLastOverallDot =
                                    section.isFinal && rIdx === section.rows.length - 1;

                                  return (
                                    <div key={row.rowKey} className="flex items-stretch gap-2.5">
                                      <div
                                        className="w-5 relative shrink-0 flex items-center justify-center"
                                        aria-hidden="true"
                                      >
                                        <span
                                          className={`absolute left-1/2 -translate-x-1/2 top-0 ${
                                            isLastOverallDot ? 'h-1/2' : 'bottom-0'
                                          } border-l-[1.5px] border-dashed border-[#F59E0B]/45`}
                                        />
                                        <span className="relative z-10 w-2.5 h-2.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.45)] shrink-0" />
                                      </div>
                                      <div className="flex-1 min-w-0 flex items-baseline justify-between gap-3 py-0.5">
                                        <span className="text-[13.5px] sm:text-[14.5px] font-semibold text-white/95 leading-snug whitespace-normal break-words">
                                          {row.name}
                                          {row.qty > 1 ? (
                                            <span className="text-[#F59E0B] font-bold text-xs ml-1.5">
                                              ×{row.qty}
                                            </span>
                                          ) : null}
                                        </span>
                                        <span className="text-[13.5px] sm:text-[14.5px] font-bold text-white tabular-nums shrink-0">
                                          {row.priceText}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            ))}
                          </div>

                          {/* Bottom Divider + Quantity Pill & Item Total */}
                          <div className="border-t border-white/10 mt-3.5 pt-3.5 flex items-center justify-between gap-3">
                            <div className="inline-flex items-center bg-[#090b10]/90 border border-white/15 rounded-full px-1.5 py-1 gap-2 sm:gap-3 shadow-inner">
                              <button
                                type="button"
                                onClick={() => updateSelectedListItemQuantity(item.cartId, -1)}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/10 active:scale-90 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                              </button>
                              <span className="text-sm sm:text-[15px] font-extrabold text-white min-w-4 text-center tabular-nums">
                                {item.quantity || 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateSelectedListItemQuantity(item.cartId, 1)}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/10 active:scale-90 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                              </button>
                            </div>

                            <div className="w-[1px] h-7 bg-white/15 shrink-0" aria-hidden="true" />

                            <div className="text-right shrink-0">
                              <span className="block text-[11px] font-medium text-slate-400 leading-tight">
                                Item total
                              </span>
                              <span className="block text-base sm:text-lg font-black text-[#F59E0B] tabular-nums leading-tight mt-0.5">
                                {currency}
                                {formatPrice((Number(item.totalPrice) || 0) * (item.quantity || 1))}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2. Live Price Summary Card with Dividers between each item */}
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5 text-xs sm:text-sm shadow-md">
                    <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                      <Receipt className="w-4 h-4 text-[#F59E0B]" />
                      <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#F59E0B]">
                        Live Price Summary
                      </span>
                    </div>

                    {/* Subtotal */}
                    <div className="flex justify-between items-center text-slate-300 py-0.5">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-bold text-white tabular-nums">{currency}{formatPrice(selectedListSubtotal)}</span>
                    </div>

                    {/* Divider Line between Subtotal and VAT */}
                    <div className="border-t border-white/10 my-1" />

                    {/* VAT */}
                    {isVatActive && (
                      <>
                        <div className="flex justify-between items-center text-slate-300 py-0.5">
                          <span className="font-medium">VAT ({vatType === 'percentage' ? `${vatRate}%` : `Flat ${currency}${formatPrice(vatRate)}`})</span>
                          <span className="tabular-nums font-bold text-white">{currency}{formatPrice(selectedListVat)}</span>
                        </div>
                        {/* Divider Line between VAT and Table Service Charge */}
                        <div className="border-t border-white/10 my-1" />
                      </>
                    )}

                    {/* Table Service Charge */}
                    {isServiceChargeActive && (
                      <>
                        <div className="flex justify-between items-center text-slate-300 py-0.5">
                          <span className="font-medium">Table Service Charge ({serviceChargeType === 'percentage' ? `${serviceChargeRate}%` : `${currency}${formatPrice(serviceChargeRate)}`})</span>
                          <span className="tabular-nums font-bold text-white">{currency}{formatPrice(selectedListServiceFee)}</span>
                        </div>
                        {/* Divider Line before Grand Total */}
                        <div className="border-t border-white/10 my-1" />
                      </>
                    )}

                    {/* Grand Total Price */}
                    <div className="flex justify-between items-center pt-1 text-white font-extrabold text-sm sm:text-base">
                      <span>Grand Total</span>
                      <span className="text-[#F59E0B] font-black text-lg sm:text-xl tabular-nums">
                        {currency}{formatPrice(selectedListGrandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* 3. Order Confirmation with Waiter Card (Matches media_1794458766645_e708b220.jpg) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#121826]/95 border border-white/10 space-y-3.5 shadow-md">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 4v2" />
                          <path d="M4 18h16" />
                          <path d="M4 18c0-4.418 3.582-8 8-8s8 3.582 8 8" />
                          <path d="M2 20h20" />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-white font-bold text-base sm:text-lg tracking-tight leading-snug">
                          {selectedList.length > 1
                            ? 'Have you ordered these items with the waiter?'
                            : 'Have you ordered this item with the waiter?'}
                        </h3>
                        <p className="text-xs sm:text-[13px] text-slate-300/80 font-normal leading-relaxed">
                          Please tap an answer below. Your response helps us improve PhoneMenu for everyone! 😊
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {/* Primary White Button */}
                      <button
                        onClick={handleConfirmOrderWithWaiter}
                        className="w-full py-3.5 px-6 rounded-full bg-white hover:bg-slate-100 active:scale-[0.98] text-black font-bold text-sm sm:text-base tracking-normal flex items-center justify-center gap-2.5 shadow-[0_4px_25px_rgba(255,255,255,0.2)] cursor-pointer transition-all"
                      >
                        <CheckCircle2 className="w-5 h-5 text-black stroke-[2.5]" />
                        <span>Yes, I ordered</span>
                      </button>

                      {/* Secondary Glass Dark Button */}
                      <button
                        onClick={handleDismissSelectedListWithoutPopup}
                        className="w-full py-3 px-6 rounded-full bg-white/[0.05] hover:bg-white/10 active:scale-[0.98] border border-white/15 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <RotateCcw className="w-4 h-4 text-white" />
                        <span>Not yet — Keep browsing</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Awesome Animated Scroll Down Indicator Popup (Appears when content overflows) */}
            {showSelectedListScrollHint && (
              <div
                onClick={() => {
                  if (selectedListScrollContainerRef.current) {
                    selectedListScrollContainerRef.current.scrollBy({ top: 240, behavior: 'smooth' });
                  }
                  setShowSelectedListScrollHint(false);
                }}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto cursor-pointer animate-[bounce_1.5s_infinite]"
              >
                <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_4px_25px_rgba(234,88,12,0.7)] border border-orange-400/60 backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-95 select-none">
                  <span className="text-[11px] font-black uppercase tracking-wider">SCROLL FOR MORE</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. FULL-SCREEN TRUE GLASSMORPHISM MENU MODAL             */}
      {/* ======================================================== */}
      {isMenuOpen && (
        <div
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/45 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg h-[92vh] sm:h-[88vh] glass-sheet rounded-[32px] p-5 sm:p-7 shadow-2xl animate-[scaleUp_0.25s_cubic-bezier(0.16,1,0.3,1)] flex flex-col overflow-hidden relative"
          >
            {/* Modal Top Header */}
            <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center p-0 shadow-md overflow-hidden shrink-0 ${
                  restaurantProfile?.logo
                    ? 'bg-white border-2 border-orange-500/40 shadow-[0_0_18px_rgba(249,115,22,0.22),0_4px_16px_rgba(0,0,0,0.35)]'
                    : 'bg-gradient-to-br from-orange-500 to-amber-600 border-2 border-orange-400/40 text-white shadow-[0_4px_14px_rgba(249,115,22,0.25)]'
                }`}>
                  {restaurantProfile?.logo ? (
                    <img
                      src={restaurantProfile.logo}
                      alt={restaurantProfile.name || 'Logo'}
                      className="w-full h-full object-contain select-none filter contrast-[1.05] brightness-[1.02]"
                    />
                  ) : (
                    <Utensils className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <h3 className="text-white font-black text-xl sm:text-2xl tracking-tight leading-tight">
                    Menu & Specials
                  </h3>
                  {isFollowing && (
                    <div 
                      className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-amber-500 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.7)] shrink-0 animate-in fade-in zoom-in duration-300"
                      title="You are following this restaurant"
                    >
                      <Check className="w-3.5 h-3.5 text-black stroke-[3.5]" />
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white transition-all cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div ref={menuScrollContainerRef} className="flex-1 overflow-y-auto pt-3.5 pb-6 space-y-5 pr-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {/* Active Special Offer Alert Banner inside Menu & Specials modal */}
              {followerNotification && (
                <div
                  onClick={() => handleOpenNotificationDish(followerNotification)}
                  className="rounded-2xl p-3.5 sm:p-4 bg-gradient-to-r from-amber-950/90 via-[#24120a] to-amber-950/90 border border-amber-500/70 shadow-[0_0_25px_rgba(245,158,11,0.3)] flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] animate-in fade-in slide-in-from-top-2 select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-black/50 border border-amber-500/40 flex items-center justify-center shrink-0 overflow-hidden p-1 relative">
                      {followerNotification.image ? (
                        <img src={followerNotification.image} alt={followerNotification.title} className="w-full h-full object-contain drop-shadow" />
                      ) : (
                        <Bell className="w-6 h-6 text-amber-400" />
                      )}
                      <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                        🔥 Special Offer Just Received
                      </span>
                      <h4 className="text-white font-bold text-sm tracking-tight truncate">
                        {followerNotification.title}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5 truncate">
                        {followerNotification.body}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenNotificationDish(followerNotification);
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shrink-0 flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.4)] cursor-pointer"
                  >
                    <span>View in 3D</span>
                  </button>
                </div>
              )}

              {/* Follow Restaurant Section (Directly Above Featured Specials) */}
              {isFollowBannerVisible && (
                <div className={`rounded-2xl p-3.5 sm:p-4 bg-[#1a120e] border border-amber-900/40 shadow-xl flex items-center justify-between gap-3 transition-all duration-700 ease-in-out ${
                  isFadingOutFollowBanner ? 'opacity-0 -translate-y-2 max-h-0 overflow-hidden py-0 my-0 border-transparent pointer-events-none' : 'opacity-100 max-h-36'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#2a1c14] border border-amber-700/30 flex items-center justify-center text-amber-500 shrink-0 shadow-inner">
                      <Bell className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-amber-500/20" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white font-bold text-sm sm:text-base tracking-tight leading-snug truncate">
                        {isFollowing ? "You're following" : "Follow this restaurant"}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        Get offers & discounts
                      </p>
                    </div>
                  </div>

                  {isFollowing ? (
                    <div className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-amber-500/80 bg-amber-500/10 text-amber-400 font-bold text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.25)] select-none animate-in fade-in duration-300">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Following</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFollowRestaurant}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <span>+ Follow</span>
                    </button>
                  )}
                </div>
              )}

              {/* Featured Promo Carousel */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 animate-pulse" />
                    Featured Specials
                  </span>
                  
                </div>

                <div
                  onMouseEnter={() => setIsCarouselHovered(true)}
                  onMouseLeave={() => {
                    setIsCarouselHovered(false);
                    setIsCarouselPressed(false);
                  }}
                  onTouchStart={handleCarouselTouchStart}
                  onTouchMove={handleCarouselTouchMove}
                  onTouchEnd={handleCarouselTouchEnd}
                  onTouchCancel={() => {
                    setIsCarouselPressed(false);
                    isSwiping.current = false;
                  }}
                  onMouseDown={handleCarouselTouchStart}
                  onMouseMove={handleCarouselTouchMove}
                  onMouseUp={handleCarouselTouchEnd}
                  className="relative overflow-hidden rounded-2xl border border-white/15 shadow-xl group"
                >
                  <div
                    className="flex transition-transform duration-700 ease-out will-change-transform"
                    style={{ transform: `translateX(-${menuOfferIndex * 100}%)` }}
                  >
                    {carouselItems.map((offer) => (
                      <div
                        key={offer.id}
                        onClick={() => selectOfferFromCarousel(offer)}
                        className="w-full flex-shrink-0 bg-gradient-to-r from-orange-600/35 via-red-600/25 to-black/50 p-4.5 sm:p-5 sm:py-5.5 relative flex items-center justify-between min-h-[165px] sm:min-h-[175px] cursor-pointer hover:brightness-110 transition-all select-none"
                      >
                        <div className="z-10 flex-1 pr-3">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/30 border border-orange-400/40 text-amber-300 font-black text-[10px] uppercase tracking-wider mb-2">
                            <Flame className="text-amber-400 w-3 h-3 fill-amber-400" />
                            <span>{offer.badge || 'FEATURED SPECIAL'}</span>
                          </div>
                          <h4 className="text-white font-extrabold text-base sm:text-lg leading-snug">{offer.title}</h4>
                          {offer.subtitle && (
                            <p className="text-slate-300 text-xs sm:text-sm mt-1 line-clamp-2 sm:line-clamp-1 leading-tight">
                              {offer.subtitle}
                            </p>
                          )}
                          <span className="text-orange-400 font-black text-sm sm:text-base mt-2 block">
                            Explore Dish &bull; {currency}{formatPrice(offer.price)}
                          </span>
                        </div>

                        <div className="z-10 w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 flex items-center justify-center">
                          <img
                            src={offer.image}
                            alt={offer.title}
                            className={offer.isPng !== false ? "w-full h-full object-contain drop-shadow-xl scale-110" : "w-20 h-20 sm:w-22 sm:h-22 object-cover rounded-full border border-white/30 shadow-md"}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                
              </div>

              {/* Categories Section with Large, Readable Buttons */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
                  Browse Categories
                </h4>
                <div className="space-y-2.5">
                  {dynamicCategories.map((cat, idx) => {
                    const Icon = cat.icon;
                    const isSelected = activeCategory === cat.name;
                    const count = (cat.name === 'All Items' || cat.name === 'All') 
                      ? regularCategoryFoods.length 
                      : regularCategoryFoods.filter(f => f.category === cat.name).length;
                    return (
                      <button
                        key={idx}
                        onClick={() => selectCategoryFromMenu(cat.name)}
                        className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'glass-row-selected'
                            : 'glass-row'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`p-2.5 rounded-xl transition-all ${
                            isSelected ? 'bg-orange-500 text-white shadow-md' : 'bg-white/10 text-orange-400'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <span className={`text-sm sm:text-base font-bold block ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                              {cat.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {count} {count > 1 ? 'Items available' : 'Item available'}
                            </span>
                          </div>
                        </div>
                        {isSelected ? (
                          <div className="w-3 h-3 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Awesome Animated Scroll Down Indicator Popup (Appears every 8s if scrollable) */}
            {showScrollHint && (
              <div
                onClick={() => {
                  if (menuScrollContainerRef.current) {
                    menuScrollContainerRef.current.scrollBy({ top: 200, behavior: 'smooth' });
                  }
                  setShowScrollHint(false);
                }}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto cursor-pointer animate-[bounce_1.5s_infinite]"
              >
                <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_4px_25px_rgba(234,88,12,0.7)] border border-orange-400/60 backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-95">
                  <span className="text-[11px] font-black uppercase tracking-wider">Scroll for more</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. HOLOGRAM GLASS CUSTOMIZATION MODAL (Add-on Page)      */}
      {/* Premium Feature: Only accessible when enableOrderButton is on */}
      {/* ======================================================== */}
      {adminConfig.premiumFeatures.enableOrderButton && isCustomizeOpen && (
        <div
          onClick={() => setIsCustomizeOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[88vh] hologram-glass rounded-t-[28px] sm:rounded-[28px] p-5 flex flex-col overflow-hidden animate-[slideUp_0.25s_ease-out]"
          >

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <img
                  src={activeFood.image}
                  alt={activeFood.title}
                  className="w-12 h-12 rounded-xl object-contain bg-white/5 border border-white/10 p-1"
                />
                <div>
                  <h3 className="text-white font-extrabold text-base leading-tight">{activeFood.title}</h3>
                  <span className="text-orange-400 font-bold text-sm">{currency}{formatPrice(currentItemTotalPrice)}</span>
                </div>
              </div>
              <button
                onClick={() => setIsCustomizeOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Customization Options */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">

              {/* Portion / Size Selector */}
              {adminConfig.features.enablePortions && activeFood.customizable?.portions && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-orange-400 block mb-1.5">
                    {adminConfig.labels.portionTitle}
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {activeFood.customizable.portions.map((portion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedPortion(idx)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${selectedPortion === idx
                            ? 'bg-orange-500/20 border-orange-400 text-white font-semibold'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                      >
                        <span className="text-xs">{portion.name}</span>
                        <span className="text-xs font-bold text-orange-400">
                          {portion.price !== undefined
                            ? `${currency}${formatPrice(portion.price)}`
                            : (portion.extra === 0 ? 'Included' : `+${currency}${formatPrice(portion.extra)}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Spice Level (Conditional based on admin configuration) */}
              {adminConfig.features.enableSpiceLevel && activeFood.customizable?.spiceLevels && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-orange-400 block mb-1.5">
                    {adminConfig.labels.spiceLevelTitle}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeFood.customizable.spiceLevels.map((spice, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSpice(idx)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${selectedSpice === idx
                            ? 'bg-orange-500/20 border-orange-400 text-orange-300 font-bold'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                      >
                        {spice}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {adminConfig.features.enableAddons && activeFood.customizable?.addons && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-orange-400 block mb-1.5">
                    {adminConfig.labels.addonsTitle}
                  </label>
                  <div className="space-y-1.5">
                    {activeFood.customizable.addons.map((addon) => {
                      const isSelected = selectedAddons.some(a => a.id === addon.id);
                      return (
                        <div
                          key={addon.id}
                          onClick={() => toggleAddon(addon)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${isSelected
                              ? 'bg-orange-500/20 border-orange-400 text-white font-semibold'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-orange-500 border-orange-400 text-white' : 'border-white/30'
                              }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs">{addon.name}</span>
                          </div>
                          <span className="text-xs font-bold text-orange-400">+{currency}{formatPrice(addon.price)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Kitchen Notes (Conditional based on admin configuration) */}
              {adminConfig.features.enableKitchenNotes && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    {adminConfig.labels.kitchenNoteTitle}
                  </label>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder={adminConfig.labels.kitchenNotePlaceholder}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400 resize-none h-16"
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-xs font-bold uppercase text-slate-300">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-extrabold text-white w-5 text-center">{customQuantity}</span>
                  <button
                    onClick={() => setCustomQuantity(customQuantity + 1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Add to Cart CTA */}
            <div className="pt-3 border-t border-white/10">
              <button
                onClick={handleAddToCart}
                className="w-full py-3.5 rounded-xl cta-order-btn text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span>Add to Order • {currency}{formatPrice(currentItemTotalPrice)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. HOLOGRAM GLASS CART SLIDE-OVER                        */}
      {/* Premium Feature: Only visible if enableCartPage is ON     */}
      {/* ======================================================== */}
      {adminConfig.premiumFeatures.enableCartPage && isCartOpen && (
        <div
          onClick={() => setIsCartOpen(false)}
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm h-full hologram-glass flex flex-col p-5 overflow-hidden animate-[slideLeft_0.25s_ease-out]"
          >

            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-400" />
                <h3 className="text-white font-extrabold text-base">Your Table Order</h3>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-xs font-bold">
                  {totalCartCount}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dining Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 my-3 p-1 rounded-xl bg-white/5 border border-white/10">
              <button
                onClick={() => setDiningMode('dine-in')}
                className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${diningMode === 'dine-in' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                Dine In ({tableNumber})
              </button>
              <button
                onClick={() => setDiningMode('takeaway')}
                className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${diningMode === 'takeaway' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Takeaway
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-2 pr-1">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <ShoppingBag className="w-6 h-6 text-slate-500" />
                  </div>
                  <h4 className="text-white font-bold text-sm mb-1">Your order is empty</h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Choose delicious dishes from the 3D menu to place your table order.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.cartId}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5 relative"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-12 h-12 rounded-lg object-contain bg-white/5 border border-white/10 p-1 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="text-white font-bold text-xs truncate pr-1">{item.title}</h4>
                        <span className="text-orange-400 font-extrabold text-xs shrink-0">{currency}{formatPrice(item.totalPrice)}</span>
                      </div>

                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.portion}
                        {adminConfig.features.enableSpiceLevel && item.spice ? ` • ${item.spice}` : ''}
                      </p>

                      {item.addons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.addons.map(a => (
                            <span key={a.id} className="text-[9px] px-1.5 py-0.2 bg-orange-500/10 text-orange-300 rounded">
                              +{a.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartItemQuantity(item.cartId, -1)}
                            className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartItemQuantity(item.cartId, 1)}
                            className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeCartItem(item.cartId)}
                          className="text-slate-500 hover:text-red-400 text-xs p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bill Summary */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{currency}{formatPrice(subtotal)}</span>
                  </div>
                  {isVatActive && (
                    <div className="flex justify-between text-slate-400">
                      <span>VAT ({vatType === 'percentage' ? `${vatRate}%` : `Flat ${currency}${formatPrice(vatRate)}`})</span>
                      <span>{currency}{formatPrice(tax)}</span>
                    </div>
                  )}
                  {isServiceChargeActive && (
                    <div className="flex justify-between text-slate-400">
                      <span>Service Charge ({serviceChargeType === 'percentage' ? `${serviceChargeRate}%` : `${currency}${formatPrice(serviceChargeRate)}`})</span>
                      <span>{currency}{formatPrice(serviceFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-white/10 text-sm font-extrabold text-white">
                    <span>Total Amount</span>
                    <span className="text-orange-400 text-base">{currency}{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                    setCheckoutStep('select-payment');
                  }}
                  className="w-full py-3.5 rounded-xl cta-order-btn text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Confirm Order • {currency}{formatPrice(grandTotal)}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. DGM PAYMENT FEATURES (Confirm & Pay Modal)            */}
      {/* Premium Feature: Only visible if enablePaymentModal is ON */}
      {/* ======================================================== */}
      {adminConfig.premiumFeatures.enablePaymentModal && isCheckoutOpen && (
        <div
          onClick={() => checkoutStep !== 'processing' && setIsCheckoutOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm hologram-glass rounded-3xl p-5 relative overflow-hidden animate-[slideUp_0.25s_ease-out]"
          >

            {checkoutStep !== 'processing' && (
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Select Payment */}
            {checkoutStep === 'select-payment' && (
              <div>
                <div className="text-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto mb-2 border border-orange-400/30">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <h3 className="text-white font-extrabold text-lg">{adminConfig.labels.paymentModalTitle}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {diningMode === 'dine-in' ? `${tableNumber} • Dine In` : 'Takeaway Pickup'}
                  </p>
                </div>

                {diningMode === 'takeaway' && (
                  <div className="space-y-2 mb-3">
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400"
                    />
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  {/* bKash */}
                  <button
                    onClick={() => setPaymentMethod('bkash')}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${paymentMethod === 'bkash'
                        ? 'bg-pink-600/25 border-pink-500 text-white shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center font-extrabold text-white text-xs">
                        bK
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold block">bKash Instant Pay</span>
                        <span className="text-[10px] text-pink-300">Fast & Safe Mobile Wallet</span>
                      </div>
                    </div>
                    {paymentMethod === 'bkash' && <Check className="w-4 h-4 text-pink-400" />}
                  </button>

                  {/* Card */}
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${paymentMethod === 'card'
                        ? 'bg-blue-600/25 border-blue-500 text-white shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold block">Credit / Debit Card</span>
                        <span className="text-[10px] text-blue-300">Visa, Mastercard</span>
                      </div>
                    </div>
                    {paymentMethod === 'card' && <Check className="w-4 h-4 text-blue-400" />}
                  </button>

                  {/* Cash */}
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${paymentMethod === 'cash'
                        ? 'bg-emerald-600/25 border-emerald-500 text-white shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                        <Banknote className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold block">Cash at Table</span>
                        <span className="text-[10px] text-emerald-300">Pay when food arrives</span>
                      </div>
                    </div>
                    {paymentMethod === 'cash' && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>

                <button
                  onClick={handleConfirmOrder}
                  className="w-full py-3.5 rounded-xl cta-order-btn text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Place Order • {currency}{formatPrice(grandTotal)}</span>
                </button>
              </div>
            )}

            {/* Processing */}
            {checkoutStep === 'processing' && (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full border-3 border-orange-500 border-t-transparent animate-spin mb-3" />
                <h4 className="text-white font-extrabold text-base mb-1">Sending to Kitchen</h4>
                <p className="text-xs text-slate-400">Order sent to the chef station...</p>
              </div>
            )}

            {/* Success Receipt */}
            {checkoutStep === 'success' && placedOrderDetails && (
              <div className="py-2 text-center animate-[scaleUp_0.25s_ease-out]">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-2.5 shadow-lg">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-white font-extrabold text-xl mb-0.5">Order Placed!</h3>
                <p className="text-xs text-slate-300 mb-3">Your food is being prepared fresh.</p>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-left space-y-1.5 mb-3 text-xs">
                  <div className="flex justify-between border-b border-white/10 pb-1.5">
                    <span className="text-slate-400">Order Ticket</span>
                    <span className="font-extrabold text-orange-400">{placedOrderDetails.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Destination</span>
                    <span className="font-semibold text-white">
                      {placedOrderDetails.diningMode === 'dine-in' ? placedOrderDetails.tableNumber : 'Takeaway'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimated Serving</span>
                    <span className="font-semibold text-emerald-400">{placedOrderDetails.prepEst}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-1.5 font-bold text-sm">
                    <span className="text-white">Total Settled</span>
                    <span className="text-orange-400">{currency}{placedOrderDetails.total}</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsCheckoutOpen(false)}
                  className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Return to Menu
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. LIVE FOLLOWER NOTIFICATION BANNER (SPECIAL OFFER)     */}
      {/* ======================================================== */}
      {followerNotification && (
        <div
          role="alert"
          onClick={() => handleOpenNotificationDish(followerNotification)}
          style={{ zIndex: 9999999 }}
          className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md bg-[#0d131f]/95 backdrop-blur-xl border border-amber-500/40 rounded-[8px] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(245,158,11,0.25)] animate-[slideDown_0.35s_ease-out] text-white cursor-pointer select-none transition-transform hover:scale-[1.01]"
        >
          <div className="flex items-start gap-3.5">
            {/* Pulsing Bell Icon / Food Thumbnail */}
            <div className="relative shrink-0">
              {followerNotification.image ? (
                <div className="w-12 h-12 rounded-[6px] overflow-hidden bg-black/40 border border-amber-500/30 flex items-center justify-center p-1">
                  <img
                    src={followerNotification.image}
                    alt={followerNotification.title}
                    className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                  />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-[6px] bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Bell className="w-5 h-5 text-black" />
                </div>
              )}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>

            {/* Notification Text */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                  {restaurantProfile?.name || 'Moneky Bhai'} • Follower Special
                </span>
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight line-clamp-1">
                {followerNotification.title}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                {followerNotification.body}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenNotificationDish(followerNotification);
                  }}
                  className="px-3 py-1.5 rounded-[5px] bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explore Special Dish</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFollowerNotification(null);
                  }}
                  className="px-2.5 py-1.5 rounded-[5px] bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Dismiss Cross */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFollowerNotification(null);
              }}
              className="p-1 rounded-[4px] text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Keyframe Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes scaleUp { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}} />
    </div>
  );
}
