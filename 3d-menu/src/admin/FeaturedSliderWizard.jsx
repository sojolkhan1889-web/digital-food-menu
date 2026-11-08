import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Flame,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Tag,
  DollarSign,
  Utensils,
  ChevronDown
} from 'lucide-react';

export default function FeaturedSliderWizard({
  isOpen,
  onClose,
  onSave,
  foods = [],
  editingSlider = null,
  currency = '$',
  theme = 'light'
}) {
  const isDark = theme === 'dark';

  // Step 1: Form Inputs, Step 2: Live Digital Menu Preview
  const [step, setStep] = useState(1);

  // Form State
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [badgeText, setBadgeText] = useState('CHEF SPECIAL');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [selectedDiscountPct, setSelectedDiscountPct] = useState(null);
  const [foodImage, setFoodImage] = useState('');
  const [isPng, setIsPng] = useState(true);

  const resetForm = () => {
    setStep(1);
    setSelectedDiscountPct(null);
    if (editingSlider) {
      setSelectedFoodId(String(editingSlider.foodId || ''));
      setBadgeText(editingSlider.badge || 'CHEF SPECIAL');
      setTitle(editingSlider.title || '');
      setSubtitle(editingSlider.subtitle || '');
      setCustomPrice(String(editingSlider.price || ''));
      setFoodImage(editingSlider.image || '');
      setIsPng(editingSlider.isPng !== false);
    } else {
      setSelectedFoodId('');
      setBadgeText('CHEF SPECIAL');
      setTitle('');
      setSubtitle('');
      setCustomPrice('');
      setFoodImage('');
      setIsPng(true);
    }
  };

  // Reset form whenever modal opens or editingSlider changes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, editingSlider]);

  const handleFoodSelect = (foodId) => {
    setSelectedFoodId(String(foodId));
    setSelectedDiscountPct(null);
    if (!foodId) {
      setTitle('');
      setSubtitle('');
      setCustomPrice('');
      setFoodImage('');
      setIsPng(true);
      return;
    }
    const found = foods.find(f => String(f.id) === String(foodId));
    if (found) {
      setTitle(found.title || '');
      setSubtitle(found.description ? (found.description.length > 95 ? found.description.slice(0, 95) + '...' : found.description) : 'Special chef curated delight');
      // Default promo price to food's regular price (oldPrice or price)
      const regularPrice = Number(found.oldPrice || found.price || 0);
      setCustomPrice(String(found.price !== undefined && found.price !== null ? found.price : regularPrice));
      setFoodImage(found.image || '');
      setIsPng(found.isPng !== false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePublish = () => {
    const slideToSave = {
      id: editingSlider ? editingSlider.id : `slide_${Date.now()}`,
      badge: badgeText.trim() || 'FEATURED SPECIAL',
      title: title.trim() || 'Special Dish',
      subtitle: subtitle.trim() || 'Chef curated delight',
      foodId: selectedFoodId,
      foodTitle: title.trim(),
      price: Number(customPrice || 0),
      image: foodImage,
      isPng: isPng,
      isActive: editingSlider ? editingSlider.isActive : true,
      displayOrder: editingSlider ? (editingSlider.displayOrder || Date.now()) : Date.now()
    };

    onSave(slideToSave);
    handleClose();
  };

  if (!isOpen) return null;

  const canProceed = title.trim() !== '' && selectedFoodId !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm select-auto">
      <div className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[5px] border shadow-2xl overflow-hidden ${isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
        }`}>

        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-slate-800 bg-[#0B0F19]' : 'border-slate-300 bg-slate-50'
          }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-orange-600 dark:text-orange-400">
                Digital Menu Featured Engine
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-[10px] text-slate-500 font-semibold">
                Step {step} of 2 ({step === 1 ? 'Configure' : 'Live Preview'})
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              {step === 1 ? (editingSlider ? 'Edit Featured Special Slider' : 'Create New Featured Special Slider') : 'Customer Digital Menu Preview'}
            </h2>
          </div>

          <button
            onClick={handleClose}
            className={`p-1.5 rounded-[5px] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'
              }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">

          {step === 1 ? (
            /* STEP 1: FORM INPUTS */
            <div className="space-y-4">

              {/* Promo Food Select */}
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Select Promo Food Item <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedFoodId}
                    onChange={(e) => handleFoodSelect(e.target.value)}
                    className={`w-full appearance-none pl-3.5 pr-10 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors cursor-pointer ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                  >
                    <option value="">-- Choose a Food Item from Catalog --</option>
                    {foods.map(f => (
                      <option key={f.id} value={String(f.id)}>
                        {f.title} ({f.category}) — {currency}{Number(f.price || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Select which food from your menu catalog will be featured on this banner.
                </span>
              </div>

              {/* Promotional Badge Text */}
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Badge Text (Top Label)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHEF SPECIAL, 20% OFF, WEEKEND DEAL"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors uppercase ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['CHEF SPECIAL', 'WEEKEND DEAL', 'POPULAR DEAL', 'SWEET DELIGHT', 'NEW ARRIVAL', '20% OFF'].map(badge => (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => setBadgeText(badge)}
                      className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold border transition-colors cursor-pointer ${badgeText === badge
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

              {/* Main Title */}
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Main Title <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Double Flame Cheeseburger"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Prominent header text displayed directly below the badge.
                </span>
              </div>

              {/* Sub Title / Tagline */}
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Sub Title / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Flame-grilled Angus patty with melted Wisconsin cheddar & secret sauce..."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Shows directly below the main title on the customer's digital menu slider.
                </span>
              </div>

              {/* Promo Price & Food Photo Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Featured Promo Price ({currency})
                    </label>
                    {selectedFoodId && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        Quick Promo Discount:
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="15.99"
                    value={customPrice}
                    onChange={(e) => {
                      setCustomPrice(e.target.value);
                      setSelectedDiscountPct(null);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-[5px] border text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors ${isDark ? 'bg-[#0B0F19] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                  />
                  {/* Quick Promotional Discount Buttons (e.g. 10% OFF, 20% OFF) */}
                  {selectedFoodId && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {[10, 15, 20, 25, 30, 50].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const baseFood = foods.find(f => String(f.id) === String(selectedFoodId));
                            // Apply discount against the food's regular price (oldPrice or price)
                            const regularPrice = Number(baseFood?.oldPrice || baseFood?.price || 0);
                            if (regularPrice > 0) {
                              const discounted = Number((regularPrice * (1 - pct / 100)).toFixed(2));
                              setCustomPrice(String(discounted));
                              setSelectedDiscountPct(pct);
                              // DO NOT overwrite badgeText! Badge Text (Top Label) remains independent as selected by the user.
                            }
                          }}
                          className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold border transition-colors cursor-pointer ${
                            selectedDiscountPct === pct
                              ? 'bg-orange-600 border-orange-600 text-white shadow-sm'
                              : isDark
                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-orange-500'
                                : 'bg-slate-100 border-slate-300 text-slate-700 hover:border-orange-400'
                          }`}
                        >
                          {pct}% OFF
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Linked Food Photo
                  </label>
                  <div className={`p-2 rounded-[5px] border flex items-center gap-3 ${isDark ? 'bg-[#0B0F19] border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}>
                    {foodImage ? (
                      <div className="w-10 h-10 rounded-[5px] bg-black/20 flex items-center justify-center p-0.5 border border-slate-300 dark:border-slate-700 shrink-0">
                        <img src={foodImage} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-[5px] bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                        <Utensils className="w-4 h-4" />
                      </div>
                    )}
                    <span className="text-xs text-slate-500 truncate">
                      {title || 'Selected Food Cutout'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* STEP 2: LIVE DIGITAL MENU PREVIEW */
            <div className="space-y-4">
              <div className="p-3 rounded-[5px] bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-300 text-xs flex items-center gap-2">
                <Eye className="w-4 h-4 shrink-0 text-orange-500" />
                <span>
                  Below is exactly how this Featured Special banner will look inside your customer's 3D Digital Menu.
                </span>
              </div>

              {/* Exact Reproduction of Customer Menu Featured Special Banner */}
              <div className="max-w-md mx-auto my-2 rounded-2xl border border-white/20 shadow-2xl overflow-hidden bg-[#06080D] p-1">
                <div className="w-full bg-gradient-to-r from-orange-600/40 via-red-600/30 to-black/60 p-4 sm:p-5 rounded-xl flex items-center justify-between min-h-[135px]">

                  {/* Left Column Text Details */}
                  <div className="flex-1 pr-3 z-10">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/30 border border-orange-400/50 text-amber-300 font-black text-[10px] uppercase tracking-wider mb-1.5">
                      <Flame className="text-amber-400 w-3 h-3 fill-amber-400" />
                      <span>{badgeText || 'CHEF SPECIAL'}</span>
                    </div>

                    <h4 className="text-white font-extrabold text-base sm:text-lg leading-snug">
                      {title || 'Featured Food Item'}
                    </h4>

                    {subtitle && (
                      <p className="text-slate-300 text-xs mt-1 line-clamp-2 leading-relaxed">
                        {subtitle}
                      </p>
                    )}

                    <div className="mt-2.5 inline-flex items-center gap-1 text-orange-400 font-black text-xs sm:text-sm">
                      <span>Explore Dish &bull; {currency}{Number(customPrice || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Right Column Food Image Cutout */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 flex items-center justify-center relative">
                    {foodImage ? (
                      <img
                        src={foodImage}
                        alt={title}
                        className={isPng ? "w-full h-full object-contain drop-shadow-2xl scale-110" : "w-20 h-20 object-cover rounded-full border border-white/30 shadow-md"}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                        <Utensils className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-[5px] border text-[11px] text-slate-500 text-center ${isDark ? 'border-slate-800 bg-[#0B0F19]' : 'border-slate-200 bg-slate-50'
                }`}>
                Customer interaction: Clicking this banner inside the menu will automatically open the dish in the 3D rotating hologram stage!
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className={`p-4 border-t flex items-center justify-between shrink-0 ${isDark ? 'border-slate-800 bg-[#0B0F19]' : 'border-slate-300 bg-slate-50'
          }`}>
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className={`px-4 py-2 rounded-[5px] border text-xs font-semibold cursor-pointer ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!canProceed}
                onClick={() => setStep(2)}
                className="px-5 py-2 rounded-[5px] bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow disabled:opacity-50"
              >
                <span>Next: Live Menu Preview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`px-4 py-2 rounded-[5px] border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Edit</span>
              </button>

              <button
                type="button"
                onClick={handlePublish}
                className="px-5 py-2 rounded-[5px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingSlider ? 'Update Featured Slider' : 'Publish to Digital Menu'}</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
