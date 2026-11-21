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
    extra_addons_label: 'EXTRA ADD-ONS',
    item_total: 'Item total',

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
    extra_addons_label: 'অতিরিক্ত অ্যাড-অন',
    item_total: 'আইটেম মোট',

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
 * Helper to convert English digits to Bengali digits
 */
export const toBengaliDigits = (num) => {
  if (num === null || num === undefined) return '';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bengaliDigits[Number(d)]);
};

/**
 * Formats and localizes badge texts (e.g. "14% OFF", "FLAT ৳10 OFF", "BEST SELLER")
 */
export const formatBadgeText = (badgeText, lang = 'en') => {
  if (!badgeText) return '';
  if (lang !== 'bn') return badgeText;

  // Percentage OFF e.g. "14% OFF", "20% OFF"
  const pctMatch = badgeText.match(/^(\d+)%\s*OFF$/i);
  if (pctMatch) {
    return `${toBengaliDigits(pctMatch[1])}% ছাড়`;
  }

  // Flat discount e.g. "FLAT ৳10 OFF", "FLAT $5 OFF"
  const flatMatch = badgeText.match(/^FLAT\s+(.+)\s+OFF$/i);
  if (flatMatch) {
    const amount = flatMatch[1].replace(/[0-9]/g, (d) => toBengaliDigits(d));
    return `ফ্ল্যাট ${amount} ছাড়`;
  }

  // Standard promotional badges
  const lower = badgeText.trim().toLowerCase();
  if (lower === 'best seller' || lower === 'best selling') return 'বেস্ট সেলার';
  if (lower === 'chef special') return 'শেফ স্পেশাল';
  if (lower === 'dhamaka offer') return 'ধামাকা অফার';
  if (lower === 'weekend special') return 'উইকেন্ড স্পেশাল';
  if (lower === 'new') return 'নতুন';
  if (lower === 'popular') return 'জনপ্রিয়';
  if (lower === 'limited deal') return 'সীমিত অফার';

  return badgeText;
};

/**
 * Translates or localizes food dish titles when browsing in Bengali / Native Language
 */
export const translateFoodTitle = (foodOrTitle, lang = 'en') => {
  if (!foodOrTitle) return '';
  const isObj = typeof foodOrTitle === 'object' && foodOrTitle !== null;
  const defaultTitle = isObj
    ? (foodOrTitle.title || foodOrTitle.name || '')
    : String(foodOrTitle);

  if (lang === 'en') return defaultTitle;

  // 1. If explicit native or Bengali name exists on the food object, ALWAYS prioritize it
  if (isObj) {
    if (lang === 'bn' && (foodOrTitle.featuredOffer?.title_bn || foodOrTitle.featuredOffer?.title_native)) {
      return foodOrTitle.featuredOffer.title_bn || foodOrTitle.featuredOffer.title_native;
    }
    if (lang === 'bn' && (foodOrTitle.title_bn || foodOrTitle.name_bn || foodOrTitle.promoTitle_bn)) {
      return foodOrTitle.title_bn || foodOrTitle.name_bn || foodOrTitle.promoTitle_bn;
    }
    if (foodOrTitle.name_native || foodOrTitle.title_native) {
      return foodOrTitle.name_native || foodOrTitle.title_native;
    }
    if (foodOrTitle.customizable?.title_bn || foodOrTitle.customizable?.name_native) {
      return foodOrTitle.customizable.title_bn || foodOrTitle.customizable.name_native;
    }
  }

  // If language is Bengali, check known dictionary translations
  if (lang === 'bn') {
    const clean = defaultTitle.trim();
    const lower = clean.toLowerCase();

    // Known catalog & customer dishes
    if (lower === 'loaded cheesy beef fries' || lower.includes('cheesy beef fries')) return 'লোডেড চিজি বিফ ফ্রাইস';
    if (lower === 'spicy zinger crunch burger' || lower.includes('spicy zinger')) return 'স্পাইসি জিঙ্গার ক্রাঞ্চি বার্গার';
    if (lower === 'double flame cheeseburger') return 'ডাবল ফ্লেম চিজবার্গার';
    if (lower === 'artisan wood-fired pizza' || lower === 'wood-fired pizza') return 'উড-ফায়ার্ড পিজ্জা';
    if (lower === 'korean gochujang crisp chicken' || lower.includes('gochujang crisp chicken')) return 'কোরিয়ান ক্রিস্প চিকেন';
    if (lower === 'double smash burger combo') return 'ডাবল স্ম্যাশ বার্গার কম্বো';
    if (lower === 'double smash burger') return 'ডাবল স্ম্যাশ বার্গার';
    if (lower === 'smash burger') return 'স্ম্যাশ বার্গার';
    if (lower === 'oreo thick shake') return 'ওরিও থিক শেক';
    if (lower === 'iced caramel macchiato') return 'আইসড ক্যারামেল ম্যাকিয়াটো';
    if (lower === 'signature kacchi biryani' || lower === 'kacchi biryani') return 'কাচ্চি বিরিয়ানি';
    if (lower === 'artisan espresso') return 'আর্টিসান এসপ্রেসো';
    if (lower === 'belgian chocolate sundae') return 'বেলজিয়ান চকলেট সানডে';
    if (lower === 'crispy fries' || lower === 'french fries') return 'ক্রিস্পি ফ্রাইস';
    if (lower === 'beef burger') return 'বিফ বার্গার';
    if (lower === 'chicken burger') return 'চিকেন বার্গার';
    if (lower.startsWith('coke') || lower.includes('coca cola') || lower.includes('coke •')) return 'কোক • ৩৫০ মিলি';
    if (lower.includes('pepsi')) return 'পেপসি';
    if (lower.includes('cold drink') || lower.includes('soft drink')) return 'কোল্ড ড্রিংক';

    return clean;
  }

  return defaultTitle;
};

/**
 * Translates or localizes food dish descriptions when browsing in Bengali / Native Language
 */
export const translateFoodDescription = (foodOrDesc, lang = 'en') => {
  if (!foodOrDesc) return '';
  const isObj = typeof foodOrDesc === 'object' && foodOrDesc !== null;
  const defaultDesc = isObj ? (foodOrDesc.description || '') : String(foodOrDesc);

  if (lang === 'en') return defaultDesc;

  // 1. If explicit native or Bengali description exists on the food object, ALWAYS prioritize it
  if (isObj) {
    if (lang === 'bn' && (foodOrDesc.description_bn || foodOrDesc.customizable?.description_bn)) {
      return foodOrDesc.description_bn || foodOrDesc.customizable?.description_bn;
    }
    if (foodOrDesc.description_native || foodOrDesc.customizable?.description_native) {
      return foodOrDesc.description_native || foodOrDesc.customizable?.description_native;
    }
    if (foodOrDesc.description_bn) {
      return foodOrDesc.description_bn;
    }
  }

  return defaultDesc;
};

export const initialCategoryTranslations = {
  'Main Course': 'মেইন কোর্স',
  'Appetizers': 'অ্যাপেটাইজার',
  'Beverages': 'পানীয় ও ড্রিংকস',
  'Dessert': 'ডেজার্ট',
  'Drinks': 'ড্রিংকস',
  'Fast Food Items': 'ফাস্ট ফুড আইটেম',
  'Fast Food': 'ফাস্ট ফুড',
  'Chef Specials': 'শেফ স্পেশাল',
  'Seafood': 'সিফুড',
  'Snacks': 'স্ন্যাকস',
  'Chinees': 'চাইনিজ',
  'Chinese': 'চাইনিজ',
  'Smash Burgers': 'স্ম্যাশ বার্গার'
};

export const initialSubcategoryTranslations = {
  'Burgers': 'বার্গার',
  'Pizza': 'পিজ্জা',
  'Biryani & Rice': 'বিরিয়ানি ও রাইস',
  'Crispy Wings & Finger Food': 'ক্রিস্পি উইংস ও ফিঙ্গার ফুড',
  'Chilled Espresso & Cold Coffee': 'কোল্ড কফি ও এসপ্রেসো',
  'Mocktails & Sodas': 'মকটেল ও সোডা',
  'Kunafa & Middle Eastern Sweets': 'কুনাফা ও মিষ্টান্ন',
  'Artisan Gelato & Ice Cream': 'আর্টিসান জেলাটো ও আইসক্রিম',
  'Moctail': 'মকটেল',
  'Mocktail': 'মকটেল',
  'Mocktails': 'মকটেল',
  'Sourdough Pizza': 'সাওয়ারডাফ পিজ্জা',
  'Crispy Chicken': 'ক্রিস্পি চিকেন',
  'Chilled Coffee': 'কোল্ড কফি',
  'Kunafa & Sweets': 'কুনাফা ও সুইটস',
  'Artisan Gelato': 'আর্টিসান জেলাটো'
};

/**
 * Translates known standard category names dynamically
 */
export const translateCategoryName = (categoryName, lang = 'en', customTranslations = null) => {
  if (!categoryName) return '';
  if (lang !== 'bn') return categoryName;

  const clean = categoryName.trim();

  // 1. Direct match in provided custom translations
  if (customTranslations && customTranslations[clean]) {
    return customTranslations[clean];
  }

  // 2. Direct match in stored category translations
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('dgm_restaurant_category_i18n');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[clean]) return parsed[clean];
        const lowerKey = Object.keys(parsed).find(k => k.toLowerCase() === clean.toLowerCase());
        if (lowerKey && parsed[lowerKey]) return parsed[lowerKey];
      }
    }
  } catch (e) {}

  // 3. Check initial catalog translations
  if (initialCategoryTranslations[clean]) {
    return initialCategoryTranslations[clean];
  }

  // 4. Fallback dictionary translations
  const lower = clean.toLowerCase();
  if (lower === 'all items' || lower === 'all') return 'সব আইটেম';
  if (lower === 'fast food items' || lower === 'fast food') return 'ফাস্ট ফুড আইটেম';
  if (lower === 'smash burgers' || lower === 'smash burger' || lower === 'burgers' || lower === 'burger') return 'স্ম্যাশ বার্গার';
  if (lower === 'main course') return 'মেইন কোর্স';
  if (lower === 'appetizers' || lower === 'appetizer' || lower === 'starter' || lower === 'starters') return 'অ্যাপেটাইজার';
  if (lower === 'beverages') return 'পানীয় ও ড্রিংকস';
  if (lower === 'drinks' || lower === 'drink' || lower === 'soft drinks') return 'ড্রিংকস';
  if (lower === 'dessert' || lower === 'desserts' || lower === 'ice cream') return 'ডেজার্ট';
  if (lower.startsWith('chinee') || lower.startsWith('chine') || lower === 'chinese' || lower === 'chinees' || lower === 'chineese') return 'চাইনিজ';
  if (lower === 'chef specials' || lower === 'chef special') return 'শেফ স্পেশাল';
  if (lower === 'seafood') return 'সিফুড';
  if (lower === 'snacks') return 'স্ন্যাকস';
  if (lower.includes('fries')) return 'ফ্রাইস';
  if (lower.includes('shake')) return 'শেক';
  if (lower.includes('pizza')) return 'পিজ্জা';
  if (lower.includes('biryani') || lower.includes('kacchi')) return 'বিরিয়ানি';
  if (lower.includes('chicken')) return 'চিকেন';
  if (lower.includes('beef')) return 'বিফ';
  if (lower.includes('pasta')) return 'পাস্তা';

  return clean;
};

/**
 * Translates sub-category / food type names dynamically
 */
export const translateSubcategoryName = (subName, lang = 'en', subcategories = null) => {
  if (!subName) return '';
  if (lang !== 'bn') return subName;

  const clean = subName.trim();

  // 1. Direct match in provided subcategories array
  if (Array.isArray(subcategories)) {
    const found = subcategories.find(s => s && s.name && s.name.toLowerCase() === clean.toLowerCase());
    if (found && (found.name_native || found.name_bn)) {
      return found.name_native || found.name_bn;
    }
  }

  // 2. Direct match in stored subcategories
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('dgm_restaurant_subcategories');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const found = parsed.find(s => s && s.name && s.name.toLowerCase() === clean.toLowerCase());
          if (found && (found.name_native || found.name_bn)) {
            return found.name_native || found.name_bn;
          }
        }
      }
    }
  } catch (e) {}

  // 3. Initial Subcategory translations dictionary
  if (initialSubcategoryTranslations[clean]) {
    return initialSubcategoryTranslations[clean];
  }

  const lower = clean.toLowerCase();
  const lowerKey = Object.keys(initialSubcategoryTranslations).find(k => k.toLowerCase() === lower);
  if (lowerKey) return initialSubcategoryTranslations[lowerKey];

  return clean;
};

/**
 * Translates portion and serving size names when browsing in Bengali / Native Language
 */
export const translatePortionName = (portionOrName, lang = 'en') => {
  if (!portionOrName) return '';
  const isObj = typeof portionOrName === 'object' && portionOrName !== null;
  const defaultName = isObj ? (portionOrName.name || '') : String(portionOrName);

  if (lang !== 'bn') return defaultName;

  // 1. If explicit native or Bengali name exists on the portion object, prioritize it
  if (isObj) {
    if (portionOrName.name_bn || portionOrName.name_native || portionOrName.nameNative) {
      return portionOrName.name_bn || portionOrName.name_native || portionOrName.nameNative;
    }
  }

  const clean = defaultName.trim();
  const lower = clean.toLowerCase();

  // Pattern: "10 Pcs Party Box" -> "১০ পিস পার্টি বক্স"
  const pcsBoxMatch = clean.match(/^(\d+)\s*(pcs?|pieces?)\s*(party\s*box|box)$/i);
  if (pcsBoxMatch) {
    return `${toBengaliDigits(pcsBoxMatch[1])} পিস পার্টি বক্স`;
  }

  // Pattern: "10 Pcs", "20 Pcs", "6 Pcs", "1 Pc", "12 Pieces"
  const pcsMatch = clean.match(/^(\d+)\s*(pcs?|pieces?)$/i);
  if (pcsMatch) {
    return `${toBengaliDigits(pcsMatch[1])} পিস`;
  }

  // Pattern: "250 gm", "500 g", "100 grams"
  const gmMatch = clean.match(/^(\d+)\s*(gm|g|grams?)$/i);
  if (gmMatch) {
    return `${toBengaliDigits(gmMatch[1])} গ্রাম`;
  }

  // Pattern: "1 kg", "2 kilo"
  const kgMatch = clean.match(/^(\d+)\s*(kg|kilo|kilograms?)$/i);
  if (kgMatch) {
    return `${toBengaliDigits(kgMatch[1])} কেজি`;
  }

  // Pattern: "500 ml", "250 ml"
  const mlMatch = clean.match(/^(\d+)\s*(ml|milliliters?)$/i);
  if (mlMatch) {
    return `${toBengaliDigits(mlMatch[1])} মিলি`;
  }

  // Pattern: "1 l", "2 liter"
  const lMatch = clean.match(/^(\d+)\s*(l|litres?|liters?)$/i);
  if (lMatch) {
    return `${toBengaliDigits(lMatch[1])} লিটার`;
  }

  // Common sizes
  if (lower === 'half') return 'হাফ';
  if (lower === 'full') return 'ফুল';
  if (lower === 'quarter') return 'কোয়ার্টার';
  if (lower === 'regular') return 'রেগুলার';
  if (lower === 'small') return 'স্মল';
  if (lower === 'medium') return 'মিডিয়াম';
  if (lower === 'large') return 'লার্জ';
  if (lower === 'extra large' || lower === 'xl') return 'এক্সট্রা লার্জ';
  if (lower === 'family' || lower === 'family pack' || lower === 'family size') return 'ফ্যামিলি';
  if (lower === 'standard' || lower === 'standard portion') return 'স্ট্যান্ডার্ড';
  if (lower === 'single') return 'সিঙ্গেল';
  if (lower === 'double') return 'ডাবল';
  if (lower === 'triple') return 'ট্রিপল';

  return clean;
};

/**
 * Translates extra addon and side choices when browsing in Bengali / Native Language
 */
export const translateAddonName = (addonOrName, lang = 'en') => {
  if (!addonOrName) return '';
  const isObj = typeof addonOrName === 'object' && addonOrName !== null;
  const defaultName = isObj ? (addonOrName.name || '') : String(addonOrName);

  if (lang !== 'bn') return defaultName;

  // 1. If explicit native or Bengali name exists on the addon object, prioritize it
  if (isObj) {
    if (addonOrName.name_bn || addonOrName.name_native || addonOrName.nameNative) {
      return addonOrName.name_bn || addonOrName.name_native || addonOrName.nameNative;
    }
  }

  const clean = defaultName.trim();
  const lower = clean.toLowerCase();

  // Pattern for drinks: "Coke 500 ML", "Sprite 500 ML", "Pepsi 250 ML", "Fanta 500 ML", etc.
  const drinkMatch = clean.match(/^(coke|coca cola|pepsi|sprite|fanta|mirinda|mountain dew|7up|seven up)\s*(\d+)?\s*(ml|l|litre|liter)?$/i);
  if (drinkMatch) {
    const brand = drinkMatch[1].toLowerCase();
    const amount = drinkMatch[2];
    const unit = drinkMatch[3]?.toLowerCase();

    let brandBn = 'কোক';
    if (brand.includes('coke') || brand.includes('coca')) brandBn = 'কোক';
    else if (brand.includes('pepsi')) brandBn = 'পেপসি';
    else if (brand.includes('sprite')) brandBn = 'স্প্রাইট';
    else if (brand.includes('fanta')) brandBn = 'ফ্যান্টা';
    else if (brand.includes('mirinda')) brandBn = 'মিরিন্ডা';
    else if (brand.includes('mountain')) brandBn = 'মাউন্টেন ডিউ';
    else if (brand.includes('7up') || brand.includes('seven')) brandBn = 'সেভেন আপ';

    if (amount) {
      const unitBn = (unit === 'l' || unit === 'litre' || unit === 'liter') ? 'লিটার' : 'মিলি';
      return `${brandBn} ${toBengaliDigits(amount)} ${unitBn}`;
    }
    return brandBn;
  }

  // Exact known addons
  if (lower === 'extra dip sauce' || lower === 'dip sauce') return 'এক্সট্রা ডিপ সস';
  if (lower === 'extra cheese') return 'এক্সট্রা চিজ';
  if (lower === 'extra sauce') return 'এক্সট্রা সস';
  if (lower === 'extra egg') return 'এক্সট্রা ডিম';
  if (lower === 'extra meat') return 'এক্সট্রা মিট';
  if (lower === 'extra patty' || lower === 'extra beef patty') return 'এক্সট্রা প্যাটি';
  if (lower === 'extra chicken') return 'এক্সট্রা চিকেন';
  if (lower === 'extra bacon') return 'এক্সট্রা বেকন';
  if (lower === 'extra fries') return 'এক্সট্রা ফ্রাইস';
  if (lower === 'extra mayo' || lower === 'extra mayonnaise') return 'এক্সট্রা মেয়োনিজ';
  if (lower === 'mineral water' || lower === 'water') return 'মিনারেল ওয়াটার';

  // Generic "Extra {Item}" matching
  const extraMatch = clean.match(/^extra\s+(.+)$/i);
  if (extraMatch) {
    const item = extraMatch[1].toLowerCase().trim();
    if (item === 'dip sauce') return 'এক্সট্রা ডিপ সস';
    if (item === 'cheese') return 'এক্সট্রা চিজ';
    if (item === 'sauce') return 'এক্সট্রা সস';
    if (item === 'egg') return 'এক্সট্রা ডিম';
    if (item === 'meat') return 'এক্সট্রা মিট';
    if (item === 'patty') return 'এক্সট্রা প্যাটি';
    if (item === 'chicken') return 'এক্সট্রা চিকেন';
    if (item === 'bacon') return 'এক্সট্রা বেকন';
    if (item === 'fries') return 'এক্সট্রা ফ্রাইস';
    if (item === 'mayo' || item === 'mayonnaise') return 'এক্সট্রা মেয়োনিজ';
    return `এক্সট্রা ${extraMatch[1]}`;
  }

  return clean;
};
