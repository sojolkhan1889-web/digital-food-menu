import React, { useState, useEffect, useMemo } from 'react';
import { compressImage } from '../lib/imageCompressor';
import {
  X,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Plus,
  Eye,
  Utensils,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function AddFoodWizard({
  isOpen,
  onClose,
  onSave,
  categories = [],
  editingFood = null,
  currency: propCurrency = '৳',
  theme = 'light'
}) {
  const [currentStep, setCurrentStep] = useState(1);

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

  // Step 1: Food Details State
  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState(uniqueCategories[0] || 'Main Course');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [badgeTag, setBadgeTag] = useState('Best Selling');
  const [foodImage, setFoodImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageMeta, setImageMeta] = useState(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);

  // Step 2: Size & Price State
  const [currency, setCurrency] = useState('৳');
  const [hasDifferentSizes, setHasDifferentSizes] = useState(false);
  const [singlePrice, setSinglePrice] = useState('');
  const [singleOldPrice, setSingleOldPrice] = useState('');
  const [discountMode, setDiscountMode] = useState('none'); // 'none' | 'percent' | 'fixed'
  const [discountValue, setDiscountValue] = useState('');
  const [portions, setPortions] = useState([
    { name: 'Half', price: '180' },
    { name: 'Full', price: '320' }
  ]);

  // Step 3: Extra Choices / Addons State
  const [hasExtraChoices, setHasExtraChoices] = useState(false);
  const [choiceGroupName, setChoiceGroupName] = useState('Extra Add-ons');
  const [selectionType, setSelectionType] = useState('multiple'); // 'multiple' | 'single' | 'required'
  const [maxSelections, setMaxSelections] = useState(3);
  const [extraOptions, setExtraOptions] = useState([
    { name: 'Extra Egg', price: '30' },
    { name: 'Extra Meat', price: '120' }
  ]);

  // Step 4: Preview State
  const [previewSelectedPortion, setPreviewSelectedPortion] = useState(0);
  const [previewSelectedAddons, setPreviewSelectedAddons] = useState([]);
  const [showBackendData, setShowBackendData] = useState(false);

  // Form Reset Function (Fixes Issue 2: previous food info sticking around)
  const resetForm = () => {
    setCurrentStep(1);
    if (editingFood) {
      setFoodName(editingFood.title || '');
      setCategory(editingFood.category || uniqueCategories[0] || 'Main Course');
      setSubcategory(editingFood.subcategory || '');
      setDescription(editingFood.description || '');
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
          let mode = 'none';
          let val = '';
          if (hasDiscount) {
            const pct = Math.round(((regularP - sellingP) / regularP) * 100);
            mode = 'percent';
            val = String(pct);
          }
          return {
            name: p.name || '',
            regularPrice: String(regularP || sellingP || ''),
            price: String(sellingP || ''),
            discountMode: mode,
            discountValue: val
          };
        }));
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
          if (Math.abs(numNew - (numOld * (1 - pct / 100))) < 0.1) {
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
          { name: 'Half', regularPrice: '180', price: '180', discountMode: 'none', discountValue: '' },
          { name: 'Full', regularPrice: '320', price: '320', discountMode: 'none', discountValue: '' }
        ]);
      }

      const hasAddons = editingFood.customizable?.addons && editingFood.customizable.addons.length > 0;
      setHasExtraChoices(Boolean(hasAddons));
      if (hasAddons) {
        setExtraOptions(editingFood.customizable.addons.map(a => ({
          name: a.name,
          price: String(a.price || 0)
        })));
      } else {
        setExtraOptions([
          { name: 'Extra Egg', price: '30' },
          { name: 'Extra Meat', price: '120' }
        ]);
      }
      setImageMeta(null);
    } else {
      setFoodName('');
      setCategory(uniqueCategories[0] || 'Main Course');
      setSubcategory('');
      setDescription('');
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
        { name: 'Half', regularPrice: '180', price: '180', discountMode: 'none', discountValue: '' },
        { name: 'Full', regularPrice: '320', price: '320', discountMode: 'none', discountValue: '' }
      ]);
      setHasExtraChoices(false);
      setChoiceGroupName('Extra Add-ons');
      setSelectionType('multiple');
      setMaxSelections(3);
      setExtraOptions([
        { name: 'Extra Egg', price: '30' },
        { name: 'Extra Meat', price: '120' }
      ]);
    }
    setPreviewSelectedPortion(0);
    setPreviewSelectedAddons([]);
    setShowBackendData(false);
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

  const handleFinalPriceChange = (val) => {
    setSinglePrice(val);
    const numBase = Number(singleOldPrice) || 0;
    const numFinal = Number(val) || 0;
    if (numBase > numFinal && numFinal > 0) {
      if (discountMode === 'percent') {
        const pct = Math.round(((numBase - numFinal) / numBase) * 100);
        setDiscountValue(String(pct));
      } else if (discountMode === 'fixed') {
        const amt = numBase - numFinal;
        setDiscountValue(String(amt % 1 === 0 ? amt : amt.toFixed(2)));
      }
    }
  };

  // Reset every time modal opens or editing food changes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, editingFood]);

  // Handle Photo Upload with Image Engine (Auto-Trim Transparent Borders & Client-Side Compression)
  const processSelectedImageFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (.png, .jpg, .webp).');
      return;
    }
    setIsOptimizingImage(true);

    try {
      const res = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85,
        autoTrimTransparency: true
      });

      if (res && res.dataUrl) {
        setImagePreview(res.dataUrl);
        setFoodImage(res.dataUrl);
        setImageMeta({
          width: res.origW || res.width,
          height: res.origH || res.height,
          trimmedW: res.width,
          trimmedH: res.height,
          ratio: (res.width / (res.height || 1)).toFixed(2),
          isOptimal: (res.origW || res.width) >= 500,
          autoTrimmed: res.didTrim
        });
      } else {
        throw new Error('Compression returned empty payload');
      }
    } catch (err) {
      console.warn('Image processing failed, falling back to direct FileReader:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        if (dataUrl) {
          setImagePreview(dataUrl);
          setFoodImage(dataUrl);
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
  };

  // Extra Choices Management
  const [draggedOptionIdx, setDraggedOptionIdx] = useState(null);

  const addExtraOption = () => {
    setExtraOptions(prev => [...prev, { name: '', price: '' }]);
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

  const moveExtraOption = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= extraOptions.length) return;
    setExtraOptions(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Validation
  const canProceedStep1 = foodName.trim() !== '' && category.trim() !== '';
  const canProceedStep2 = hasDifferentSizes
    ? portions.length > 0 && portions.every(p => p.name.trim() !== '' && p.price !== '')
    : singlePrice !== '' && !isNaN(Number(singlePrice));

  // Save Execution
  const handleFinalSave = () => {
    try {
      const basePriceNum = hasDifferentSizes ? Number(portions[0]?.price || 0) : Number(singlePrice || 0);
      const baseOldPriceNum = hasDifferentSizes
        ? (portions[0]?.regularPrice && Number(portions[0].regularPrice) > basePriceNum
            ? Number(portions[0].regularPrice)
            : (singleOldPrice ? Number(singleOldPrice) : undefined))
        : (singleOldPrice && Number(singleOldPrice) > basePriceNum
            ? Number(singleOldPrice)
            : undefined);

      const customizableData = {};

      if (hasDifferentSizes) {
        customizableData.portions = portions.map(p => {
          const sellingP = Number(p.price || 0);
          const regularP = Number(p.regularPrice || p.price || 0);
          return {
            name: p.name.trim(),
            price: sellingP,
            oldPrice: regularP > sellingP ? regularP : undefined,
            extra: Math.max(0, sellingP - basePriceNum)
          };
        });
      }

      if (hasExtraChoices && extraOptions.length > 0) {
        customizableData.addons = extraOptions
          .filter(opt => opt.name.trim() !== '')
          .map((opt, i) => ({
            id: `addon_${Date.now()}_${i}`,
            name: opt.name,
            price: Number(opt.price || 0)
          }));
      }

      const newFood = {
        ...(editingFood || {}),
        id: editingFood ? editingFood.id : Date.now(),
        title: foodName.trim(),
        tag: badgeTag,
        rating: editingFood?.rating ?? 5.0,
        ratingCount: editingFood?.ratingCount ?? 1,
        category: category,
        subcategory: subcategory.trim() || undefined,
        price: basePriceNum,
        oldPrice: baseOldPriceNum,
        description: description.trim() || 'Prepared fresh with premium quality ingredients.',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 overflow-y-auto select-auto touch-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[5px] border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-[#111827] border-slate-700 text-slate-100'
            : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        {/* Top Header - Solid, Sharp, Traditional */}
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 rounded-[5px] ${
          isDark ? 'bg-[#0B0F19] border-slate-700' : 'bg-slate-100 border-slate-300'
        }`}>
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-orange-600 block mb-0.5">
              RESTAURANT PORTAL &bull; MENU BUILDER
            </span>
            <div className="flex items-center gap-2.5">
              <h2 className={`text-base sm:text-lg font-bold tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {editingFood ? 'Edit Food Item' : 'Add New Food'}
              </h2>
              {editingFood && (
                <span className={`text-xs px-2.5 py-0.5 rounded-[5px] font-semibold border truncate max-w-[220px] ${
                  isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-orange-50 text-orange-700 border-orange-200'
                }`}>
                  {editingFood.title}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 border rounded-[5px] ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
            }`}>
              Step {currentStep} / 4
            </span>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className={`p-1.5 border rounded-[5px] transition-colors cursor-pointer ${
                isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-300 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Wizard Stepper Progress Bar */}
        <div className={`px-6 pt-3 pb-2.5 border-b shrink-0 ${
          isDark ? 'bg-[#111827] border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, title: 'Food Details', desc: 'Name, Photo, Category' },
              { num: 2, title: 'Size & Price', desc: 'Single or Variants' },
              { num: 3, title: 'Extra Choices', desc: 'Add-ons & Toppings' },
              { num: 4, title: 'Preview & Save', desc: 'Customer Menu View' }
            ].map(step => (
              <div
                key={step.num}
                onClick={() => {
                  if (step.num < currentStep || (step.num === 2 && canProceedStep1) || (step.num === 3 && canProceedStep2)) {
                    setCurrentStep(step.num);
                  }
                }}
                className={`cursor-pointer transition-all ${step.num <= currentStep ? 'opacity-100' : 'opacity-40'}`}
              >
                <div className={`h-1.5 rounded-[5px] transition-all mb-1 ${
                  step.num === currentStep
                    ? 'bg-orange-600'
                    : step.num < currentStep
                      ? 'bg-emerald-600'
                      : isDark ? 'bg-slate-700' : 'bg-slate-300'
                }`} />
                <span className={`text-[11px] font-bold block leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {step.title}
                </span>
                <span className="text-[9px] text-slate-500 hidden sm:block truncate">{step.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Step Body with Smooth Native Scrolling */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

          {/* ======================================================== */}
          {/* STEP 1: FOOD DETAILS                                     */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  1. Tell us about your food
                </h3>
                <p className="text-xs text-slate-500">
                  Enter the basic details that customers will see on your 3D digital menu.
                </p>
              </div>

              {/* Food Name */}
              <div>
                <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Food Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kacchi Biryani, Double Flame Cheeseburger..."
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                    isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Main Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={`w-full appearance-none pl-3.5 pr-10 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 cursor-pointer ${
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
                  <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Food Type / Subcategory <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Biryani, Burger, Sourdough Pizza..."
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${
                      isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Optional — চাইলে শুধু Main Category-ই থাকবে।</span>
                </div>
              </div>

              {/* Promotional Badge */}
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Promotional Tag / Badge
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Best Selling', 'Chef Special', 'Top Rated', 'New Item', 'Crispy & Spicy', 'Sweet Delight'].map(badge => (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => setBadgeTag(badge)}
                      className={`px-3 py-1.5 rounded-[5px] text-xs font-semibold border transition-colors cursor-pointer ${
                        badgeTag === badge
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                            : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {badge}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food Description */}
              <div>
                <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Food Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Traditional aromatic kacchi biryani, served with tender meat and potatoes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm focus:outline-none focus:border-orange-500 resize-none ${
                    isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Photo Upload with 3D Engine & Resolution Guidelines */}
              <div>
                <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Food Photo / Transparent PNG Image
                </label>
                <div 
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={handleImageDrop}
                  className={`p-4 rounded-[5px] border border-dashed flex flex-col sm:flex-row items-center gap-4 transition-all ${
                    isDark ? 'bg-slate-800/40 border-slate-700 hover:border-orange-500/50' : 'bg-slate-50 border-slate-300 hover:border-orange-500/50'
                  }`}
                >
                  {isOptimizingImage ? (
                    <div className="w-20 h-20 rounded-[5px] bg-orange-500/10 border border-orange-500/30 flex flex-col items-center justify-center shrink-0 text-orange-500 gap-1.5">
                      <Loader2 className="w-7 h-7 animate-spin" />
                      <span className="text-[10px] font-bold">Optimizing...</span>
                    </div>
                  ) : imagePreview ? (
                    <div className="relative w-24 h-24 rounded-[5px] overflow-hidden bg-black/20 border border-slate-400 shrink-0 flex items-center justify-center p-1">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview('');
                          setFoodImage('');
                          setImageMeta(null);
                        }}
                        className="absolute top-1 right-1 p-0.5 rounded-[5px] bg-red-600 text-white cursor-pointer"
                        title="Remove Image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-[5px] bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center shrink-0">
                      <Upload className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 text-center sm:text-left">
                    <span className={`text-xs font-semibold block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isOptimizingImage ? 'Processing & Optimizing Food Photo...' : 'Upload High-Quality PNG or Photo'}
                    </span>
                    <span className="text-[11px] text-slate-500 block mb-2">
                      {isOptimizingImage
                        ? 'Auto-trimming transparent borders and preparing image for 3D stage...'
                        : 'Transparent background PNG files look best for the 3D floating animation. Drag & drop or browse.'}
                    </span>
                    
                    {/* Live Image Resolution & Engine Badges */}
                    {imageMeta && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[5px] border ${
                          imageMeta.isOptimal 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}>
                          {imageMeta.width} × {imageMeta.height} px ({imageMeta.ratio}:1)
                        </span>
                        {imageMeta.autoTrimmed && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-[5px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            ✓ Auto-Trimmed for Maximum Zoom
                          </span>
                        )}
                        {imageMeta.isOptimal && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-[5px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                            ✓ 3D Stage Ready
                          </span>
                        )}
                      </div>
                    )}

                    <label className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm ${
                      isOptimizingImage ? 'opacity-60 pointer-events-none' : ''
                    }`}>
                      {isOptimizingImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Browse File</span>
                          <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Professional Recommended Resolution & Guidelines Box */}
                <div className={`mt-3 p-3.5 rounded-[5px] border ${
                  isDark ? 'bg-orange-500/[0.04] border-orange-500/25' : 'bg-orange-50/70 border-orange-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-orange-400' : 'text-orange-800'}`}>
                      Recommended 3D Menu Resolution & Guidelines
                    </h4>
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <div>
                      <p className="font-semibold text-orange-500 mb-0.5">• Recommended Resolution:</p>
                      <p><strong>1200 × 1200 px</strong> (Square 1:1) — Minimum <strong>1000 × 1000 px</strong> for crystal-clear HD rendering.</p>
                    </div>
                    <div>
                      <p className="font-semibold text-orange-500 mb-0.5">• Format & Transparency:</p>
                      <p>Transparent Background <strong>PNG (.png)</strong> or WebP with tight cutout around the plate.</p>
                    </div>
                    <div className="sm:col-span-2 pt-1.5 border-t border-orange-500/15">
                      <p className="font-semibold text-orange-500 mb-0.5">• Framing & Zoom Guide:</p>
                      <p>
                        The food plate should occupy <strong>85% – 90%</strong> of the canvas with minimal empty transparent border. Wide landscape images (like 16:9 with long cutlery) appear smaller in 3D rotation because the sides touch the container edges first.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: SIZE & PRICE                                     */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    2. Set Food Size & Price
                  </h3>
                  <p className="text-xs text-slate-500">
                    Does this food come in single price or multiple sizes (e.g. Half / Full / Family)?
                  </p>
                </div>
                <div className={`flex items-center p-1 border rounded-[5px] ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
                }`}>
                  <button
                    type="button"
                    onClick={() => setCurrency('৳')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-[5px] transition-colors ${
                      currency === '৳' ? 'bg-orange-600 text-white' : isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    ৳ BDT
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('$')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-[5px] transition-colors ${
                      currency === '$' ? 'bg-orange-600 text-white' : isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              {/* Toggle: Does this food have different sizes? */}
              <div
                onClick={() => setHasDifferentSizes(!hasDifferentSizes)}
                className={`p-3.5 rounded-[5px] border flex items-center justify-between cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800'
                    : 'bg-slate-50 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div>
                  <h4 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Does this food have different sizes?
                  </h4>
                  <p className="text-xs text-slate-500">Half / Full, Small / Medium / Large, etc.</p>
                </div>
                <div className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${
                  hasDifferentSizes ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-400'
                }`}>
                  {hasDifferentSizes && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Single Price & Discount Configuration Mode */}
              {!hasDifferentSizes ? (
                <div className={`p-4 rounded-[5px] border space-y-4 ${
                  isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-300'
                }`}>
                  {/* Row 1: Regular Price (MRP) & Discount Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Regular Base Price */}
                    <div>
                      <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Regular Price (Original / MRP) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">{currency}</span>
                        <input
                          type="number"
                          placeholder="200"
                          value={singleOldPrice || (discountMode === 'none' ? singlePrice : '')}
                          onChange={(e) => handleRegularPriceChange(e.target.value)}
                          className={`w-full pl-9 pr-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors ${
                            isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Base menu price before any promotional discount.
                      </span>
                    </div>

                    {/* Discount Type Selector */}
                    <div>
                      <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Discount Type / Promotion
                      </label>
                      <div className={`grid grid-cols-3 gap-1 p-1 rounded-[5px] border ${
                        isDark ? 'bg-[#0B0F19] border-slate-700' : 'bg-slate-100 border-slate-300'
                      }`}>
                        <button
                          type="button"
                          onClick={() => handleDiscountModeChange('none')}
                          className={`py-1.5 text-xs font-bold rounded-[4px] transition-colors cursor-pointer ${
                            discountMode === 'none'
                              ? 'bg-slate-700 text-white shadow-sm'
                              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          No Discount
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscountModeChange('percent')}
                          className={`py-1.5 text-xs font-bold rounded-[4px] transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                            discountMode === 'percent'
                              ? 'bg-orange-600 text-white shadow-sm'
                              : isDark ? 'text-slate-400 hover:text-orange-400' : 'text-slate-600 hover:text-orange-600'
                          }`}
                        >
                          <span>Percent (%)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscountModeChange('fixed')}
                          className={`py-1.5 text-xs font-bold rounded-[4px] transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                            discountMode === 'fixed'
                              ? 'bg-orange-600 text-white shadow-sm'
                              : isDark ? 'text-slate-400 hover:text-orange-400' : 'text-slate-600 hover:text-orange-600'
                          }`}
                        >
                          <span>Flat ({currency})</span>
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Choose percentage off or fixed flat discount.
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Discount Value & Calculated Selling Price (Visible when discount is active) */}
                  {discountMode !== 'none' && (
                    <div className={`p-3.5 rounded-[5px] border space-y-3 ${
                      isDark ? 'bg-orange-500/[0.05] border-orange-500/25' : 'bg-orange-50/70 border-orange-200'
                    }`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                        {/* Discount Value Input */}
                        <div>
                          <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-orange-400' : 'text-orange-900'}`}>
                            {discountMode === 'percent' ? 'Discount Percentage (%)' : `Flat Discount Amount (${currency})`}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-orange-600 font-bold">
                              {discountMode === 'percent' ? '%' : currency}
                            </span>
                            <input
                              type="number"
                              placeholder={discountMode === 'percent' ? '20' : '40'}
                              value={discountValue}
                              onChange={(e) => handleDiscountValueChange(e.target.value)}
                              className={`w-full pl-9 pr-3.5 py-2 rounded-[5px] border text-xs sm:text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors ${
                                isDark ? 'bg-[#0B0F19] border-orange-500/40 text-white' : 'bg-white border-orange-300 text-slate-900'
                              }`}
                            />
                          </div>

                          {/* Quick Percentage Presets */}
                          {discountMode === 'percent' && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {[10, 15, 20, 25, 30, 50].map(pct => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => handleDiscountValueChange(String(pct))}
                                  className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold border transition-colors cursor-pointer ${
                                    discountValue === String(pct)
                                      ? 'bg-orange-600 border-orange-600 text-white'
                                      : isDark
                                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-orange-500'
                                        : 'bg-white border-slate-300 text-slate-700 hover:border-orange-400'
                                  }`}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Final Discounted Selling Price */}
                        <div>
                          <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-orange-400' : 'text-orange-900'}`}>
                            Final Selling Price on Menu <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-emerald-500 font-bold">{currency}</span>
                            <input
                              type="number"
                              placeholder="160"
                              value={singlePrice}
                              onChange={(e) => handleFinalPriceChange(e.target.value)}
                              className={`w-full pl-9 pr-3.5 py-2 rounded-[5px] border text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors ${
                                isDark ? 'bg-[#0B0F19] border-emerald-500/40' : 'bg-white border-emerald-300'
                              }`}
                            />
                          </div>

                          {/* Live Savings Badge */}
                          {Number(singleOldPrice) > Number(singlePrice) && Number(singlePrice) > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <span className="px-1.5 py-0.5 rounded-[3px] bg-emerald-500/15 border border-emerald-500/30 font-black">
                                SAVE {currency}{(Number(singleOldPrice) - Number(singlePrice)).toFixed(2)}
                              </span>
                              <span className="text-slate-400 line-through">
                                MRP {currency}{Number(singleOldPrice).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <span className="text-[11px] text-slate-500 block">
                    Customer Digital Menu will display the final selling price prominently with original price struck through.
                  </span>
                </div>
              ) : (
                /* Multiple Portions Mode with Full MRP & Discount Support */
                <div className="space-y-4">
                  {/* Bulk Quick Discount Toolbar */}
                  <div className={`p-3 rounded-[5px] border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    isDark ? 'bg-orange-500/[0.04] border-orange-500/25' : 'bg-orange-50/70 border-orange-200'
                  }`}>
                    <div>
                      <span className={`text-xs font-bold block ${isDark ? 'text-orange-400' : 'text-orange-900'}`}>
                        Portion Sizes & Promotional Discounts
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Set regular MRP and optional discounts for each portion variant below.
                      </span>
                    </div>

                    <div className="flex items-center flex-wrap gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                        Apply All:
                      </span>
                      {[10, 15, 20, 25, 30].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => applyDiscountToAllPortions('percent', pct)}
                          className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold border transition-colors cursor-pointer ${
                            isDark
                              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-orange-500 hover:text-white'
                              : 'bg-white border-slate-300 text-slate-700 hover:border-orange-400 hover:text-slate-900'
                          }`}
                        >
                          {pct}% OFF
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => applyDiscountToAllPortions('none')}
                        className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold border transition-colors cursor-pointer ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            : 'bg-white border-slate-300 text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Portions Cards List */}
                  <div className="space-y-3">
                    {portions.map((portion, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-[5px] border space-y-3 ${
                          isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-300'
                        }`}
                      >
                        {/* Portion Card Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                              Portion {idx + 1}
                            </span>
                            {idx === 0 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                                3D Default Portion
                              </span>
                            )}
                          </div>
                          {portions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePortion(idx)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                              title="Delete this portion"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Row 1: Portion Name & Regular Price (MRP) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Portion Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Half, Full, 10-inch, Family Pack..."
                              value={portion.name}
                              onChange={(e) => updatePortion(idx, 'name', e.target.value)}
                              className={`w-full px-3 py-1.5 rounded-[5px] border text-xs font-medium focus:outline-none focus:border-orange-500 ${
                                isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Regular Price (MRP) ({currency}) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1.5 text-slate-500 font-bold text-xs">{currency}</span>
                              <input
                                type="number"
                                placeholder="200"
                                value={portion.regularPrice || (portion.discountMode === 'none' ? portion.price : '')}
                                onChange={(e) => updatePortion(idx, 'regularPrice', e.target.value)}
                                className={`w-full pl-7 pr-3 py-1.5 rounded-[5px] border text-xs font-bold focus:outline-none focus:border-orange-500 ${
                                  isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Discount Type Selector */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              Portion Discount / Promotion
                            </label>
                            {portion.discountMode === 'none' && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                Selling Price: <strong className="text-orange-500">{currency}{portion.price || '0'}</strong>
                              </span>
                            )}
                          </div>
                          <div className={`grid grid-cols-3 gap-1 p-0.5 rounded-[5px] border ${
                            isDark ? 'bg-[#0B0F19] border-slate-700' : 'bg-slate-200/70 border-slate-300'
                          }`}>
                            <button
                              type="button"
                              onClick={() => updatePortion(idx, 'discountMode', 'none')}
                              className={`py-1 text-xs font-bold rounded-[3px] transition-colors cursor-pointer ${
                                portion.discountMode === 'none'
                                  ? 'bg-slate-700 text-white shadow-sm'
                                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              No Discount
                            </button>
                            <button
                              type="button"
                              onClick={() => updatePortion(idx, 'discountMode', 'percent')}
                              className={`py-1 text-xs font-bold rounded-[3px] transition-colors cursor-pointer ${
                                portion.discountMode === 'percent'
                                  ? 'bg-orange-600 text-white shadow-sm'
                                  : isDark ? 'text-slate-400 hover:text-orange-400' : 'text-slate-600 hover:text-orange-600'
                              }`}
                            >
                              Percent (%)
                            </button>
                            <button
                              type="button"
                              onClick={() => updatePortion(idx, 'discountMode', 'fixed')}
                              className={`py-1 text-xs font-bold rounded-[3px] transition-colors cursor-pointer ${
                                portion.discountMode === 'fixed'
                                  ? 'bg-orange-600 text-white shadow-sm'
                                  : isDark ? 'text-slate-400 hover:text-orange-400' : 'text-slate-600 hover:text-orange-600'
                              }`}
                            >
                              Flat ({currency})
                            </button>
                          </div>
                        </div>

                        {/* Row 3: Discount Value & Calculated Selling Price (When Discount is Active) */}
                        {portion.discountMode !== 'none' && (
                          <div className={`p-2.5 rounded-[5px] border space-y-2.5 ${
                            isDark ? 'bg-orange-500/[0.05] border-orange-500/25' : 'bg-orange-50/70 border-orange-200'
                          }`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                              {/* Discount Value */}
                              <div>
                                <label className={`text-[10px] font-semibold block mb-1 ${isDark ? 'text-orange-400' : 'text-orange-900'}`}>
                                  {portion.discountMode === 'percent' ? 'Discount Percentage (%)' : `Flat Discount (${currency})`}
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1.5 text-orange-600 font-bold text-xs">
                                    {portion.discountMode === 'percent' ? '%' : currency}
                                  </span>
                                  <input
                                    type="number"
                                    placeholder={portion.discountMode === 'percent' ? '20' : '40'}
                                    value={portion.discountValue}
                                    onChange={(e) => updatePortion(idx, 'discountValue', e.target.value)}
                                    className={`w-full pl-7 pr-2.5 py-1.5 rounded-[5px] border text-xs font-bold focus:outline-none focus:border-orange-500 ${
                                      isDark ? 'bg-[#0B0F19] border-orange-500/40 text-white' : 'bg-white border-orange-300 text-slate-900'
                                    }`}
                                  />
                                </div>

                                {/* Quick chips if percent */}
                                {portion.discountMode === 'percent' && (
                                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                    {[10, 15, 20, 25, 30, 50].map(pct => (
                                      <button
                                        key={pct}
                                        type="button"
                                        onClick={() => updatePortion(idx, 'discountValue', String(pct))}
                                        className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold border transition-colors cursor-pointer ${
                                          portion.discountValue === String(pct)
                                            ? 'bg-orange-600 border-orange-600 text-white'
                                            : isDark
                                              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-orange-500'
                                              : 'bg-white border-slate-300 text-slate-700 hover:border-orange-400'
                                        }`}
                                      >
                                        {pct}%
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Final Selling Price for Portion */}
                              <div>
                                <label className={`text-[10px] font-semibold block mb-1 ${isDark ? 'text-orange-400' : 'text-orange-900'}`}>
                                  Final Selling Price on Menu <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1.5 text-emerald-500 font-bold text-xs">{currency}</span>
                                  <input
                                    type="number"
                                    placeholder="180"
                                    value={portion.price}
                                    onChange={(e) => updatePortion(idx, 'price', e.target.value)}
                                    className={`w-full pl-7 pr-2.5 py-1.5 rounded-[5px] border text-xs font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500 ${
                                      isDark ? 'bg-[#0B0F19] border-emerald-500/40' : 'bg-white border-emerald-300'
                                    }`}
                                  />
                                </div>

                                {/* Live Savings Badge */}
                                {Number(portion.regularPrice) > Number(portion.price) && Number(portion.price) > 0 && (
                                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    <span className="px-1.5 py-0.5 rounded-[3px] bg-emerald-500/15 border border-emerald-500/30 font-black">
                                      SAVE {currency}{(Number(portion.regularPrice) - Number(portion.price)).toFixed(2)}
                                    </span>
                                    <span className="text-slate-400 line-through">
                                      MRP {currency}{Number(portion.regularPrice).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Portion Button */}
                  <button
                    type="button"
                    onClick={addPortion}
                    className={`w-full py-2.5 rounded-[5px] border border-dashed font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      isDark ? 'border-slate-700 text-slate-300 hover:border-orange-500 hover:text-orange-400' : 'border-slate-300 text-slate-700 hover:border-orange-500 hover:text-orange-600'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Another Portion</span>
                  </button>

                  <span className="text-[11px] text-slate-500 block">
                    Single-price dishes do not require multiple portions. When portions are defined, the first portion serves as the default size on the 3D menu.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: EXTRA CHOICES (ADD-ONS)                          */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  3. Add Extra Choices & Toppings
                </h3>
                <p className="text-xs text-slate-500">
                  Offer add-ons like Extra Egg, Meat, Cheese, Sauce or Soft Drinks.
                </p>
              </div>

              {/* Toggle: Does this food have extra options? */}
              <div
                onClick={() => setHasExtraChoices(!hasExtraChoices)}
                className={`p-3.5 rounded-[5px] border flex items-center justify-between cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800'
                    : 'bg-slate-50 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div>
                  <h4 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Does this food have extra options?
                  </h4>
                  <p className="text-xs text-slate-500">Egg, Meat, Cheese, Sauce, etc.</p>
                </div>
                <div className={`w-5 h-5 rounded-[5px] border flex items-center justify-center ${
                  hasExtraChoices ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-400'
                }`}>
                  {hasExtraChoices && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {hasExtraChoices && (
                <div className="space-y-4">
                  {/* Choice Group Name */}
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Choice Group Name
                    </label>
                    <input
                      type="text"
                      placeholder="Extra Add-ons"
                      value={choiceGroupName}
                      onChange={(e) => setChoiceGroupName(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 ${
                        isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Customer Selection Policy */}
                  <div>
                    <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      How can customers choose?
                    </label>
                    <div className="space-y-1.5">
                      {[
                        { id: 'multiple', label: 'Choose multiple (e.g. Egg + Meat)' },
                        { id: 'single', label: 'Choose only one' },
                        { id: 'required', label: 'Customer must select an option' }
                      ].map(type => (
                        <div
                          key={type.id}
                          onClick={() => setSelectionType(type.id)}
                          className={`p-2.5 rounded-[5px] border flex items-center gap-2.5 cursor-pointer text-xs font-medium transition-colors ${
                            selectionType === type.id
                              ? 'bg-orange-500/10 border-orange-600 text-orange-600 font-bold'
                              : isDark
                                ? 'bg-slate-800/40 border-slate-700 text-slate-300'
                                : 'bg-white border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-[5px] border flex items-center justify-center ${
                            selectionType === type.id ? 'border-orange-600 bg-orange-600' : 'border-slate-400'
                          }`}>
                            {selectionType === type.id && <div className="w-1.5 h-1.5 bg-white" />}
                          </div>
                          <span>{type.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Maximum Number of Choices */}
                  <div>
                    <label className={`text-xs font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Maximum number of choices
                    </label>
                    <div className="relative">
                      <select
                        value={maxSelections}
                        onChange={(e) => setMaxSelections(Number(e.target.value))}
                        className={`w-full appearance-none pl-3.5 pr-10 py-2 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 cursor-pointer ${
                          isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                        <option value={999}>Unlimited</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Extra Options List */}
                  <div className={`pt-3 border-t space-y-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600">
                      Extra Food Options
                    </h4>

                    {extraOptions.map((opt, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleExtraDragStart(e, idx)}
                        onDragOver={(e) => handleExtraDragOver(e, idx)}
                        onDragEnd={handleExtraDragEnd}
                        className={`p-3 rounded-[5px] border flex items-center gap-2.5 transition-all ${
                          draggedOptionIdx === idx ? 'opacity-40 scale-[0.98] border-orange-500' : ''
                        } ${
                          isDark ? 'bg-slate-800/40 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {/* Drag Handle & Up/Down Controls */}
                        <div
                          className="flex flex-col items-center justify-center shrink-0 text-slate-400 gap-0.5 cursor-grab active:cursor-grabbing select-none"
                          title="Drag up or down to reorder"
                        >
                          <GripVertical className="w-4 h-4 text-slate-400 hover:text-orange-500 transition-colors" />
                          <div className="flex flex-col -space-y-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveExtraOption(idx, -1)}
                              className={`p-0.5 rounded hover:text-orange-500 ${idx === 0 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                              title="Move up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === extraOptions.length - 1}
                              onClick={() => moveExtraOption(idx, 1)}
                              className={`p-0.5 rounded hover:text-orange-500 ${idx === extraOptions.length - 1 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                              title="Move down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Extra Name Input */}
                        <div className="flex-1 min-w-0">
                          <label className="text-[10px] text-slate-500 block mb-0.5">Extra Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Extra Egg"
                            value={opt.name}
                            onChange={(e) => updateExtraOption(idx, 'name', e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded-[5px] border text-xs font-medium focus:outline-none focus:border-orange-500 ${
                              isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>

                        {/* Extra Price Input */}
                        <div className="w-24 sm:w-28 shrink-0">
                          <label className="text-[10px] text-slate-500 block mb-0.5">Extra Price ({currency})</label>
                          <input
                            type="number"
                            placeholder="30"
                            value={opt.price}
                            onChange={(e) => updateExtraOption(idx, 'price', e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded-[5px] border text-xs font-bold focus:outline-none focus:border-orange-500 ${
                              isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => removeExtraOption(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors mt-3 shrink-0 cursor-pointer"
                          title="Delete option"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addExtraOption}
                      className={`w-full py-2 rounded-[5px] border border-dashed font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                        isDark ? 'border-slate-700 text-slate-300 hover:text-orange-400' : 'border-slate-300 text-slate-700 hover:text-orange-600'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Extra Option</span>
                    </button>

                    
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: PREVIEW & PUBLISH                                */}
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

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      4. Customer Menu Preview
                    </h3>
                    <p className="text-xs text-slate-500">
                      Review exactly how this item will look and function on the customer's 3D menu.
                    </p>
                  </div>
                  
                </div>

                {/* Solid Preview Card */}
                <div className={`max-w-md mx-auto p-4 rounded-[5px] border space-y-3 ${
                  isDark ? 'bg-[#0B0F19] border-slate-700' : 'bg-slate-50 border-slate-300'
                }`}>
                  <div className="relative w-full h-44 rounded-[5px] overflow-hidden bg-black/10 border border-slate-400 flex items-center justify-center">
                    {imagePreview || foodImage ? (
                      <img src={imagePreview || foodImage} alt={foodName} className="w-full h-full object-contain p-2" />
                    ) : (
                      <Utensils className="w-12 h-12 text-slate-400" />
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-[5px] bg-orange-600 text-white font-bold text-[10px] uppercase tracking-wider">
                      {badgeTag}
                    </div>
                  </div>

                  <div>
                    <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {foodName || 'Food Title'}
                    </h4>
                    <p className="text-xs text-orange-600 font-semibold">
                      {category} {subcategory ? `/ ${subcategory}` : ''}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Portions Interactive Preview */}
                  {hasDifferentSizes && (
                    <div className="space-y-1 pt-2 border-t border-slate-300 dark:border-slate-700">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">CHOOSE PORTION</span>
                      <div className="space-y-1">
                        {portions.map((p, i) => {
                          const isSelected = previewSelectedPortion === i;
                          return (
                            <div
                              key={i}
                              onClick={() => setPreviewSelectedPortion(i)}
                              className={`p-2.5 rounded-[5px] border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-orange-600/10 border-orange-600 font-bold'
                                  : isDark
                                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                                    : 'bg-white border-slate-300 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3.5 h-3.5 rounded-[5px] border flex items-center justify-center ${
                                  isSelected ? 'border-orange-600 bg-orange-600' : 'border-slate-400'
                                }`}>
                                  {isSelected && <div className="w-1.5 h-1.5 bg-white" />}
                                </div>
                                <span>{p.name || `Portion ${i+1}`}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-orange-600">{currency}{p.price || '0'}</span>
                                {Number(p.regularPrice) > Number(p.price) && (
                                  <span className="text-[10px] text-slate-400 line-through">
                                    {currency}{p.regularPrice}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Extra Addons Interactive Preview */}
                  {hasExtraChoices && extraOptions.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-slate-300 dark:border-slate-700">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">{choiceGroupName || 'EXTRA ADD-ONS'}</span>
                      <div className="space-y-1">
                        {extraOptions.map((opt, i) => {
                          const isChecked = previewSelectedAddons.includes(i);
                          return (
                            <div
                              key={i}
                              onClick={() => togglePreviewAddon(i)}
                              className={`p-2.5 rounded-[5px] border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-orange-600/10 border-orange-600 font-bold'
                                  : isDark
                                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                                    : 'bg-white border-slate-300 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3.5 h-3.5 rounded-[5px] border flex items-center justify-center ${
                                  isChecked ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-400'
                                }`}>
                                  {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                                <span>{opt.name || `Option ${i+1}`}</span>
                              </div>
                              <span className="font-bold text-orange-600">+{currency}{opt.price || '0'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Total Price Bar */}
                  <div className={`p-3 rounded-[5px] border flex items-center justify-between font-bold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}>
                    <span className="text-xs uppercase tracking-wider">Total Price</span>
                    <span className="text-base text-orange-600">
                      {currency}{previewTotalPrice}
                    </span>
                  </div>
                </div>

                </div>
            );
          })()}
        </div>

        {/* Wizard Bottom Controls - Sharp, Solid */}
        <div className={`px-6 py-3.5 border-t flex items-center justify-between shrink-0 rounded-[5px] ${
          isDark ? 'bg-[#0B0F19] border-slate-700' : 'bg-slate-100 border-slate-300'
        }`}>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className={`px-4 py-2 rounded-[5px] border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : <div />}

          {currentStep < 4 ? (
            <button
              type="button"
              disabled={currentStep === 1 ? !canProceedStep1 : !canProceedStep2}
              onClick={() => setCurrentStep(prev => prev + 1)}
              className={`px-6 py-2 rounded-[5px] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                (currentStep === 1 ? canProceedStep1 : canProceedStep2)
                  ? 'bg-orange-600 hover:bg-orange-500 text-white'
                  : isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSave}
              className="px-6 py-2.5 rounded-[5px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors shadow"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{editingFood ? 'UPDATE FOOD ITEM' : 'PUBLISH TO DIGITAL MENU'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
