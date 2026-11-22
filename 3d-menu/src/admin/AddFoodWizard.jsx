import React, { useState, useEffect, useMemo } from 'react';
import { compressImage } from '../lib/imageCompressor';
import { uploadMediaFile } from '../lib/mediaStorageService';
import {
  X,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Plus,
  Utensils,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  FileText,
  Tag,
  SlidersHorizontal,
  Pencil,
  Search,
  Menu,
  Info,
  Star,
  CheckCircle2
} from 'lucide-react';
import {
  getRestaurantPrimaryLanguage,
  toBengaliDigits,
  formatBadgeText,
  translateFoodTitle,
  translateFoodDescription,
  translateCategoryName,
  translateSubcategoryName,
  translatePortionName,
  translateAddonName
} from '../utils/translations';

export default function AddFoodWizard({
  isOpen,
  onClose,
  onSave,
  categories = [],
  editingFood = null,
  currency: propCurrency = '৳',
  restaurant = null,
  theme = 'light'
}) {
  const [currentStep, setCurrentStep] = useState(1);

  // Dynamic primary native language for the registered restaurant country
  const nativeLang = useMemo(() => {
    return getRestaurantPrimaryLanguage(restaurant || { currency: propCurrency });
  }, [restaurant, propCurrency]);

  // De-duplicate categories for dropdown
  const uniqueCategories = useMemo(() => {
    const list = Array.from(new Set(
      (categories || [])
        .map(c => (typeof c === 'object' && c ? c.name : c))
        .filter(c => Boolean(c) && String(c).trim().toLowerCase() !== 'all')
        .map(c => String(c).trim())
    ));
    if (list.length === 0) return ['Main Course', 'Appetizers', 'Beverages', 'Dessert'];
    return list;
  }, [categories]);

  // Currency State (default from prop, user selectable)
  const [currency, setCurrency] = useState(propCurrency || '৳');
  useEffect(() => {
    if (propCurrency) setCurrency(propCurrency);
  }, [propCurrency]);

  // Step 1: Food Details State (English + Native Language)
  const [foodName, setFoodName] = useState('');
  const [foodNameNative, setFoodNameNative] = useState('');
  const [category, setCategory] = useState(uniqueCategories[0] || 'Main Course');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionNative, setDescriptionNative] = useState('');
  const [badgeTag, setBadgeTag] = useState('Best Selling');
  const [foodImage, setFoodImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageMeta, setImageMeta] = useState(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Step 2: Size & Price State
  const [hasDifferentSizes, setHasDifferentSizes] = useState(false);
  const [singlePrice, setSinglePrice] = useState('');
  const [singleOldPrice, setSingleOldPrice] = useState('');
  const [discountMode, setDiscountMode] = useState('none'); // 'none' | 'percent' | 'fixed'
  const [discountValue, setDiscountValue] = useState('');
  const [defaultSizeIndex, setDefaultSizeIndex] = useState(0);
  const [bulkDiscountMode, setBulkDiscountMode] = useState('percent');
  const [bulkDiscountValue, setBulkDiscountValue] = useState('20');
  const [portions, setPortions] = useState([
    { name: 'Half', nameNative: '', regularPrice: '180', price: '144', discountMode: 'percent', discountValue: '20' },
    { name: 'Full', nameNative: '', regularPrice: '320', price: '320', discountMode: 'none', discountValue: '' }
  ]);

  // Step 3: Extra Choices / Addons State
  const [hasExtraChoices, setHasExtraChoices] = useState(false);
  const [choiceGroupName, setChoiceGroupName] = useState('Extra Add-ons');
  const [selectionType, setSelectionType] = useState('multiple'); // 'multiple' | 'single' | 'required'
  const [maxSelections, setMaxSelections] = useState(2);
  const [extraOptions, setExtraOptions] = useState([
    { name: 'Extra Egg', nameNative: '', price: '30' },
    { name: 'Extra Meat', nameNative: '', price: '120' }
  ]);
  const [draggedOptionIdx, setDraggedOptionIdx] = useState(null);

  // Step 4: Preview State
  const [previewLang, setPreviewLang] = useState('en'); // 'en' | 'bn'
  const [previewSelectedPortion, setPreviewSelectedPortion] = useState(0);
  const [previewSelectedAddons, setPreviewSelectedAddons] = useState([]);

  // Form Reset Function
  const resetForm = () => {
    setCurrentStep(1);
    setShowGuidelines(false);
    if (editingFood) {
      setFoodName(editingFood.title || '');
      setFoodNameNative(
        editingFood.title_bn ||
        editingFood.name_bn ||
        editingFood.name_native ||
        editingFood.customizable?.title_bn ||
        editingFood.customizable?.name_native ||
        ''
      );
      setCategory(editingFood.category || uniqueCategories[0] || 'Main Course');
      setSubcategory(editingFood.subcategory || '');
      setDescription(editingFood.description || '');
      setDescriptionNative(
        editingFood.description_bn ||
        editingFood.description_native ||
        editingFood.customizable?.description_bn ||
        editingFood.customizable?.description_native ||
        ''
      );
      setBadgeTag(editingFood.tag || 'Best Selling');
      setFoodImage(editingFood.image || '');
      setImagePreview(editingFood.image || '');

      const hasPortions = editingFood.customizable?.portions && editingFood.customizable.portions.length > 0;
      setHasDifferentSizes(Boolean(hasPortions && editingFood.customizable.portions.length > 1));
      if (hasPortions) {
        const baseP = Number(editingFood.price || 0);
        const baseOldP = Number(editingFood.oldPrice || 0);
        setPortions(editingFood.customizable.portions.map(p => {
          const sellingP = p.price !== undefined ? Number(p.price) : (baseP + Number(p.extra || 0));
          const regularP = p.oldPrice !== undefined
            ? Number(p.oldPrice)
            : (baseOldP > baseP ? (baseOldP + Number(p.extra || 0)) : sellingP);
          const hasDiscount = regularP > sellingP;
          let mode = p.discountMode || (hasDiscount ? 'percent' : 'none');
          let val = p.discountValue || '';
          if (hasDiscount && !val) {
            const pct = Math.round(((regularP - sellingP) / regularP) * 100);
            val = String(pct);
          }
          return {
            name: p.name || '',
            nameNative: p.name_native || p.name_bn || p.nameNative || '',
            regularPrice: String(regularP || sellingP || ''),
            price: String(sellingP || ''),
            discountMode: mode,
            discountValue: val
          };
        }));
        setDefaultSizeIndex(0);
        setSinglePrice('');
        setSingleOldPrice('');
        setDiscountMode('none');
        setDiscountValue('');
      } else {
        const numOld = Number(editingFood.oldPrice);
        const numNew = Number(editingFood.price);
        const hasOldPrice = Boolean(numOld && numOld > numNew);
        if (hasOldPrice) {
          setSingleOldPrice(String(numOld));
          setSinglePrice(String(numNew));
          const diff = numOld - numNew;
          const pct = Math.round((diff / numOld) * 100);
          const savedMode = editingFood.discountMode ||
                            editingFood.discountType ||
                            editingFood.customizable?.discountMode ||
                            editingFood.customizable?.discountType;
          if (savedMode === 'fixed' || savedMode === 'flat') {
            setDiscountMode('fixed');
            setDiscountValue(String(editingFood.discountValue || editingFood.customizable?.discountValue || (diff % 1 === 0 ? diff : diff.toFixed(2))));
          } else if (savedMode === 'percent') {
            setDiscountMode('percent');
            setDiscountValue(String(editingFood.discountValue || editingFood.customizable?.discountValue || pct));
          } else if (Math.abs(numNew - (numOld * (1 - pct / 100))) < 0.1) {
            setDiscountMode('percent');
            setDiscountValue(String(pct));
          } else {
            setDiscountMode('fixed');
            setDiscountValue(String(diff % 1 === 0 ? diff : diff.toFixed(2)));
          }
        } else {
          setSinglePrice(String(editingFood.price || ''));
          setSingleOldPrice('');
          setDiscountMode('none');
          setDiscountValue('');
        }
        setPortions([
          { name: 'Half', nameNative: '', regularPrice: '180', price: '144', discountMode: 'percent', discountValue: '20' },
          { name: 'Full', nameNative: '', regularPrice: '320', price: '320', discountMode: 'none', discountValue: '' }
        ]);
        setDefaultSizeIndex(0);
      }

      const hasAddons = editingFood.customizable?.addons && editingFood.customizable.addons.length > 0;
      setHasExtraChoices(Boolean(hasAddons));
      if (hasAddons) {
        setExtraOptions(editingFood.customizable.addons.map(a => ({
          name: a.name || '',
          nameNative: a.name_native || a.name_bn || a.nameNative || '',
          price: String(a.price || 0)
        })));
        setChoiceGroupName(editingFood.customizable?.choiceGroupName || 'Extra Add-ons');
        setSelectionType(editingFood.customizable?.selectionType || 'multiple');
        setMaxSelections(editingFood.customizable?.maxSelections || 2);
      } else {
        setExtraOptions([
          { name: 'Extra Egg', nameNative: '', price: '30' },
          { name: 'Extra Meat', nameNative: '', price: '120' }
        ]);
        setChoiceGroupName('Extra Add-ons');
        setSelectionType('multiple');
        setMaxSelections(2);
      }
      setImageMeta(null);
    } else {
      setFoodName('');
      setFoodNameNative('');
      setCategory(uniqueCategories[0] || 'Main Course');
      setSubcategory('');
      setDescription('');
      setDescriptionNative('');
      setBadgeTag('Best Selling');
      setFoodImage('');
      setImagePreview('');
      setImageMeta(null);
      setIsOptimizingImage(false);
      setHasDifferentSizes(false);
      setSinglePrice('');
      setSingleOldPrice('');
      setDiscountMode('none');
      setDiscountValue('');
      setPortions([
        { name: 'Half', nameNative: '', regularPrice: '180', price: '144', discountMode: 'percent', discountValue: '20' },
        { name: 'Full', nameNative: '', regularPrice: '320', price: '320', discountMode: 'none', discountValue: '' }
      ]);
      setDefaultSizeIndex(0);
      setHasExtraChoices(false);
      setChoiceGroupName('Extra Add-ons');
      setSelectionType('multiple');
      setMaxSelections(2);
      setExtraOptions([
        { name: 'Extra Egg', nameNative: '', price: '30' },
        { name: 'Extra Meat', nameNative: '', price: '120' }
      ]);
    }
    setPreviewLang('en');
    setPreviewSelectedPortion(0);
    setPreviewSelectedAddons([]);
  };

  // Pricing & Discount Engine Helper Functions
  const calculateDiscountedPrice = (basePrice, mode, val) => {
    const numBase = Number(basePrice) || 0;
    const numVal = Number(val) || 0;
    if (mode === 'none' || numBase <= 0 || numVal <= 0) {
      return basePrice ? String(basePrice) : '';
    }
    if (mode === 'percent') {
      const pct = Math.min(100, Math.max(0, numVal));
      const discountAmt = (numBase * pct) / 100;
      const finalP = Math.max(0, numBase - discountAmt);
      return finalP % 1 === 0 ? String(finalP) : finalP.toFixed(2);
    }
    if (mode === 'fixed') {
      const discountAmt = Math.max(0, numVal);
      const finalP = Math.max(0, numBase - discountAmt);
      return finalP % 1 === 0 ? String(finalP) : finalP.toFixed(2);
    }
    return String(basePrice);
  };

  const handleRegularPriceChange = (val) => {
    setSingleOldPrice(val);
    if (discountMode === 'none') {
      setSinglePrice(val);
    } else {
      const finalP = calculateDiscountedPrice(val, discountMode, discountValue);
      setSinglePrice(finalP);
    }
  };

  const handleDiscountModeChange = (mode) => {
    setDiscountMode(mode);
    const base = singleOldPrice || singlePrice;
    if (mode === 'none') {
      setDiscountValue('');
      setSinglePrice(base);
      setSingleOldPrice('');
    } else {
      setSingleOldPrice(base);
      const finalP = calculateDiscountedPrice(base, mode, discountValue);
      setSinglePrice(finalP);
    }
  };

  const handleDiscountValueChange = (val) => {
    setDiscountValue(val);
    const base = singleOldPrice || singlePrice;
    const finalP = calculateDiscountedPrice(base, discountMode, val);
    setSinglePrice(finalP);
  };

  // Reset every time modal opens or editing food changes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, editingFood]);

  // Handle Photo Upload with Image Engine
  const processSelectedImageFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (.png, .jpg, .webp).');
      return;
    }
    setIsOptimizingImage(true);

    try {
      const res = await compressImage(file, {
        maxWidth: 1080,
        maxHeight: 1080,
        quality: 0.85,
        autoTrimTransparency: true,
        preferWebP: true
      });

      if (res && res.dataUrl) {
        setImagePreview(res.dataUrl);
        setImageMeta({
          width: res.origW || res.width,
          height: res.origH || res.height,
          trimmedW: res.width,
          trimmedH: res.height,
          ratio: (res.width / (res.height || 1)).toFixed(2),
          isOptimal: (res.origW || res.width) >= 500,
          autoTrimmed: res.didTrim
        });

        const safeName = (foodName || file.name || 'dish')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .substring(0, 30);

        const uploadRes = await uploadMediaFile(res.dataUrl, {
          filename: `dish_${safeName}`
        });

        if (uploadRes && uploadRes.url) {
          setFoodImage(uploadRes.url);
        } else {
          setFoodImage(res.dataUrl);
        }
      } else {
        throw new Error('Compression returned empty payload');
      }
    } catch (err) {
      console.warn('Image processing failed, falling back to direct FileReader:', err);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result;
        if (dataUrl) {
          setImagePreview(dataUrl);
          const uploadRes = await uploadMediaFile(dataUrl, { filename: 'dish_fallback' });
          setFoodImage(uploadRes?.url || dataUrl);
          setImageMeta({
            width: 800,
            height: 800,
            trimmedW: 800,
            trimmedH: 800,
            ratio: '1.00',
            isOptimal: true,
            autoTrimmed: false
          });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsOptimizingImage(false);
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSelectedImageFile(file);
    }
    try {
      e.target.value = '';
    } catch (err) {}
  };

  const handleImageDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await processSelectedImageFile(file);
    }
  };

  // Portions Management with Independent MRP & Discounts
  const addPortion = () => {
    setPortions(prev => [
      ...prev,
      {
        name: '',
        nameNative: '',
        regularPrice: '',
        price: '',
        discountMode: 'none',
        discountValue: ''
      }
    ]);
  };

  const updatePortion = (idx, field, val) => {
    setPortions(prev => {
      const next = [...prev];
      const p = { ...next[idx], [field]: val };

      if (field === 'regularPrice') {
        const regP = Number(val) || 0;
        if (p.discountMode === 'none') {
          p.price = val;
        } else {
          p.price = calculateDiscountedPrice(val, p.discountMode, p.discountValue);
        }
      } else if (field === 'discountMode') {
        p.discountMode = val;
        const regP = p.regularPrice || p.price;
        if (val === 'none') {
          p.discountValue = '';
          p.price = regP;
        } else {
          p.regularPrice = regP;
          p.price = calculateDiscountedPrice(regP, val, p.discountValue);
        }
      } else if (field === 'discountValue') {
        p.discountValue = val;
        const regP = p.regularPrice || p.price;
        p.price = calculateDiscountedPrice(regP, p.discountMode, val);
      } else if (field === 'price') {
        p.price = val;
        const numBase = Number(p.regularPrice) || 0;
        const numFinal = Number(val) || 0;
        if (numBase > numFinal && numFinal > 0) {
          if (p.discountMode === 'percent') {
            const pct = Math.round(((numBase - numFinal) / numBase) * 100);
            p.discountValue = String(pct);
          } else if (p.discountMode === 'fixed') {
            const amt = numBase - numFinal;
            p.discountValue = String(amt % 1 === 0 ? amt : amt.toFixed(2));
          }
        }
      }

      next[idx] = p;
      return next;
    });
  };

  // Quick apply discount to ALL portions simultaneously
  const applyDiscountToAllPortions = (mode, val = '') => {
    setPortions(prev => prev.map(p => {
      const reg = p.regularPrice || p.price;
      if (mode === 'none') {
        return {
          ...p,
          regularPrice: reg,
          price: reg,
          discountMode: 'none',
          discountValue: ''
        };
      }
      const finalP = calculateDiscountedPrice(reg, mode, val);
      return {
        ...p,
        regularPrice: reg,
        price: finalP,
        discountMode: mode,
        discountValue: String(val)
      };
    }));
  };

  const removePortion = (idx) => {
    if (portions.length <= 1) return;
    setPortions(prev => prev.filter((_, i) => i !== idx));
    if (defaultSizeIndex === idx) {
      setDefaultSizeIndex(0);
    } else if (defaultSizeIndex > idx) {
      setDefaultSizeIndex(prev => prev - 1);
    }
  };

  // Extra Choices Management
  const addExtraOption = () => {
    setExtraOptions(prev => [...prev, { name: '', nameNative: '', price: '' }]);
  };
  const updateExtraOption = (idx, field, val) => {
    setExtraOptions(prev => {
      const next = [...prev];
      next[idx][field] = val;
      return next;
    });
  };
  const removeExtraOption = (idx) => {
    setExtraOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleExtraDragStart = (e, index) => {
    setDraggedOptionIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleExtraDragOver = (e, index) => {
    e.preventDefault();
    if (draggedOptionIdx === null || draggedOptionIdx === index) return;
    setExtraOptions(prev => {
      const next = [...prev];
      const [dragged] = next.splice(draggedOptionIdx, 1);
      next.splice(index, 0, dragged);
      return next;
    });
    setDraggedOptionIdx(index);
  };

  const handleExtraDragEnd = () => {
    setDraggedOptionIdx(null);
  };

  // Validation
  const canProceedStep1 = foodName.trim() !== '' && category.trim() !== '';
  const canProceedStep2 = hasDifferentSizes
    ? portions.length > 0 && portions.every(p => p.name.trim() !== '' && p.price !== '')
    : singlePrice !== '' && !isNaN(Number(singlePrice));

  // Save Execution
  const handleFinalSave = () => {
    try {
      const activeDefaultPortion = hasDifferentSizes ? (portions[defaultSizeIndex] || portions[0]) : null;
      const basePriceNum = hasDifferentSizes ? Number(activeDefaultPortion?.price || 0) : Number(singlePrice || 0);
      const baseOldPriceNum = hasDifferentSizes
        ? (activeDefaultPortion?.regularPrice && Number(activeDefaultPortion.regularPrice) > basePriceNum
            ? Number(activeDefaultPortion.regularPrice)
            : (singleOldPrice ? Number(singleOldPrice) : undefined))
        : (singleOldPrice && Number(singleOldPrice) > basePriceNum
            ? Number(singleOldPrice)
            : undefined);

      const customizableData = {
        ...(editingFood?.customizable || {})
      };

      if (foodNameNative.trim()) {
        customizableData.title_bn = foodNameNative.trim();
        customizableData.name_native = foodNameNative.trim();
      } else {
        delete customizableData.title_bn;
        delete customizableData.name_native;
      }

      if (descriptionNative.trim()) {
        customizableData.description_bn = descriptionNative.trim();
        customizableData.description_native = descriptionNative.trim();
      } else {
        delete customizableData.description_bn;
        delete customizableData.description_native;
      }

      const finalDiscountMode = hasDifferentSizes ? (activeDefaultPortion?.discountMode || 'none') : discountMode;
      const finalDiscountType = hasDifferentSizes
        ? (activeDefaultPortion?.discountMode === 'fixed' ? 'flat' : activeDefaultPortion?.discountMode || 'none')
        : (discountMode === 'fixed' ? 'flat' : discountMode);
      const finalDiscountVal = hasDifferentSizes ? (activeDefaultPortion?.discountValue || '') : discountValue;

      customizableData.discountMode = finalDiscountMode;
      customizableData.discountType = finalDiscountType;
      customizableData.discountValue = finalDiscountVal;
      customizableData.defaultSizeIndex = defaultSizeIndex;

      if (hasDifferentSizes) {
        customizableData.portions = portions.map((p, idx) => {
          const sellingP = Number(p.price || 0);
          const regularP = Number(p.regularPrice || p.price || 0);
          return {
            name: p.name.trim(),
            name_native: p.nameNative?.trim() || undefined,
            name_bn: p.nameNative?.trim() || undefined,
            price: sellingP,
            oldPrice: regularP > sellingP ? regularP : undefined,
            discountMode: p.discountMode || (regularP > sellingP ? 'percent' : 'none'),
            discountValue: p.discountValue || '',
            isDefault: idx === defaultSizeIndex,
            extra: Math.max(0, sellingP - basePriceNum)
          };
        });
      }

      if (hasExtraChoices && extraOptions.length > 0) {
        customizableData.choiceGroupName = choiceGroupName.trim();
        customizableData.selectionType = selectionType;
        customizableData.maxSelections = maxSelections;
        customizableData.addons = extraOptions
          .filter(opt => opt.name.trim() !== '')
          .map((opt, i) => ({
            id: `addon_${Date.now()}_${i}`,
            name: opt.name.trim(),
            name_native: opt.nameNative?.trim() || undefined,
            name_bn: opt.nameNative?.trim() || undefined,
            price: Number(opt.price || 0)
          }));
      }

      const newFood = {
        ...(editingFood || {}),
        id: editingFood ? editingFood.id : Date.now(),
        title: foodName.trim(),
        title_bn: foodNameNative.trim() || undefined,
        name_bn: foodNameNative.trim() || undefined,
        name_native: foodNameNative.trim() || undefined,
        tag: badgeTag && badgeTag !== 'No badge' ? badgeTag : undefined,
        rating: editingFood?.rating ?? 5.0,
        ratingCount: editingFood?.ratingCount ?? 1,
        category: category,
        subcategory: subcategory.trim() || undefined,
        price: basePriceNum,
        oldPrice: baseOldPriceNum,
        discountMode: finalDiscountMode,
        discountType: finalDiscountType,
        discountValue: finalDiscountVal,
        description: description.trim() || 'Prepared fresh with premium quality ingredients.',
        description_bn: descriptionNative.trim() || undefined,
        description_native: descriptionNative.trim() || undefined,
        ingredients: editingFood?.ingredients || ['Fresh Ingredients', 'Chef Selected Spices', 'Signature Sauce'],
        image: foodImage || editingFood?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
        isPng: true,
        themeColor: editingFood?.themeColor || '#EA580C',
        ambientGlow: editingFood?.ambientGlow || 'rgba(234, 88, 12, 0.45)',
        gradient: editingFood?.gradient || 'from-orange-500/25 via-red-500/15 to-transparent',
        is_published: editingFood?.is_published !== undefined ? editingFood.is_published : true,
        status: editingFood?.status || 'published',
        customizable: Object.keys(customizableData).length > 0 ? customizableData : undefined
      };

      onSave(newFood);
      resetForm();
      onClose();
    } catch (err) {
      console.error('Error saving food item:', err);
    }
  };

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 overflow-y-auto select-auto touch-auto font-menu-builder">
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-5xl max-h-[94vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? 'bg-[#111827] border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Header - Heading: Inter Bold 700 */}
        <div className={`px-6 sm:px-8 py-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#0B0F19] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div>
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-orange-600 block mb-0.5">
              MENU BUILDER
            </span>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {editingFood ? 'Edit Food Item' : 'Add New Food'}
              </h2>
              {editingFood && (
                <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border truncate max-w-[260px] ${
                  isDark
                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                    : 'bg-orange-50 text-orange-700 border-orange-200'
                }`}>
                  {editingFood.title}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className={`p-2 border rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Stepper Progress Bar */}
        <div className={`px-6 sm:px-8 py-3.5 border-b shrink-0 ${
          isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, title: 'Food details' },
              { num: 2, title: 'Size & price' },
              { num: 3, title: 'Extras' },
              { num: 4, title: 'Review' }
            ].map((step, idx, arr) => {
              const isCompleted = step.num < currentStep;
              const isCurrent = step.num === currentStep;

              return (
                <React.Fragment key={step.num}>
                  <div
                    onClick={() => {
                      if (step.num < currentStep || (step.num === 2 && canProceedStep1) || (step.num === 3 && canProceedStep2)) {
                        setCurrentStep(step.num);
                      }
                    }}
                    className="flex flex-col items-center cursor-pointer group"
                  >
                    <div className="flex items-center justify-center">
                      {isCompleted ? (
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-orange-500/30">
                          {step.num}
                        </div>
                      ) : (
                        <div className={`w-7 h-7 rounded-full border text-xs font-semibold flex items-center justify-center ${
                          isDark
                            ? 'border-slate-700 bg-slate-800 text-slate-400'
                            : 'border-slate-300 bg-white text-slate-500'
                        }`}>
                          {step.num}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-1.5 text-center">
                      {isCurrent ? (
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border block ${
                          isDark
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                            : 'bg-orange-50 text-orange-600 border-orange-200/60'
                        }`}>
                          {step.title}
                        </span>
                      ) : (
                        <span className={`text-xs font-medium block ${
                          isCompleted
                            ? isDark ? 'text-slate-300' : 'text-slate-700'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {step.num}. {step.title}
                        </span>
                      )}
                    </div>
                  </div>

                  {idx < arr.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 sm:mx-4 -mt-5 transition-colors ${
                      step.num < currentStep
                        ? 'bg-emerald-600'
                        : isDark ? 'bg-slate-700' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">

          {/* ======================================================== */}
          {/* STEP 1: FOOD DETAILS                                     */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Food Information */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2.5 pb-1">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Food information
                  </h3>
                </div>

                {/* Food Name (English) - High Contrast SemiBold 600 Label */}
                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    Food name (English) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Double Smash Burger Combo"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                      isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Food Name (Native Language) */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      Food name (Native language)
                    </label>
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                      Optional
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter the food name in your native language"
                    value={foodNameNative}
                    onChange={(e) => setFoodNameNative(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium font-noto-bengali focus:outline-none focus:border-orange-500 transition-colors ${
                      isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <span className={`text-xs font-normal mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Use your restaurant's local language.
                  </span>
                </div>

                {/* Category & Subcategory */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      Category <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={`w-full appearance-none pl-3.5 pr-10 py-2.5 rounded-lg border text-sm font-semibold focus:outline-none focus:border-orange-500 cursor-pointer ${
                          isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        {uniqueCategories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        Subcategory
                      </label>
                      <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>(Optional)</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Smash Burgers"
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                        isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Food Description (English) */}
                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    Food description (English)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Two smashed beef patties with caramelized onions, cheddar cheese and signature smash sauce."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-normal focus:outline-none focus:border-orange-500 resize-none ${
                      isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Food Description (Native language) */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      Food description (Native language)
                    </label>
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                      Optional
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Describe this food in your native language"
                    value={descriptionNative}
                    onChange={(e) => setDescriptionNative(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-normal font-noto-bengali focus:outline-none focus:border-orange-500 resize-none ${
                      isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Food Badge (Optional) */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      Food badge
                    </label>
                    <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>(Optional)</span>
                  </div>
                  <div className="relative">
                    <select
                      value={badgeTag}
                      onChange={(e) => setBadgeTag(e.target.value)}
                      className={`w-full appearance-none pl-3.5 pr-10 py-2.5 rounded-lg border text-sm font-semibold focus:outline-none focus:border-orange-500 cursor-pointer ${
                        isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="No badge">No badge</option>
                      <option value="Best Selling">Best Selling</option>
                      <option value="Chef Special">Chef Special</option>
                      <option value="Top Rated">Top Rated</option>
                      <option value="New Item">New Item</option>
                      <option value="Crispy & Spicy">Crispy & Spicy</option>
                      <option value="Sweet Delight">Sweet Delight</option>
                      <option value="Popular">Popular</option>
                      <option value="Chef's Choice">Chef's Choice</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Right Column: Food Photo */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center gap-2.5 pb-1">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Food photo
                  </h3>
                </div>

                {/* Photo Upload & Preview Container */}
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={handleImageDrop}
                  className={`rounded-2xl border p-4 space-y-3.5 text-center ${
                    isDark ? 'bg-[#0B0F19]/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  {isOptimizingImage ? (
                    <div className="h-56 rounded-xl bg-orange-500/5 border border-orange-500/20 flex flex-col items-center justify-center text-orange-600 gap-2">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-xs font-bold">Optimizing Image (WebP)...</span>
                    </div>
                  ) : imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 h-56 flex items-center justify-center p-2">
                      <img
                        src={imagePreview}
                        alt="Food Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-56 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col items-center justify-center text-center p-4 gap-2">
                      <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        Upload High-Quality PNG or Photo
                      </span>
                      <span className={`text-[11px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Drag and drop or click Change photo below.
                      </span>
                    </div>
                  )}

                  {/* Buttons Row */}
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors shadow-sm ${
                      isOptimizingImage ? 'opacity-50 pointer-events-none' : ''
                    }`}>
                      <Upload className="w-3.5 h-3.5 text-orange-600" />
                      <span>Change photo</span>
                      <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                    </label>

                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview('');
                          setFoodImage('');
                          setImageMeta(null);
                        }}
                        className="text-xs font-semibold text-slate-600 hover:text-red-600 transition-colors cursor-pointer px-2 py-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Image Specs Subtext */}
                  <div className="text-xs space-y-0.5">
                    <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      PNG or WebP &bull; 1200 &times; 1200 px
                    </p>
                    <p className={`font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Transparent images work best.
                    </p>
                  </div>

                  {/* Expandable Photo Guidelines Accordion */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowGuidelines(!showGuidelines)}
                      className={`w-full py-2 px-3 rounded-lg flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer ${
                        isDark ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-200' : 'bg-slate-100/70 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>Photo guidelines</span>
                      {showGuidelines ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showGuidelines && (
                      <div className={`mt-2 p-3 rounded-lg text-left text-xs leading-relaxed space-y-2 border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-orange-50/60 border-orange-100 text-slate-700'
                      }`}>
                        <div>
                          <strong className="text-orange-600 font-semibold block">&bull; Recommended Resolution:</strong>
                          <span className="font-normal">1200 &times; 1200 px (Square 1:1) — Minimum 1000 &times; 1000 px for crisp 3D rendering.</span>
                        </div>
                        <div>
                          <strong className="text-orange-600 font-semibold block">&bull; Format & Transparency:</strong>
                          <span className="font-normal">Transparent Background PNG (.png) or WebP with tight cutout around the plate.</span>
                        </div>
                        <div>
                          <strong className="text-orange-600 font-semibold block">&bull; Framing & Zoom Guide:</strong>
                          <span className="font-normal">Food plate should occupy 85% – 90% of the canvas with minimal empty border.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: SIZE & PRICE                                     */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-5">
              {/* Top Row: Title, Subtitle & Currency */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {hasDifferentSizes ? 'Sizes & pricing' : '2. Size & price'}
                  </h3>
                  <p className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {hasDifferentSizes
                      ? 'Set a price and optional discount for each size.'
                      : 'Does this food come in single price or multiple sizes?'}
                  </p>
                </div>

                {/* Currency Dropdown Selector */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Currency</span>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer focus:outline-none focus:border-orange-500 ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      <option value="৳">BDT (৳)</option>
                      <option value="$">USD ($)</option>
                      <option value="€">EUR (€)</option>
                      <option value="£">GBP (£)</option>
                      <option value="₹">INR (₹)</option>
                      <option value="AED">AED</option>
                      <option value="SAR">SAR</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Mode Switcher: Single price vs Multiple sizes */}
              <div className="inline-flex p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setHasDifferentSizes(false)}
                  className={`px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    !hasDifferentSizes
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Single price
                </button>
                <button
                  type="button"
                  onClick={() => setHasDifferentSizes(true)}
                  className={`px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    hasDifferentSizes
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Multiple sizes
                </button>
              </div>

              {/* SINGLE PRICE MODE */}
              {!hasDifferentSizes ? (
                <div className="space-y-4">
                  {/* Row 1: Regular Price (MRP) & Discount Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        Regular price (MRP) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-slate-600 font-bold">{currency}</span>
                        <input
                          type="number"
                          placeholder="280"
                          value={singleOldPrice || (discountMode === 'none' ? singlePrice : '')}
                          onChange={(e) => handleRegularPriceChange(e.target.value)}
                          className={`w-full pl-9 pr-3.5 py-2.5 rounded-lg border text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors ${
                            isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        Discount type
                      </label>
                      <div className={`grid grid-cols-3 gap-1 p-1 rounded-lg border ${
                        isDark ? 'bg-[#0B0F19] border-slate-700' : 'bg-slate-100 border-slate-200'
                      }`}>
                        {[
                          { id: 'none', label: 'None' },
                          { id: 'percent', label: 'Percent' },
                          { id: 'fixed', label: 'Flat' }
                        ].map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleDiscountModeChange(t.id)}
                            className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                              discountMode === t.id
                                ? 'bg-orange-600 text-white shadow-sm'
                                : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Discount Amount (When active) */}
                  {discountMode !== 'none' && (
                    <div>
                      <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {discountMode === 'percent' ? 'Discount percentage *' : 'Discount amount *'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-slate-600 font-bold">
                          {discountMode === 'percent' ? '%' : currency}
                        </span>
                        <input
                          type="number"
                          placeholder={discountMode === 'percent' ? '15' : '30'}
                          value={discountValue}
                          onChange={(e) => handleDiscountValueChange(e.target.value)}
                          className={`w-full sm:w-1/2 pl-9 pr-3.5 py-2.5 rounded-lg border text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors ${
                            isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Selling Price Calculation Box */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    isDark
                      ? 'bg-emerald-950/20 border-emerald-800/40'
                      : 'bg-emerald-50/80 border-emerald-200/80'
                  }`}>
                    <div>
                      <span className={`text-xs font-semibold block mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        Selling price
                      </span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {currency} {singlePrice || '0'}
                      </span>
                    </div>

                    {Number(singleOldPrice) > Number(singlePrice) && Number(singlePrice) > 0 && (
                      <>
                        <div className="h-9 w-px bg-slate-300 dark:bg-slate-700 mx-2" />
                        <div>
                          <span className={`text-xs font-semibold block mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            Customer saves
                          </span>
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {currency} {(Number(singleOldPrice) - Number(singlePrice)).toFixed(0)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="line-through text-slate-400 dark:text-slate-500 text-lg font-bold">
                            {currency} {singleOldPrice}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <span className={`text-xs font-normal block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Customers see the selling price on your menu.
                  </span>
                </div>
              ) : (
                /* MULTIPLE SIZES MODE */
                <div className="space-y-4">
                  {/* Bulk Discount Toolbar */}
                  <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                    isDark ? 'bg-[#0B0F19] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        Discount for all sizes
                      </span>
                      <div className="relative">
                        <select
                          value={bulkDiscountMode}
                          onChange={(e) => setBulkDiscountMode(e.target.value)}
                          className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        >
                          <option value="percent">Percent (%)</option>
                          <option value="fixed">Flat ({currency})</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      <input
                        type="number"
                        placeholder="20"
                        value={bulkDiscountValue}
                        onChange={(e) => setBulkDiscountValue(e.target.value)}
                        className={`w-20 px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                          isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => applyDiscountToAllPortions(bulkDiscountMode, bulkDiscountValue)}
                        className="border border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Apply to all
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyDiscountToAllPortions('none')}
                      className={`text-xs font-semibold cursor-pointer transition-colors ${
                        isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Reset
                    </button>
                  </div>

                  {/* Size Cards List */}
                  <div className="space-y-3">
                    {portions.map((portion, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border space-y-3.5 ${
                          isDark ? 'bg-[#0B0F19]/50 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Size Card Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              Size {idx + 1}
                            </span>
                            {defaultSizeIndex === idx ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full border-2 border-orange-600 flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-orange-600" />
                                </div>
                                <span className="bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 px-2 py-0.5 rounded text-[11px] font-semibold">
                                  Default size
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDefaultSizeIndex(idx)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-orange-600 transition-colors cursor-pointer"
                              >
                                <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600" />
                                <span>Set as default</span>
                              </button>
                            )}
                          </div>

                          {portions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePortion(idx)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Inputs Row 1: Name (English), Name (Native), Regular Price */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                              Name (English) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Half"
                              value={portion.name}
                              onChange={(e) => updatePortion(idx, 'name', e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-xs font-medium focus:outline-none focus:border-orange-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <label className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                Name (Native language)
                              </label>
                              <span className={`text-[10px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Optional</span>
                            </div>
                            <input
                              type="text"
                              placeholder="Local name"
                              value={portion.nameNative || ''}
                              onChange={(e) => updatePortion(idx, 'nameNative', e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-xs font-medium font-noto-bengali focus:outline-none focus:border-orange-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                              Regular price <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-slate-600 font-bold text-xs">{currency}</span>
                              <input
                                type="number"
                                placeholder="180"
                                value={portion.regularPrice || (portion.discountMode === 'none' ? portion.price : '')}
                                onChange={(e) => updatePortion(idx, 'regularPrice', e.target.value)}
                                className={`w-full pl-7 pr-3 py-2 rounded-lg border text-xs font-bold focus:outline-none focus:border-orange-500 ${
                                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Inputs Row 2: Discount Type, Discount Value & Green Selling Price */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          <div className={portion.discountMode !== 'none' ? 'sm:col-span-4' : 'sm:col-span-6'}>
                            <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                              Discount type
                            </label>
                            <div className="relative">
                              <select
                                value={portion.discountMode}
                                onChange={(e) => updatePortion(idx, 'discountMode', e.target.value)}
                                className={`w-full appearance-none pl-3 pr-8 py-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              >
                                <option value="none">No discount</option>
                                <option value="percent">Percent (%)</option>
                                <option value="fixed">Flat ({currency})</option>
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          {portion.discountMode !== 'none' && (
                            <div className="sm:col-span-3">
                              <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                Discount
                              </label>
                              <div className="relative">
                                <span className="absolute right-3 top-2 text-slate-600 font-bold text-xs">
                                  {portion.discountMode === 'percent' ? '%' : currency}
                                </span>
                                <input
                                  type="number"
                                  placeholder="20"
                                  value={portion.discountValue}
                                  onChange={(e) => updatePortion(idx, 'discountValue', e.target.value)}
                                  className={`w-full pl-3 pr-7 py-2 rounded-lg border text-xs font-bold ${
                                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                  }`}
                                />
                              </div>
                            </div>
                          )}

                          {/* Green Selling Price Card */}
                          <div className={portion.discountMode !== 'none' ? 'sm:col-span-5' : 'sm:col-span-6'}>
                            <label className="text-xs font-semibold block mb-1 opacity-0 pointer-events-none">
                              Selling price
                            </label>
                            <div className={`py-1.5 px-3 rounded-lg border flex items-center justify-between ${
                              isDark
                                ? 'bg-emerald-950/20 border-emerald-800/40'
                                : 'bg-emerald-50 border-emerald-200/80'
                            }`}>
                              <div>
                                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium block leading-tight">Selling price</span>
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                  {currency} {portion.price || '0'}
                                </span>
                              </div>
                              {Number(portion.regularPrice) > Number(portion.price) && (
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                  Save {currency}{Number(portion.regularPrice) - Number(portion.price)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Size Button */}
                  <button
                    type="button"
                    onClick={addPortion}
                    className={`w-full py-3 rounded-xl border-2 border-dashed font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      isDark
                        ? 'border-slate-700 text-slate-200 hover:border-orange-500 hover:text-orange-400'
                        : 'border-slate-300 text-slate-700 hover:border-orange-500 hover:text-orange-600'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add size</span>
                  </button>

                  <span className={`text-xs font-normal block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    The default size appears first in your customer menu.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: EXTRA CHOICES (ADD-ONS)                          */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Extra choices
                </h3>
                <p className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {hasExtraChoices
                    ? 'Offer toppings, sides or drinks with this food.'
                    : 'Let customers add toppings, sides or drinks.'}
                </p>
              </div>

              {/* Toggle Card */}
              <div
                onClick={() => setHasExtraChoices(!hasExtraChoices)}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  isDark ? 'bg-[#0B0F19] border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {hasExtraChoices ? 'Enable extra choices' : 'Offer extra choices'}
                </span>

                {/* Modern Switch Toggle */}
                <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                  hasExtraChoices ? 'bg-orange-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}>
                  {hasExtraChoices && (
                    <span className="text-[10px] font-bold text-white mr-1.5 select-none">ON</span>
                  )}
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </div>
              </div>

              {/* If OFF: Centered Empty State */}
              {!hasExtraChoices ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full border border-slate-300 dark:border-slate-700 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Plus className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    No extras for this item
                  </h4>
                  <p className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    You can continue without adding extras.
                  </p>
                </div>
              ) : (
                /* If ON: Selection Settings and Table */
                <div className="space-y-5">
                  {/* Selection Settings Section */}
                  <div className="space-y-4">
                    <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Selection settings
                    </h4>

                    {/* Group Name */}
                    <div>
                      <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        Group name
                      </label>
                      <input
                        type="text"
                        placeholder="Extra Add-ons"
                        value={choiceGroupName}
                        onChange={(e) => setChoiceGroupName(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium focus:outline-none focus:border-orange-500 ${
                          isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    {/* Customers can choose (One option vs Multiple options) */}
                    <div>
                      <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        Customers can choose
                      </label>
                      <div className="inline-flex p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => setSelectionType('single')}
                          className={`px-6 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectionType === 'single'
                              ? 'bg-orange-600 text-white shadow-sm'
                              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
                          }`}
                        >
                          One option
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectionType('multiple')}
                          className={`px-6 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectionType === 'multiple'
                              ? 'bg-orange-600 text-white shadow-sm'
                              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
                          }`}
                        >
                          Multiple options
                        </button>
                      </div>
                    </div>

                    {/* Maximum Selections */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className={`text-xs font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Maximum selections
                        </span>
                        <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Up to {maxSelections} available options
                        </span>
                      </div>

                      <div className="relative">
                        <select
                          value={maxSelections}
                          onChange={(e) => setMaxSelections(Number(e.target.value))}
                          className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                          <option value={999}>Unlimited</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Extra Items List */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Extra items
                      </h4>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-slate-200 dark:border-slate-700">
                        {extraOptions.length} items
                      </span>
                    </div>

                    {/* High-Contrast Table Header (Fixing circled low-contrast labels in Image 2) */}
                    <div className={`hidden sm:grid grid-cols-12 gap-3 px-3 py-1.5 text-xs font-semibold ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      <div className="col-span-1"></div>
                      <div className="col-span-4">Name (English) <span className="text-red-500">*</span></div>
                      <div className="col-span-4">Name (Native language) <span className="font-normal text-slate-500">Optional</span></div>
                      <div className="col-span-2">Extra price ({currency}) <span className="text-red-500">*</span></div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* Rows */}
                    <div className="space-y-2">
                      {extraOptions.map((opt, idx) => (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => handleExtraDragStart(e, idx)}
                          onDragOver={(e) => handleExtraDragOver(e, idx)}
                          onDragEnd={handleExtraDragEnd}
                          className={`p-2.5 sm:p-3 rounded-xl border flex flex-col sm:grid sm:grid-cols-12 gap-2.5 sm:gap-3 items-center transition-all ${
                            draggedOptionIdx === idx ? 'opacity-40 border-orange-500' : ''
                          } ${
                            isDark ? 'bg-[#0B0F19]/50 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="col-span-1 flex items-center gap-1 text-slate-400 cursor-grab active:cursor-grabbing self-start sm:self-center">
                            <GripVertical className="w-4 h-4 text-slate-500 hover:text-orange-500 transition-colors" />
                          </div>

                          <div className="col-span-4 w-full">
                            <input
                              type="text"
                              placeholder="Extra Egg"
                              value={opt.name}
                              onChange={(e) => updateExtraOption(idx, 'name', e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-xs font-medium focus:outline-none focus:border-orange-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div className="col-span-4 w-full">
                            <input
                              type="text"
                              placeholder="Local name"
                              value={opt.nameNative || ''}
                              onChange={(e) => updateExtraOption(idx, 'nameNative', e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-xs font-medium font-noto-bengali focus:outline-none focus:border-orange-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div className="col-span-2 w-full">
                            <input
                              type="number"
                              placeholder="30"
                              value={opt.price}
                              onChange={(e) => updateExtraOption(idx, 'price', e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-xs font-bold focus:outline-none focus:border-orange-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div className="col-span-1 flex justify-end w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => removeExtraOption(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Extra Item Button */}
                    <button
                      type="button"
                      onClick={addExtraOption}
                      className="w-full py-2.5 rounded-xl border border-dashed border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add extra item</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: PREVIEW & REVIEW                                 */}
          {/* ======================================================== */}
          {currentStep === 4 && (() => {
            const previewBasePrice = hasDifferentSizes
              ? Number(portions[previewSelectedPortion]?.price || 0)
              : Number(singlePrice || 0);

            const previewAddonsTotal = previewSelectedAddons.reduce((sum, idx) => {
              return sum + Number(extraOptions[idx]?.price || 0);
            }, 0);

            const previewTotalPrice = previewBasePrice + previewAddonsTotal;

            const togglePreviewAddon = (idx) => {
              setPreviewSelectedAddons(prev =>
                prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
              );
            };

            const isBn = previewLang === 'bn';

            // Fully localized customer menu variables matching frontend
            const displayTitle = isBn
              ? (foodNameNative.trim() || translateFoodTitle(foodName, 'bn'))
              : (foodName || 'Food Item');

            const displayCategory = isBn
              ? `${translateCategoryName(category, 'bn')}${subcategory ? ` • ${translateSubcategoryName(subcategory, 'bn')}` : ''}`
              : `${category}${subcategory ? ` • ${subcategory}` : ''}`;

            const displayDescription = isBn
              ? (descriptionNative.trim() || translateFoodDescription(description, 'bn'))
              : (description || 'Prepared fresh with premium quality ingredients.');

            const displayBadge = isBn && badgeTag && badgeTag !== 'No badge'
              ? formatBadgeText(badgeTag, 'bn')
              : badgeTag;

            return (
              <div className="space-y-6">
                <div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Review your food item
                  </h3>
                  <p className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Check the customer view before saving.
                  </p>
                </div>

                {/* 2-Column Layout: Customer Preview on Left (Size Increased) & Item Summary on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
                  
                  {/* LEFT COLUMN: Customer Preview Section (Size Increased & Authentic Live Experience) */}
                  <div className="lg:col-span-6 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Customer preview
                      </span>

                      {/* Language Switch Pills */}
                      <div className="flex items-center p-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => setPreviewLang('en')}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            previewLang === 'en'
                              ? 'bg-orange-600 text-white shadow-sm'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          English
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewLang('bn')}
                          className={`px-3 py-1 rounded-full text-xs font-semibold font-noto-bengali transition-all cursor-pointer ${
                            previewLang === 'bn'
                              ? 'bg-orange-600 text-white shadow-sm'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {nativeLang.nativeName || 'বাংলা'}
                        </button>
                      </div>
                    </div>

                    {/* Dark Mobile Device Frame - Enhanced Width & Authentic Frontend Layout */}
                    <div className="bg-[#080B11] text-white rounded-2xl p-4 sm:p-5 border border-slate-800/90 shadow-2xl space-y-4">
                      {/* Phone Menu Header with Verified Tick Icon */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-orange-600 flex items-center justify-center text-white shadow-sm">
                            <Utensils className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold tracking-tight ${isBn ? 'font-noto-bengali' : ''}`}>
                              {isBn ? 'মেনু ও স্পেশাল' : 'PhoneMenu'}
                            </span>
                            {isBn && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-400">
                          <Search className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                          <Menu className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                        </div>
                      </div>

                      {/* Food Image Card - Expanded Height */}
                      <div className="relative rounded-xl overflow-hidden bg-slate-900 h-44 sm:h-48 flex items-center justify-center border border-slate-800/60 shadow-inner">
                        {imagePreview || foodImage ? (
                          <img
                            src={imagePreview || foodImage}
                            alt={foodName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Utensils className="w-12 h-12 text-slate-600" />
                        )}

                        {badgeTag && badgeTag !== 'No badge' && (
                          <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-amber-500/50 text-amber-400 text-[10px] font-bold flex items-center gap-1 shadow-lg ${
                            isBn ? 'font-noto-bengali' : ''
                          }`}>
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{displayBadge.toUpperCase()}</span>
                          </div>
                        )}
                      </div>

                      {/* Food Title & Description - Fully Localized */}
                      <div className="space-y-1">
                        <h4 className={`text-base font-bold text-white leading-snug ${isBn ? 'font-noto-bengali' : ''}`}>
                          {displayTitle}
                        </h4>
                        <span className={`text-xs font-semibold text-orange-400 block ${isBn ? 'font-noto-bengali' : ''}`}>
                          {displayCategory}
                        </span>
                        <p className={`text-xs font-normal text-slate-300 pt-0.5 line-clamp-3 leading-relaxed ${isBn ? 'font-noto-bengali' : ''}`}>
                          {displayDescription}
                        </p>
                      </div>

                      {/* Portion Interactive Selector - Fully Localized in Bengali */}
                      {hasDifferentSizes && (
                        <div className="space-y-2 pt-2.5 border-t border-slate-800/80">
                          <span className={`text-xs font-bold uppercase tracking-wider text-orange-400 block ${isBn ? 'font-noto-bengali' : ''}`}>
                            {isBn ? 'পরিমাণ সাইজ' : 'PORTION'}
                          </span>
                          <div className="space-y-1.5">
                            {portions.map((p, i) => {
                              const isSelected = previewSelectedPortion === i;
                              const pName = isBn
                                ? (p.nameNative?.trim() || translatePortionName(p.name, 'bn'))
                                : (p.name || `Portion ${i+1}`);
                              const formattedPrice = isBn ? toBengaliDigits(p.price) : p.price;
                              const formattedOldPrice = isBn ? toBengaliDigits(p.regularPrice) : p.regularPrice;

                              return (
                                <div
                                  key={i}
                                  onClick={() => setPreviewSelectedPortion(i)}
                                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-orange-950/30 border-orange-500/70 font-semibold'
                                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                      isSelected ? 'border-orange-500' : 'border-slate-600'
                                    }`}>
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                    </div>
                                    <span className={isBn ? 'font-noto-bengali font-semibold' : ''}>{pName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-white font-bold ${isBn ? 'font-noto-bengali' : ''}`}>
                                      {currency}{formattedPrice}
                                    </span>
                                    {Number(p.regularPrice) > Number(p.price) && (
                                      <span className={`line-through text-slate-500 text-[11px] ${isBn ? 'font-noto-bengali' : ''}`}>
                                        {currency}{formattedOldPrice}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Extras Interactive Selector - Fully Localized in Bengali */}
                      {hasExtraChoices && extraOptions.length > 0 && (
                        <div className="space-y-2 pt-2.5 border-t border-slate-800/80">
                          <span className={`text-xs font-bold uppercase tracking-wider text-orange-400 block ${isBn ? 'font-noto-bengali' : ''}`}>
                            {isBn ? 'অতিরিক্ত আইটেম (অ্যাড-অন)' : 'EXTRAS'}
                          </span>
                          <div className="space-y-1.5">
                            {extraOptions.map((opt, i) => {
                              const isChecked = previewSelectedAddons.includes(i);
                              const optName = isBn
                                ? (opt.nameNative?.trim() || translateAddonName(opt.name, 'bn'))
                                : (opt.name || `Extra ${i+1}`);
                              const formattedPrice = isBn ? toBengaliDigits(opt.price) : opt.price;

                              return (
                                <div
                                  key={i}
                                  onClick={() => togglePreviewAddon(i)}
                                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                    isChecked
                                      ? 'bg-orange-950/30 border-orange-500/70 font-semibold'
                                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                      isChecked ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-600'
                                    }`}>
                                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <span className={isBn ? 'font-noto-bengali font-medium' : ''}>{optName}</span>
                                  </div>
                                  <span className={`text-slate-200 font-bold ${isBn ? 'font-noto-bengali' : ''}`}>
                                    +{currency}{formattedPrice}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Total Settlement Bar */}
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between font-bold">
                        <span className={`text-xs text-slate-300 ${isBn ? 'font-noto-bengali font-semibold' : ''}`}>
                          {isBn ? 'আইটেমের মোট মূল্য' : 'Total'}
                        </span>
                        <span className={`text-xl text-amber-400 font-black ${isBn ? 'font-noto-bengali' : ''}`}>
                          {currency}{isBn ? toBengaliDigits(previewTotalPrice) : previewTotalPrice}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Item Summary Cards (High-Contrast Professional Typography) */}
                  <div className="lg:col-span-6 space-y-4">
                    <span className={`text-sm font-bold tracking-tight block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Item summary
                    </span>

                    {/* Card 1: Food Details */}
                    <div className={`rounded-xl border overflow-hidden ${
                      isDark ? 'bg-[#0B0F19] border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                        isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-orange-600" />
                          <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Food details
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="text-xs font-semibold text-orange-600 hover:text-orange-500 flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="p-4 space-y-3 text-xs">
                        {/* High-Contrast Clear Labels */}
                        <div className="grid grid-cols-12 gap-2">
                          <span className={`col-span-4 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            Name
                          </span>
                          <span className={`col-span-8 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {foodName || '—'}
                          </span>
                        </div>
                        <div className="grid grid-cols-12 gap-2">
                          <span className={`col-span-4 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            Category
                          </span>
                          <span className={`col-span-8 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {category} {subcategory ? `• ${subcategory}` : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-12 gap-2">
                          <span className={`col-span-4 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            Food description
                          </span>
                          <span className={`col-span-8 font-normal leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {description || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Sizes & Pricing */}
                    <div className={`rounded-xl border overflow-hidden ${
                      isDark ? 'bg-[#0B0F19] border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                        isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-orange-600" />
                          <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Sizes & pricing
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="text-xs font-semibold text-orange-600 hover:text-orange-500 flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="p-4 space-y-2.5 text-xs">
                        {!hasDifferentSizes ? (
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <span className={`col-span-4 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                              Single Price
                            </span>
                            <div className="col-span-8 flex items-center gap-2.5">
                              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {currency}{singlePrice}
                              </span>
                              {singleOldPrice && (
                                <span className="line-through text-slate-400 font-semibold text-xs">
                                  {currency}{singleOldPrice}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          portions.map((p, i) => (
                            <div key={i} className="flex items-center justify-between py-1 border-b last:border-b-0 border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                  {p.name || `Size ${i+1}`}
                                </span>
                                {defaultSizeIndex === i && (
                                  <span className="bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200/60 px-2 py-0.5 rounded text-[10px] font-bold">
                                    Default
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {currency}{p.price}
                                </span>
                                {Number(p.regularPrice) > Number(p.price) && (
                                  <span className="line-through text-slate-400 text-xs">
                                    {currency}{p.regularPrice}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Card 3: Extra Choices */}
                    <div className={`rounded-xl border overflow-hidden ${
                      isDark ? 'bg-[#0B0F19] border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                        isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-orange-600" />
                          <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Extra choices
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          className="text-xs font-semibold text-orange-600 hover:text-orange-500 flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="p-4 space-y-3 text-xs">
                        {!hasExtraChoices ? (
                          <span className={`font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            No extras configured for this item.
                          </span>
                        ) : (
                          <>
                            <div className="grid grid-cols-12 gap-2">
                              <span className={`col-span-4 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                Group
                              </span>
                              <span className={`col-span-8 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {choiceGroupName}
                              </span>
                            </div>
                            <div className="grid grid-cols-12 gap-2">
                              <span className={`col-span-4 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                Selection
                              </span>
                              <span className={`col-span-8 font-normal ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                {selectionType === 'multiple' ? 'Choose multiple • Optional' : 'Choose one'}
                              </span>
                            </div>
                            <div className="grid grid-cols-12 gap-2">
                              <span className={`col-span-4 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                Maximum
                              </span>
                              <span className={`col-span-8 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {maxSelections}
                              </span>
                            </div>
                            <div className="pt-2 space-y-1.5 border-t border-slate-200 dark:border-slate-800">
                              {extraOptions.map((opt, i) => (
                                <div key={i} className="flex items-center justify-between">
                                  <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {opt.name}
                                  </span>
                                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    +{currency}{opt.price}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Info className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="font-normal">Preview selections do not change your saved defaults.</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Wizard Bottom Controls */}
        <div className={`px-6 sm:px-8 py-4 border-t flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#0B0F19] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className={`px-5 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className={`px-5 py-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Cancel
            </button>
          )}

          <div className="flex items-center gap-3">
            {editingFood && currentStep < 4 && (
              <button
                type="button"
                disabled={isOptimizingImage || !canProceedStep1}
                onClick={handleFinalSave}
                className={`px-5 py-2.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm ${
                  isOptimizingImage || !canProceedStep1
                    ? 'bg-emerald-600/50 text-white/70 cursor-not-allowed'
                    : 'bg-[#059669] hover:bg-[#047857] text-white'
                }`}
              >
                {isOptimizingImage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Update Food Item</span>
                  </>
                )}
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                disabled={isOptimizingImage || (currentStep === 1 ? !canProceedStep1 : !canProceedStep2)}
                onClick={() => setCurrentStep(prev => prev + 1)}
                className={`px-6 py-2.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  !isOptimizingImage && (currentStep === 1 ? canProceedStep1 : canProceedStep2)
                    ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-sm'
                    : isDark
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isOptimizingImage && currentStep === 1 ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isOptimizingImage}
                onClick={handleFinalSave}
                className="px-6 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <span>{editingFood ? 'Save changes' : 'Publish Food Item'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
