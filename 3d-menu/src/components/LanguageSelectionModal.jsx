import React, { useState, useEffect } from 'react';
import { Globe, ArrowRight, ChevronRight, Search, ArrowLeft } from 'lucide-react';
import { AVAILABLE_LANGUAGES, t } from '../utils/translations';

/**
 * LanguageSelectionModal - Elegant modal matching Image 1
 * Prompts customer to select their preferred browsing language on initial QR scan.
 * Defaults to the restaurant's country national language + English.
 */
export default function LanguageSelectionModal({
  isOpen = false,
  onClose,
  onSelectLanguage,
  currentLanguage = 'en',
  restaurantPrimaryLanguage = null,
  // Per User instruction: "Appadotto Other Language select korar option ta hide rakho oita amra pore active korbo"
  showOtherLanguages = false
}) {
  const nativeLang = restaurantPrimaryLanguage || {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    subtitle: 'আপনার পছন্দের ভাষা বেছে নিন'
  };

  const [selectedCode, setSelectedCode] = useState(currentLanguage || 'en');
  const [isOtherView, setIsOtherView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Keep internal selection synced when modal opens or language changes
  useEffect(() => {
    if (isOpen) {
      setSelectedCode(currentLanguage || 'en');
      setIsOtherView(false);
      setSearchQuery('');
    }
  }, [isOpen, currentLanguage]);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (onSelectLanguage) {
      onSelectLanguage(selectedCode);
    }
    if (onClose) {
      onClose();
    }
  };

  // Filter languages for the "Other languages" secondary screen (when enabled in future)
  const filteredLanguages = AVAILABLE_LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      onClick={(e) => {
        // Prevent accidental backdrop closing on first-time required prompt
        e.stopPropagation();
      }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] sm:max-w-[370px] rounded-[28px] bg-[#0c101c]/80 backdrop-blur-2xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.12)] p-5 sm:p-6 text-white relative animate-[scaleUp_0.25s_cubic-bezier(0.16,1,0.3,1)]"
      >
        {!isOtherView ? (
          /* ======================================================== */
          /* PRIMARY VIEW: Matching Image 1                          */
          /* Header (Globe + Title + Subtitle) + 2 Buttons + Continue */
          /* ======================================================== */
          <div>
            {/* Header: Globe Icon + Title & Localized Subtitle */}
            <div className="flex items-start gap-3.5 mb-5">
              <div className="w-10 h-10 rounded-full bg-[#fd6e00]/15 border border-[#fd6e00]/30 flex items-center justify-center text-[#fd6e00] shrink-0 mt-0.5 shadow-[0_0_15px_rgba(253,110,0,0.25)]">
                <Globe className="w-5 h-5 text-[#fd6e00] stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-white font-inter font-bold sm:font-extrabold text-lg sm:text-[19px] tracking-tight leading-snug">
                  Choose your language
                </h3>
                <p className="text-[13px] text-slate-300 font-hind-siliguri font-medium sm:font-semibold leading-tight mt-0.5">
                  {nativeLang.subtitle || "আপনার পছন্দের ভাষা বেছে নিন"}
                </p>
              </div>
            </div>

            {/* Language Options Row: Native Language (Left) & English (Right) */}
            {/* Fixed border-2 on both states to completely prevent layout shift/shake */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3">
              {/* Native Language (e.g., বাংলা) */}
              <button
                type="button"
                onClick={() => setSelectedCode(nativeLang.code)}
                className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between border-2 transition-all cursor-pointer select-none backdrop-blur-md ${
                  selectedCode === nativeLang.code
                    ? 'border-[#fd6e00] bg-[#fd6e00]/15 text-white shadow-[0_0_18px_rgba(253,110,0,0.30)]'
                    : 'border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200'
                }`}
              >
                <span className="font-bold text-base sm:text-lg">
                  {nativeLang.nativeName || 'বাংলা'}
                </span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedCode === nativeLang.code
                      ? 'border-[#fd6e00]'
                      : 'border-zinc-500'
                  }`}
                >
                  {selectedCode === nativeLang.code && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#fd6e00]" />
                  )}
                </div>
              </button>

              {/* English (Always Present) */}
              <button
                type="button"
                onClick={() => setSelectedCode('en')}
                className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between border-2 transition-all cursor-pointer select-none backdrop-blur-md ${
                  selectedCode === 'en'
                    ? 'border-[#fd6e00] bg-[#fd6e00]/15 text-white shadow-[0_0_18px_rgba(253,110,0,0.30)]'
                    : 'border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200'
                }`}
              >
                <span className="font-bold text-base sm:text-lg font-inter">
                  English
                </span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedCode === 'en'
                      ? 'border-[#fd6e00]'
                      : 'border-zinc-500'
                  }`}
                >
                  {selectedCode === 'en' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#fd6e00]" />
                  )}
                </div>
              </button>
            </div>

            {/* Optional Other Languages Row (Hidden for now per user instruction) */}
            {showOtherLanguages && (
              <button
                type="button"
                onClick={() => setIsOtherView(true)}
                className="w-full p-3.5 rounded-2xl bg-[#1a1722]/80 hover:bg-[#23202e] border border-zinc-700/60 flex items-center justify-between text-slate-200 mb-3.5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-[#fd6e00]" />
                  <span className="font-medium text-xs sm:text-sm font-inter">Other languages</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            )}

            {/* Continue Button matching Image 1 */}
            <button
              type="button"
              onClick={handleContinue}
              className="w-full mt-2 py-3.5 sm:py-4 rounded-2xl bg-[#fd6e00] hover:bg-[#e66400] active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(253,110,0,0.35)] transition-all cursor-pointer"
            >
              <span className="text-white font-inter font-bold">Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] text-white" />
            </button>
          </div>
        ) : (
          /* ======================================================== */
          /* SECONDARY VIEW: Matching Image 2 (For Future Activation) */
          /* ======================================================== */
          <div>
            {/* Header with Back Arrow */}
            <div className="flex items-center gap-2.5 mb-4">
              <button
                type="button"
                onClick={() => setIsOtherView(false)}
                className="p-1 rounded-full hover:bg-white/10 active:scale-95 text-[#fd6e00] cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 text-[#fd6e00]" />
              </button>
              <h3 className="text-white font-inter font-bold text-base sm:text-lg">
                Other languages
              </h3>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-[#fd6e00]"
              />
            </div>

            {/* Languages Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 mb-4 no-scrollbar">
              {filteredLanguages.map((lang) => {
                const isSelected = selectedCode === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedCode(lang.code)}
                    className={`p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1b1712] border-2 border-[#fd6e00] text-white shadow-[0_0_12px_rgba(253,110,0,0.25)]'
                        : 'bg-zinc-900/70 border border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-sm block">{lang.nativeName}</span>
                      <span className="text-[10px] text-zinc-400">{lang.name}</span>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                        isSelected ? 'border-2 border-[#fd6e00]' : 'border border-zinc-600'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#fd6e00]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Continue Button */}
            <button
              type="button"
              onClick={handleContinue}
              className="w-full py-3 sm:py-3.5 rounded-2xl bg-[#fd6e00] hover:bg-[#e66400] active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(253,110,0,0.35)] cursor-pointer"
            >
              <span className="text-white font-inter font-bold">Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
