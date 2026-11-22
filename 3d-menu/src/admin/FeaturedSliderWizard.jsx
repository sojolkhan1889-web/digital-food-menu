import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Flame,
  ArrowRight,
  ChevronDown,
  Upload,
  RotateCcw,
  Plus,
  GripVertical,
  Utensils,
  Image as ImageIcon,
  Tag,
  ListChecks,
  Eye,
  Star,
  Bell,
  Languages
} from 'lucide-react';
import { compressImage } from '../lib/imageCompressor';
import { getRestaurantPrimaryLanguage, toBengaliDigits } from '../utils/translations';

export default function FeaturedSliderWizard({
  isOpen,
  onClose,
  onSave,
  foods = [],
  editingSlider = null,
  currency = '$',
  restaurant = null,
  theme = 'light'
}) {
  const isDark = theme === 'dark';

  // Dynamic primary native language for the registered restaurant country (e.g. বাংলা)
  const nativeLang = useMemo(() => {
    return getRestaurantPrimaryLanguage(restaurant || { currency });
  }, [restaurant, currency]);

  // Form State - English & Native Language (বাংলা)
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [badgeText, setBadgeText] = useState('Weekend Special');
  const [badgeTextNative, setBadgeTextNative] = useState('উইকেন্ড স্পেশাল');
  const [title, setTitle] = useState('');
  const [titleNative, setTitleNative] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [includedType, setIncludedType] = useState('list'); // 'list' or 'description'
  const [includedHeading, setIncludedHeading] = useState('Combo includes');
  const [includedHeadingNative, setIncludedHeadingNative] = useState('কম্বোতে যা থাকছে');
  const [includedItems, setIncludedItems] = useState([
    'Double smash burger',
    'Crispy fries',
    'Coke · 350 ml',
    'Dip sauce · 30 ml'
  ]);
  const [includedItemsNative, setIncludedItemsNative] = useState([
    'ডাবল স্ম্যাশ বার্গার',
    'ক্রিস্পি ফ্রাইস',
    'কোক • ৩৫০ মিলি',
    'ডিপ সস • ৩০ মিলি'
  ]);
  const [subtitle, setSubtitle] = useState('');
  const [subtitleNative, setSubtitleNative] = useState('');
  const [foodImage, setFoodImage] = useState('');
  const [bgImage, setBgImage] = useState('');
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isPng, setIsPng] = useState(true);
  const [autoNotification, setAutoNotification] = useState(false);

  // Preview tab & language: 'slider' | 'details' and 'en' | 'bn'
  const [previewTab, setPreviewTab] = useState('slider');
  const [previewLang, setPreviewLang] = useState('bn');

  const MAX_INCLUDED_ITEMS = 4;

  const resetForm = () => {
    setIsUploadingBg(false);
    setPreviewTab('slider');

    if (editingSlider) {
      const linkedFood = foods.find(f => String(f.id) === String(editingSlider.foodId));
      setSelectedFoodId(String(editingSlider.foodId || ''));
      setBadgeText(editingSlider.badge || 'Weekend Special');
      setBadgeTextNative(editingSlider.badge_native || editingSlider.badge_bn || '');
      setTitle(editingSlider.title || '');
      setTitleNative(editingSlider.title_native || editingSlider.title_bn || '');
      setCustomPrice(String(editingSlider.price !== undefined ? editingSlider.price : ''));
      setIncludedType(editingSlider.includedType || 'list');
      setIncludedHeading(editingSlider.includedHeading || 'Combo includes');
      setIncludedHeadingNative(editingSlider.includedHeading_native || editingSlider.includedHeading_bn || '');
      
      let items = [];
      let itemsNative = [];
      if (Array.isArray(editingSlider.includedItems) && editingSlider.includedItems.length > 0) {
        items = editingSlider.includedItems.map(it => typeof it === 'object' && it ? (it.en || it.text || '') : String(it)).filter(Boolean);
        if (Array.isArray(editingSlider.includedItems_native) || Array.isArray(editingSlider.includedItems_bn)) {
          itemsNative = (editingSlider.includedItems_native || editingSlider.includedItems_bn || []).map(String);
        } else {
          itemsNative = editingSlider.includedItems.map(it => typeof it === 'object' && it ? (it.native || it.textNative || it.text_bn || '') : '');
        }
      } else if (editingSlider.subtitle) {
        items = editingSlider.subtitle
          .split(/\n|\+/)
          .map(s => s.trim().replace(/^[-•*]\s*/, ''))
          .filter(Boolean);
      }
      if (items.length === 0) {
        items = [
          'Double smash burger',
          'Crispy fries',
          'Coke · 350 ml',
          'Dip sauce · 30 ml'
        ];
        itemsNative = [
          'ডাবল স্ম্যাশ বার্গার',
          'ক্রিস্পি ফ্রাইস',
          'কোক • ৩৫০ মিলি',
          'ডিপ সস • ৩০ মিলি'
        ];
      }
      setIncludedItems(items.slice(0, MAX_INCLUDED_ITEMS));
      setIncludedItemsNative(itemsNative.slice(0, MAX_INCLUDED_ITEMS));
      setSubtitle(editingSlider.subtitle || '');
      setSubtitleNative(editingSlider.subtitle_native || editingSlider.subtitle_bn || '');
      setFoodImage(linkedFood?.image || editingSlider.image || '');
      setBgImage(editingSlider.bgImage || editingSlider.bg_image || '');
      setIsPng(editingSlider.isPng !== false);
      setAutoNotification(Boolean(editingSlider.autoNotification));
    } else {
      // New slider: if burger or first food exists, auto-select for convenience
      const defaultFood = foods.find(f => /burger|combo/i.test(f.title)) || foods[0];
      if (defaultFood) {
        setSelectedFoodId(String(defaultFood.id));
        setBadgeText('Weekend Special');
        setBadgeTextNative('উইকেন্ড স্পেশাল');
        setTitle(defaultFood.title || 'Double Smash Burger Combo');
        setTitleNative(defaultFood.title_bn || defaultFood.name_bn || defaultFood.name_native || 'ডাবল স্ম্যাশ বার্গার কম্বো');
        setCustomPrice(String(defaultFood.price || 380));
        setFoodImage(defaultFood.image || '');
        setIsPng(defaultFood.isPng !== false);
      } else {
        setSelectedFoodId('');
        setBadgeText('Weekend Special');
        setBadgeTextNative('উইকেন্ড স্পেশাল');
        setTitle('Double Smash Burger Combo');
        setTitleNative('ডাবল স্ম্যাশ বার্গার কম্বো');
        setCustomPrice('380');
        setFoodImage('');
        setIsPng(true);
      }
      setIncludedType('list');
      setIncludedHeading('Combo includes');
      setIncludedHeadingNative('কম্বোতে যা থাকছে');
      setIncludedItems([
        'Double smash burger',
        'Crispy fries',
        'Coke · 350 ml',
        'Dip sauce · 30 ml'
      ]);
      setIncludedItemsNative([
        'ডাবল স্ম্যাশ বার্গার',
        'ক্রিস্পি ফ্রাইস',
        'কোক • ৩৫০ মিলি',
        'ডিপ সস • ৩০ মিলি'
      ]);
      setSubtitle('Two smashed beef patties with caramelized onions, cheddar cheese and signature smash sauce.');
      setSubtitleNative('দুটি স্ম্যাশড বিফ প্যাটি, ক্যারামেলাইজড পেঁয়াজ, চেডার চিজ এবং স্পেশাল স্ম্যাশ সস দিয়ে তৈরি।');
      setBgImage('');
      setAutoNotification(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, editingSlider]);

  const handleFoodSelect = (foodId) => {
    setSelectedFoodId(String(foodId));
    if (!foodId) {
      setTitle('');
      setTitleNative('');
      setCustomPrice('');
      setFoodImage('');
      return;
    }
    const found = foods.find(f => String(f.id) === String(foodId));
    if (found) {
      setTitle(found.title || '');
      setTitleNative(found.title_bn || found.name_bn || found.name_native || '');
      const regularPrice = Number(found.oldPrice || found.price || 0);
      setCustomPrice(String(found.price !== undefined && found.price !== null ? found.price : regularPrice));
      setFoodImage(found.image || '');
      setIsPng(found.isPng !== false);
      if (found.description && includedType === 'description') {
        setSubtitle(found.description);
        if (found.description_bn || found.description_native) {
          setSubtitleNative(found.description_bn || found.description_native);
        }
      }
    }
  };

  const handleAddItem = () => {
    if (includedItems.length >= MAX_INCLUDED_ITEMS) return;
    setIncludedItems(prev => [...prev, '']);
    setIncludedItemsNative(prev => [...prev, '']);
  };

  const handleUpdateItem = (index, value) => {
    setIncludedItems(prev => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleUpdateItemNative = (index, value) => {
    setIncludedItemsNative(prev => {
      const next = [...prev];
      while (next.length <= index) next.push('');
      next[index] = value;
      return next;
    });
  };

  const handleRemoveItem = (index) => {
    setIncludedItems(prev => prev.filter((_, i) => i !== index));
    setIncludedItemsNative(prev => prev.filter((_, i) => i !== index));
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setIsUploadingBg(true);
    try {
      const res = await compressImage(file, {
        maxWidth: 900,
        maxHeight: 500,
        quality: 0.75,
        autoTrimTransparency: false
      });
      if (res && res.dataUrl) {
        setBgImage(res.dataUrl);
      }
    } catch (err) {
      console.error('Error compressing banner background:', err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setBgImage(ev.target.result);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleSave = (publishState = true) => {
    const linkedFood = foods.find(f => String(f.id) === String(selectedFoodId));
    const finalFoodImg = foodImage || linkedFood?.image || '';
    const cleanItems = includedItems.map(s => s.trim()).filter(Boolean).slice(0, MAX_INCLUDED_ITEMS);
    const cleanItemsNative = includedItemsNative.map(s => (s || '').trim()).slice(0, cleanItems.length);

    const slideToSave = {
      id: editingSlider ? editingSlider.id : `slide_${Date.now()}`,
      badge: badgeText.trim() || 'Weekend Special',
      badge_native: badgeTextNative.trim() || undefined,
      badge_bn: badgeTextNative.trim() || undefined,
      title: title.trim() || 'Double Smash Burger Combo',
      title_native: titleNative.trim() || undefined,
      title_bn: titleNative.trim() || undefined,
      subtitle: includedType === 'description' ? subtitle.trim() : cleanItems.join(' + '),
      subtitle_native: includedType === 'description'
        ? (subtitleNative.trim() || undefined)
        : (cleanItemsNative.filter(Boolean).length > 0 ? cleanItemsNative.join(' + ') : undefined),
      subtitle_bn: includedType === 'description'
        ? (subtitleNative.trim() || undefined)
        : (cleanItemsNative.filter(Boolean).length > 0 ? cleanItemsNative.join(' + ') : undefined),
      includedType: includedType,
      includedHeading: includedHeading.trim() || 'Combo includes',
      includedHeading_native: includedHeadingNative.trim() || undefined,
      includedHeading_bn: includedHeadingNative.trim() || undefined,
      includedItems: cleanItems.length > 0 ? cleanItems : ['Double smash burger', 'Crispy fries', 'Coke · 350 ml', 'Dip sauce · 30 ml'],
      includedItems_native: cleanItemsNative.length > 0 ? cleanItemsNative : undefined,
      includedItems_bn: cleanItemsNative.length > 0 ? cleanItemsNative : undefined,
      foodId: selectedFoodId,
      foodTitle: title.trim(),
      price: Number(customPrice || 0),
      image: finalFoodImg,
      bgImage: bgImage ? bgImage.trim() : '',
      isPng: isPng,
      isActive: publishState,
      autoNotification: Boolean(autoNotification || editingSlider?.autoNotification),
      displayOrder: editingSlider ? (editingSlider.displayOrder || Date.now()) : Date.now()
    };

    onSave(slideToSave);
    handleClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const canSave = title.trim() !== '' && selectedFoodId !== '';
  const effectiveItems = includedItems.filter(s => s.trim() !== '');
  const displayItems = effectiveItems.length > 0 ? effectiveItems : ['Double smash burger', 'Crispy fries', 'Coke · 350 ml', 'Dip sauce · 30 ml'];

  const isBnPreview = previewLang === 'bn';
  const previewBadge = isBnPreview
    ? (badgeTextNative.trim() || badgeText.trim() || 'উইকেন্ড স্পেশাল')
    : (badgeText.trim() || 'Weekend Special');

  const previewTitle = isBnPreview
    ? (titleNative.trim() || title.trim() || 'ডাবল স্ম্যাশ বার্গার কম্বো')
    : (title.trim() || 'Double Smash Burger Combo');

  const previewHeading = isBnPreview
    ? (includedHeadingNative.trim() || includedHeading.trim() || 'কম্বোতে যা থাকছে')
    : (includedHeading.trim() || 'Combo includes');

  const previewSubtitle = isBnPreview
    ? (subtitleNative.trim() || subtitle.trim() || 'দুটি স্ম্যাশড বিফ প্যাটি, ক্যারামেলাইজড পেঁয়াজ ও সিক্রেট সস দিয়ে তৈরি।')
    : (subtitle.trim() || 'Two smashed beef patties with caramelized onions, cheddar cheese and signature smash sauce.');

  const effectiveItemsNative = includedItems.map((enItem, idx) => {
    const nat = (includedItemsNative[idx] || '').trim();
    if (nat) return nat;
    return enItem.trim();
  }).filter(Boolean);

  const previewDisplayItems = isBnPreview
    ? (effectiveItemsNative.length > 0 ? effectiveItemsNative : ['ডাবল স্ম্যাশ বার্গার', 'ক্রিস্পি ফ্রাইস', 'কোক • ৩৫০ মিলি', 'ডিপ সস • ৩০ মিলি'])
    : displayItems;

  const previewPriceDisplay = isBnPreview
    ? `${currency}${toBengaliDigits(customPrice || '380')}`
    : `${currency}${customPrice || '380'}`;

  const previewBtnText = isBnPreview ? 'কম্বো এক্সপ্লোর করুন' : 'Explore combo';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm select-auto">
      <div className={`w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isDark ? 'bg-[#0E1526] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>

        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-slate-800/80 bg-[#0A0F1D]' : 'border-slate-200 bg-slate-50/70'
        }`}>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              {editingSlider ? 'Edit Featured Special Slider' : 'Create New Featured Special Slider'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose a food item, add your offer and preview it live.
            </p>
          </div>

          <button
            onClick={handleClose}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer ${
              isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT COLUMN: Inputs (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">

              {/* CARD 1: Offer details */}
              <div className={`p-4 sm:p-5 rounded-xl border space-y-3.5 ${
                isDark ? 'bg-[#121B30] border-slate-800/80 shadow-sm' : 'bg-white border-slate-200/90 shadow-xs'
              }`}>
                <div className="flex items-center gap-2 pb-0.5">
                  <Tag className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-bold tracking-tight">Offer details</h3>
                </div>

                {/* Food Item Select */}
                <div>
                  <label className="text-xs font-semibold block mb-1.5 text-slate-700 dark:text-slate-300">
                    Food item <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFoodId}
                      onChange={(e) => handleFoodSelect(e.target.value)}
                      className={`w-full appearance-none pl-3.5 pr-10 py-2.5 rounded-lg border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors cursor-pointer ${
                        isDark ? 'bg-[#0A0F1D] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="">Select a food item...</option>
                      {foods.map(f => (
                        <option key={f.id} value={String(f.id)}>
                          {f.title} ({f.category}) — {currency}{Number(f.price || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                    Food photo and menu price are linked automatically.
                  </span>
                </div>

                {/* Badge text (English & Native) + Offer price Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold block mb-1.5 text-slate-700 dark:text-slate-300">
                      Badge text (English)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Weekend Special"
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                        isDark ? 'bg-[#0A0F1D] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1.5 text-slate-700 dark:text-slate-300">
                      Badge text ({nativeLang.nativeName}) <span className="text-[10px] text-slate-400 font-normal">(ঐচ্ছিক)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: উইকেন্ড স্পেশাল, ধামাকা অফার"
                      value={badgeTextNative}
                      onChange={(e) => setBadgeTextNative(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                        isDark ? 'bg-[#0A0F1D] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1.5 text-slate-700 dark:text-slate-300">
                      Offer price ({currency}) <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="380"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                        isDark ? 'bg-[#0A0F1D] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Main title (English & Native) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold block mb-1.5 text-slate-700 dark:text-slate-300">
                      Main title (English) <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Double Smash Burger Combo"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                        isDark ? 'bg-[#0A0F1D] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1.5 text-slate-700 dark:text-slate-300">
                      Main title ({nativeLang.nativeName}) <span className="text-[10px] text-slate-400 font-normal">(ঐচ্ছিক)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: ডাবল স্ম্যাশ বার্গার কম্বো"
                      value={titleNative}
                      onChange={(e) => setTitleNative(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                        isDark ? 'bg-[#0A0F1D] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: What's included */}
              <div className={`p-4 sm:p-5 rounded-xl border space-y-3.5 ${
                isDark ? 'bg-[#121B30] border-slate-800/80 shadow-sm' : 'bg-white border-slate-200/90 shadow-xs'
              }`}>
                <div className="flex items-center gap-2 pb-0.5">
                  <ListChecks className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-bold tracking-tight">What's included</h3>
                </div>

                {/* Radio selection toggle pills: Item list vs Short description */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIncludedType('list')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      includedType === 'list'
                        ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-xs'
                        : isDark
                          ? 'border-slate-700 text-slate-400 hover:bg-slate-800/60'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      includedType === 'list' ? 'border-orange-500' : 'border-slate-400'
                    }`}>
                      {includedType === 'list' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                    </span>
                    <span>Item list</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIncludedType('description')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      includedType === 'description'
                        ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-xs'
                        : isDark
                          ? 'border-slate-700 text-slate-400 hover:bg-slate-800/60'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      includedType === 'description' ? 'border-orange-500' : 'border-slate-400'
                    }`}>
                      {includedType === 'description' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                    </span>
                    <span>Short description</span>
                  </button>
                </div>

                {includedType === 'list' ? (
                  <div className="space-y-3 pt-1">
                    {/* Section heading (English & Native) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                          Section heading (English)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Combo includes"
                          value={includedHeading}
                          onChange={(e) => setIncludedHeading(e.target.value)}
                          className={`w-full px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                            isDark ? 'bg-[#0A0F1D] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                          Section heading ({nativeLang.nativeName}) <span className="text-[10px] text-slate-400 font-normal">(ঐচ্ছিক)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="যেমন: কম্বোতে যা থাকছে"
                          value={includedHeadingNative}
                          onChange={(e) => setIncludedHeadingNative(e.target.value)}
                          className={`w-full px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                            isDark ? 'bg-[#0A0F1D] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Dynamic List Items (English & Native) */}
                    <div className="space-y-2.5">
                      {includedItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="text-slate-400 hover:text-slate-600 cursor-grab p-1 shrink-0">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-w-0">
                            <input
                              type="text"
                              placeholder={`Item ${idx + 1} (English) e.g. Crispy fries`}
                              value={item}
                              onChange={(e) => handleUpdateItem(idx, e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                                isDark ? 'bg-[#0A0F1D] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                            <input
                              type="text"
                              placeholder={`Item ${idx + 1} (${nativeLang.nativeName}) যেমন: ক্রিস্পি ফ্রাইস`}
                              value={includedItemsNative[idx] || ''}
                              onChange={(e) => handleUpdateItemNative(idx, e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                                isDark ? 'bg-[#0A0F1D] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                            title="Remove item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Item Button */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        disabled={includedItems.length >= MAX_INCLUDED_ITEMS}
                        onClick={handleAddItem}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                          includedItems.length >= MAX_INCLUDED_ITEMS
                            ? 'opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-700 text-slate-400'
                            : 'border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 cursor-pointer'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add item ({includedItems.length}/{MAX_INCLUDED_ITEMS})</span>
                      </button>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {includedItems.length >= MAX_INCLUDED_ITEMS
                          ? 'Maximum 4 items reached.'
                          : 'Maximum 4 items allowed. Each item has English & Native language names.'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                        Description text (English)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Flame-grilled Angus patty with melted Wisconsin cheddar & secret sauce..."
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none ${
                          isDark ? 'bg-[#0A0F1D] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                        Description text ({nativeLang.nativeName}) <span className="text-[10px] text-slate-400 font-normal">(ঐচ্ছিক)</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="যেমন: দুটি স্ম্যাশড বিফ প্যাটি, ক্যারামেলাইজড পেঁয়াজ ও সিক্রেট সস..."
                        value={subtitleNative}
                        onChange={(e) => setSubtitleNative(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none ${
                          isDark ? 'bg-[#0A0F1D] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 3: Images */}
              <div className={`p-4 sm:p-5 rounded-xl border space-y-3.5 ${
                isDark ? 'bg-[#121B30] border-slate-800/80 shadow-sm' : 'bg-white border-slate-200/90 shadow-xs'
              }`}>
                <div className="flex items-center gap-2 pb-0.5">
                  <ImageIcon className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-bold tracking-tight">Images</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Food photo box */}
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                    isDark ? 'bg-[#0A0F1D] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="w-14 h-14 rounded-lg bg-black/10 dark:bg-black/30 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      {foodImage ? (
                        <img src={foodImage} alt="Food cutout" className="w-full h-full object-contain" />
                      ) : (
                        <Utensils className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Food photo</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">From menu item</p>
                    </div>
                  </div>

                  {/* Background box */}
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                    isDark ? 'bg-[#0A0F1D] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="w-14 h-14 rounded-lg bg-black/20 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden relative">
                      {bgImage ? (
                        <img src={bgImage} alt="Background preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#2b170c] via-[#1a0e06] to-[#0a0502] flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-amber-500/60" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Background</p>
                      <label className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer mt-0.5">
                        <Upload className="w-3 h-3" />
                        <span>{isUploadingBg ? 'Uploading...' : 'Change'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          disabled={isUploadingBg}
                          onChange={handleBgUpload}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Subtext and reset background */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-1.5 pt-0.5">
                  <span>Optional background · 16:9 · No text or food</span>
                  {bgImage && (
                    <button
                      type="button"
                      onClick={() => setBgImage('')}
                      className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Use default background</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Live preview (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-3">

              {/* Live Preview Header & Tabs */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Eye className="w-3.5 h-3.5 text-orange-500" />
                    <span>Live preview</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Updates as you type.</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Language switch toggle: EN vs Native */}
                  <div className={`flex items-center p-0.5 rounded-lg border text-[11px] ${
                    isDark ? 'bg-[#0A0F1D] border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setPreviewLang('en')}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        previewLang === 'en'
                          ? 'bg-white dark:bg-[#1A243B] text-orange-600 dark:text-orange-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Preview English version"
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewLang('bn')}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        previewLang === 'bn'
                          ? 'bg-white dark:bg-[#1A243B] text-orange-600 dark:text-orange-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title={`Preview ${nativeLang.nativeName || 'বাংলা'} version`}
                    >
                      {nativeLang.nativeName || 'বাংলা'}
                    </button>
                  </div>

                  {/* Tab switch pills */}
                  <div className={`flex items-center p-1 rounded-lg border text-xs ${
                    isDark ? 'bg-[#0A0F1D] border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('slider')}
                      className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        previewTab === 'slider'
                          ? 'bg-white dark:bg-[#1A243B] text-orange-600 dark:text-orange-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Menu slider
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('details')}
                      className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        previewTab === 'details'
                          ? 'bg-white dark:bg-[#1A243B] text-orange-600 dark:text-orange-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Food details
                    </button>
                  </div>
                </div>
              </div>

              {/* Phone Frame */}
              <div className="w-full bg-[#07090E] border border-zinc-800 rounded-[28px] p-3.5 sm:p-4 shadow-2xl relative select-none">

                {previewTab === 'slider' ? (
                  /* TAB 1: MENU SLIDER PREVIEW */
                  <div>
                    {/* Header inside phone */}
                    <div className="flex items-center justify-between mb-3 px-1 text-xs">
                      <div className="flex items-center gap-1.5 text-[#F59E0B] font-black tracking-wider text-[11px]">
                        <Flame className="w-3.5 h-3.5 fill-[#F59E0B]" />
                        <span>{isBnPreview ? 'স্পেশাল অফার সমূহ' : 'FEATURED SPECIALS'}</span>
                      </div>
                      <span className="text-zinc-500 font-bold text-[10px]">
                        {isBnPreview ? '০১ / ০১' : '01 / 01'}
                      </span>
                    </div>

                    {/* Exact Card matching Image 1: 200px unified layout */}
                    <div className="relative overflow-hidden rounded-2xl border border-[#F59E0B]/50 shadow-xl bg-[#140D07] h-[200px]">
                      {/* Background */}
                      {bgImage ? (
                        <>
                          <img
                            src={bgImage}
                            alt={previewTitle}
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

                      {/* Food cutout on right side */}
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 w-40 h-40 flex items-center justify-center z-15 pointer-events-none">
                        {foodImage ? (
                          <img
                            src={foodImage}
                            alt={previewTitle}
                            className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] scale-110"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                            <Utensils className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      {/* Left Content: Badge, Title, Price & Explore Combo */}
                      <div className="relative z-20 h-full p-4 flex flex-col justify-between max-w-[58%]">
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#F59E0B] bg-black/40 text-[#F59E0B] text-[10px] font-black uppercase tracking-wider w-fit">
                            {previewBadge}
                          </div>
                          <h4 className={`text-white font-black text-lg leading-snug line-clamp-2 ${isBnPreview ? 'tracking-normal [word-spacing:0.18em]' : 'tracking-tight'}`}>
                            {previewTitle}
                          </h4>
                        </div>

                        <div className="pt-2 mt-auto space-y-2">
                          <span className="text-[#F59E0B] font-black text-2xl tracking-tight tabular-nums block leading-none">
                            {previewPriceDisplay}
                          </span>
                          <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F59E0B] text-black font-black text-xs shadow-md w-fit">
                            <span>{previewBtnText}</span>
                            <ArrowRight className="w-3.5 h-3.5 stroke-[2.8]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pagination Dots indicator */}
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <div className="w-6 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    </div>

                    <p className="text-[11px] text-center text-zinc-500 mt-2">
                      {isBnPreview ? 'এক্সপ্লোর করুন বাটনে ক্লিক করলে ফুড বিস্তারিত ওপেন হবে।' : 'Explore combo opens the selected food item.'}
                    </p>
                  </div>
                ) : (
                  /* TAB 2: FOOD DETAILS MODAL PREVIEW */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className={`text-white font-black text-base leading-tight line-clamp-1 ${isBnPreview ? 'tracking-normal [word-spacing:0.18em]' : 'tracking-tight'}`}>
                        {previewTitle}
                      </h4>
                      <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <X className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Tags row */}
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded-full border border-orange-500/80 bg-orange-500/10 text-orange-400 font-bold uppercase">
                        {isBnPreview ? 'বেস্ট সেলার' : 'BEST SELLER'}
                      </span>
                      <span className="text-zinc-500">|</span>
                      <span className="text-zinc-400">{isBnPreview ? 'স্ম্যাশ বার্গার' : 'Smash Burgers'}</span>
                      <span className="text-zinc-500">|</span>
                      <span className="flex items-center gap-1 text-zinc-300">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{isBnPreview ? `${toBengaliDigits('4.9')} (${toBengaliDigits('142')})` : '4.9 (142)'}</span>
                      </span>
                    </div>

                    <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-2">
                      {previewSubtitle}
                    </p>

                    {/* The Card inside Food Details Modal (Exact match with Image 2) */}
                    <div className="relative overflow-hidden rounded-2xl border border-[#F59E0B]/50 shadow-xl bg-[#140D07] min-h-[290px]">
                      {/* Background */}
                      {bgImage ? (
                        <>
                          <img
                            src={bgImage}
                            alt={previewTitle}
                            className="absolute inset-0 w-full h-full object-cover object-center"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-transparent pointer-events-none z-10" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 pointer-events-none z-10" />
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-[#231409] via-[#170c04] to-[#0d0703]" />
                          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-[#F59E0B]/15 blur-3xl pointer-events-none" />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent pointer-events-none z-10" />
                        </>
                      )}

                      {/* Food cutout on bottom right */}
                      <div className="absolute right-0 bottom-0 w-44 h-40 z-15 flex items-end justify-end pointer-events-none pr-1 pb-1">
                        {foodImage ? (
                          <img
                            src={foodImage}
                            alt={previewTitle}
                            className="w-full h-full object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.9)] scale-105"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 m-2">
                            <Utensils className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Left Content (Z-index 20) */}
                      <div className="relative z-20 p-3.5 flex flex-col justify-between h-full min-h-[290px] max-w-[65%]">
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full border border-[#F59E0B] bg-black/40 text-[#F59E0B] text-[9px] font-black uppercase tracking-wider w-fit">
                            {previewBadge}
                          </div>
                          <h4 className={`text-white font-black text-base leading-snug ${isBnPreview ? 'tracking-normal [word-spacing:0.18em]' : 'tracking-tight'}`}>
                            {previewTitle}
                          </h4>

                          <div className="pt-1 space-y-1">
                            {includedType === 'description' && previewSubtitle ? (
                              <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3">
                                {previewSubtitle}
                              </p>
                            ) : (
                              <div>
                                <p className="text-[10px] font-bold text-white mb-1">
                                  {previewHeading}
                                </p>
                                <div className="space-y-0.5">
                                  {previewDisplayItems.slice(0, MAX_INCLUDED_ITEMS).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                                      <span className="line-clamp-1">{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 mt-auto">
                          <span className="text-[#F59E0B] font-black text-xl tracking-tight tabular-nums">
                            {previewPriceDisplay}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom bar preview */}
                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">
                          {isBnPreview ? 'আইটেমের মোট মূল্য' : 'ITEM TOTAL AMOUNT'}
                        </span>
                        <span className="text-[#F59E0B] font-black text-base">
                          {previewPriceDisplay}
                        </span>
                      </div>
                      <div className="px-3.5 py-1.5 rounded-full bg-[#F59E0B] text-black font-black text-[11px] flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isBnPreview ? 'অর্ডার তালিকায় যোগ করুন' : 'ADD TO ORDER LIST'}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className={`px-6 py-4 border-t flex items-center justify-between shrink-0 ${
          isDark ? 'border-slate-800/80 bg-[#0A0F1D]' : 'border-slate-200 bg-slate-50/70'
        }`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className={`px-4 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>

            {editingSlider && (
              <button
                type="button"
                onClick={() => setAutoNotification(prev => !prev)}
                className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  autoNotification
                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/40'
                    : isDark ? 'border-slate-700 bg-slate-800/80 text-slate-400' : 'border-slate-300 bg-slate-100 text-slate-500'
                }`}
                title={autoNotification ? 'Auto notification enabled: will broadcast to followers upon update' : 'Auto notification disabled: silent update'}
              >
                <Bell className={`w-3.5 h-3.5 ${autoNotification ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>Auto Notification: {autoNotification ? 'ON' : 'OFF'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={!canSave}
              onClick={() => handleSave(false)}
              className={`px-4 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              Save draft
            </button>

            <button
              type="button"
              disabled={!canSave}
              onClick={() => handleSave(true)}
              className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
            >
              <span>{editingSlider ? 'Update slider' : 'Publish slider'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
