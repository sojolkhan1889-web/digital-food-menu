// Multi-Language Localization System for Digital Menu
// Supports English, Bengali, and easily expandable to other international languages

export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', dir: 'ltr' },
  // Prepared for future international expansion:
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', dir: 'rtl' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
];

export const getRestaurantPrimaryLanguage = (profile, restaurant) => {
  const country = (profile?.country || restaurant?.country || '').toLowerCase();
  const phone = (profile?.phone || restaurant?.phone || '').trim();
  const currency = (profile?.currency || restaurant?.currency || '').trim();
  const address = (profile?.address || restaurant?.address || '').toLowerCase();

  // If explicit primary language is set in profile/settings
  if (profile?.language) {
    const found = AVAILABLE_LANGUAGES.find(l => l.code === profile.language);
    if (found) return found;
  }

  // Bangladesh (default for current accounts)
  if (
    country.includes('bangla') ||
    country.includes('bd') ||
    phone.startsWith('+880') ||
    currency === '৳' ||
    address.includes('dhaka') ||
    address.includes('banani') ||
    address.includes('chattogram') ||
    address.includes('uttara')
  ) {
    return {
      code: 'bn',
      name: 'Bengali',
      nativeName: 'বাংলা',
      subtitle: 'আপনার পছন্দের ভাষা বেছে নিন',
      flag: '🇧🇩',
      dir: 'ltr'
    };
  }

  // India
  if (country.includes('india') || phone.startsWith('+91') || currency === '₹') {
    return {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी',
      subtitle: 'अपनी पसंदीदा भाषा चुनें',
      flag: '🇮🇳',
      dir: 'ltr'
    };
  }

  // Middle East / Arabic
  if (
    country.includes('saudi') ||
    country.includes('uae') ||
    country.includes('dubai') ||
    phone.startsWith('+966') ||
    phone.startsWith('+971') ||
    currency === '﷼' ||
    currency === 'AED'
  ) {
    return {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      subtitle: 'اختر لغتك المفضلة',
      flag: '🇸🇦',
      dir: 'rtl'
    };
  }

  // Default to Bengali
  return {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    subtitle: 'আপনার পছন্দের ভাষা বেছে নিন',
    flag: '🇧🇩',
    dir: 'ltr'
  };
};

export const translations = {
  en: {
    // Language Modal
    choose_language: 'Choose your language',
    choose_language_sub: 'Choose your preferred language',
    other_languages: 'Other languages',
    search_languages: 'Search languages',
    continue: 'Continue',

    // Header & Brand
    welcome_guest: 'Welcome, Our Dear Guest',
    menu: 'MENU',
    table: 'Table',
    following: 'FOLLOWING',
    follow: '+ FOLLOW',
    follow_restaurant: 'Follow this restaurant',
    follow_desc: 'Get offers & discounts',
    following_desc: "You'll receive exclusive VIP offers!",

    // Stage & Bottom Card
    details: 'Details',
    limited_deal: 'Limited Deal',
    view_order_list: 'VIEW YOUR ORDER LIST',
    order_list_count: '({count})',

    // Menu Modal
    menu_and_specials: 'Menu & Specials',
    featured_specials: 'FEATURED SPECIALS',
    explore_combo: 'Explore combo',
    menu_categories: 'Menu Categories',
    all_items: 'ALL ITEMS',
    items_available: 'Items available',
    item_available: 'Item available',
    scroll_for_more: 'SCROLL FOR MORE',

    // Product Details Modal
    combo_includes: 'Combo includes',
    whats_included: "What's included",
    item_total_amount: 'Item Total amount',
    add_to_order_list: 'ADD TO ORDER LIST',
    update_order_list: 'UPDATE ORDER LIST',
    portion_size: 'Portion Size',
    addons: 'Add-ons',
    best_seller: 'BEST SELLER',
    dhamaka_offer: 'DHAMAKA OFFER',
    weekend_special: 'WEEKEND SPECIAL',

    // Waiter Auto Confirmation Dialog
    ordered_with_waiter_single: 'Have you ordered this item with the waiter?',
    ordered_with_waiter_multi: 'Have you ordered these items with the waiter?',
    waiter_prompt_note: 'Please tap an answer below. Your response helps us improve PhoneMenu for everyone! 😊',
    yes_ordered: 'Yes, I ordered',
    not_yet_keep_browsing: 'Not yet — Keep browsing',

    // Selected Items / Order List Modal
    your_order_list: 'YOUR ORDER LIST',
    dishes_in_list: '{count} dish{plural} in your list',
    no_items_selected: 'No items selected yet',
    no_items_desc: 'Browse our digital menu and tap "+ ADD TO ORDER LIST" on any food item to add it here.',
    browse_menu: 'Browse Menu',
    live_price_summary: 'Live Price Summary',
    subtotal: 'Subtotal',
    vat: 'VAT',
    service_charge: 'Service Charge',
    grand_total: 'Grand Total',
    table_order_confirmed: 'Table Order Confirmed',
    table_confirmed_desc: 'An order has already been confirmed for {table}. You can continue browsing dishes!',
    close_keep_browsing: 'Close & Keep Browsing',
    back_to_menu: 'Back to Menu',
    portion_label: 'PORTION',
    addons_label: 'ADDONS',

    // Cart Modal (if enabled)
    your_cart: 'YOUR CART',
    empty_cart: 'Your cart is empty',
    kitchen_notes: 'Special Kitchen Notes (e.g. Less spicy, no onions)',
    place_order_now: 'PLACE ORDER NOW',

    // Category translations
    cat_all: 'ALL ITEMS',
    cat_fast_food: 'Fast Food Items',
    cat_smash_burgers: 'Smash Burgers',
    cat_main_course: 'Main Course',
    cat_appetizers: 'Appetizers',
    cat_beverages: 'Beverages',
    cat_drinks: 'Drinks',
    cat_dessert: 'Dessert',
    cat_chinese: 'Chinese',
  },

  bn: {
    // Language Modal
    choose_language: 'Choose your language',
    choose_language_sub: 'আপনার পছন্দের ভাষা বেছে নিন',
    other_languages: 'অন্যান্য ভাষা',
    search_languages: 'ভাষা খুঁজুন',
    continue: 'Continue',

    // Header & Brand
    welcome_guest: 'স্বাগতম, আমাদের সম্মানিত অতিথি',
    menu: 'মেনু',
    table: 'টেবিল',
    following: 'ফলো করছেন',
    follow: '+ ফলো',
    follow_restaurant: 'রেস্তোরাঁটি ফলো করুন',
    follow_desc: 'অফার ও ডিসকাউন্ট পেতে',
    following_desc: 'আপনি বিশেষ ভিআইপি অফার পাবেন!',

    // Stage & Bottom Card
    details: 'বিস্তারিত',
    limited_deal: 'সীমিত সময়ের অফার',
    view_order_list: 'অর্ডার তালিকা দেখুন',
    order_list_count: '({count})',

    // Menu Modal
    menu_and_specials: 'মেনু ও স্পেশাল',
    featured_specials: 'ফিচার্ড স্পেশাল',
    explore_combo: 'কম্বো দেখুন',
    menu_categories: 'মেনু ক্যাটাগরি',
    all_items: 'সব আইটেম',
    items_available: 'টি আইটেম রয়েছে',
    item_available: 'টি আইটেম রয়েছে',
    scroll_for_more: 'আরও দেখতে স্ক্রোল করুন',

    // Product Details Modal
    combo_includes: 'কম্বোতে যা থাকছে',
    whats_included: 'যা যা অন্তর্ভুক্ত',
    item_total_amount: 'আইটেমের মোট মূল্য',
    add_to_order_list: '+ অর্ডার তালিকায় যোগ করুন',
    update_order_list: 'অর্ডার তালিকা আপডেট করুন',
    portion_size: 'পরিমাণ সাইজ বেছে নিন',
    addons: 'অতিরিক্ত আইটেম (অ্যাড-অন)',
    best_seller: 'বেস্ট সেলার',
    dhamaka_offer: 'ধামাকা অফার',
    weekend_special: 'উইকেন্ড স্পেশাল',

    // Waiter Auto Confirmation Dialog
    ordered_with_waiter_single: 'আপনি কি ওয়েটারের কাছে এই খাবারটি অর্ডার করেছেন?',
    ordered_with_waiter_multi: 'আপনি কি ওয়েটারের কাছে এই খাবারগুলো অর্ডার করেছেন?',
    waiter_prompt_note: 'নিচে একটি উত্তর সিলেক্ট করুন। আপনার মতামত আমাদের সেবার মান বাড়াতে সাহায্য করে! 😊',
    yes_ordered: 'হ্যাঁ, আমি অর্ডার করেছি',
    not_yet_keep_browsing: 'না, এখনো করিনি — মেনু দেখতে থাকুন',

    // Selected Items / Order List Modal
    your_order_list: 'আপনার অর্ডার তালিকা',
    dishes_in_list: '{count}টি খাবার তালিকায় রয়েছে',
    no_items_selected: 'এখনও কোনো খাবার নির্বাচন করা হয়নি',
    no_items_desc: 'আমাদের ডিজিটাল মেনু ঘুরে দেখুন এবং পছন্দের খাবারের "+ অর্ডার তালিকায় যোগ করুন" চাপুন।',
    browse_menu: 'মেনু দেখুন',
    live_price_summary: 'লাইভ মূল্য বিবরণী',
    subtotal: 'সাবটোটাল',
    vat: 'ভ্যাট',
    service_charge: 'সার্ভিস চার্জ',
    grand_total: 'সর্বমোট মূল্য',
    table_order_confirmed: 'টেবিল অর্ডার কনফার্ম হয়েছে',
    table_confirmed_desc: '{table} এর জন্য ইতিমধ্যে অর্ডার কনফার্ম হয়েছে। আপনি নতুন খাবার ব্রাউজ করতে পারেন!',
    close_keep_browsing: 'বন্ধ করুন ও দেখতে থাকুন',
    back_to_menu: 'মেনুতে ফিরে যান',
    portion_label: 'পরিমাণ',
    addons_label: 'অ্যাড-অন',

    // Cart Modal (if enabled)
    your_cart: 'আপনার কার্ট',
    empty_cart: 'আপনার কার্ট খালি',
    kitchen_notes: 'বিশেষ কিচেন নোট (যেমন: কম ঝাল, পেঁয়াজ ছাড়া)',
    place_order_now: 'এখনই অর্ডার নিশ্চিত করুন',

    // Category translations
    cat_all: 'সব আইটেম',
    cat_fast_food: 'ফাস্ট ফুড',
    cat_smash_burgers: 'স্ম্যাশ বার্গার',
    cat_main_course: 'মেইন কোর্স',
    cat_appetizers: 'অ্যাপেটাইজার',
    cat_beverages: 'পানীয় ও ড্রিংকস',
    cat_drinks: 'ড্রিংকস',
    cat_dessert: 'ডেজার্ট ও মিষ্টি',
    cat_chinese: 'চাইনিজ',
  }
};

/**
 * Helper to translate a key into the target language.
 * Falls back to English if the translation is missing.
 */
export const t = (key, lang = 'en', params = {}) => {
  const targetDict = translations[lang] || translations.en;
  let text = targetDict[key] || translations.en[key] || key;

  if (params && typeof params === 'object') {
    Object.keys(params).forEach(paramKey => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
    });
  }

  return text;
};

/**
 * Translates known standard category names dynamically
 */
export const translateCategoryName = (categoryName, lang = 'en') => {
  if (!categoryName) return '';
  if (lang !== 'bn') return categoryName;

  const lower = categoryName.trim().toLowerCase();
  if (lower === 'all items' || lower === 'all') return 'সব আইটেম';
  if (lower === 'fast food items' || lower === 'fast food') return 'ফাস্ট ফুড';
  if (lower === 'smash burgers') return 'স্ম্যাশ বার্গার';
  if (lower === 'main course') return 'মেইন কোর্স';
  if (lower === 'appetizers') return 'অ্যাপেটাইজার';
  if (lower === 'beverages') return 'পানীয় ও ড্রিংকস';
  if (lower === 'drinks') return 'ড্রিংকস';
  if (lower === 'dessert' || lower === 'desserts') return 'ডেজার্ট';
  if (lower === 'chineese' || lower === 'chinese') return 'চাইনিজ';

  return categoryName;
};
