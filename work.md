# Universal Digital Food Menu & Restaurant Panel — Development Log (`work.md`)

This file records all architectural specifications, resolved issues, feature implementations, and system rules to ensure future development preserves existing behavior and avoids regressions.

---

## 1. Core Architecture & Navigation Rules

### A. Restaurant Panel Navigation Gating (Super Admin Controlled)
- **Rule:** By default, **NO restaurant account has Order Management, Dashboard, or Payments activated**.
- **Default Navigation Menu Items (Standard Plan):**
  1. `Food Items & Publish` (Default landing tab `/admin`)
  2. `Create Category`
  3. `Create Sub-Category` (Food Type — optional classification)
  4. `Featured Sliders` (Featured Specials banner manager)
  5. `Settings` (Restaurant Profile, Logo, ID, Password, Email)
  6. `Support` (Ticket Submission + 24/7 Live Care Chat)
- **Premium Features (Super Admin Enabled):**
  - `Dashboard` (6 Top metric cards, analytics graphs, live orders table)
  - `Order Manage` (Live order status pipeline: Pending, Preparing, Completed, Cancelled)
  - `Payments` (DGM Payments transaction log: bKash, Nagad, Card, Cash)
- **Configuration Switch:** Stored in `menuStore.js` under `dgm_super_admin_config`. A Super Admin Simulator modal (`setIsSuperAdminModalOpen`) is provided in the sidebar to toggle between Standard and Premium states for live testing.

---

## 2. Resolved Historical Issues & Fixes (DO NOT RE-INTRODUCE)

### Bug 1: White Screen Crash on `/admin` Direct URL Navigation
- **Root Cause 1:** `App.jsx` checked only `window.location.hash === '#admin'` and ignored `window.location.pathname.includes('/admin')`. Navigating directly to `http://localhost:5173/admin` caused the app to attempt rendering the customer menu.
- **Root Cause 2:** Items loaded from Supabase or newly created items without `old_price` threw an unhandled `TypeError: activeFood.oldPrice.toFixed is not a function`.
- **Permanent Fix:**
  - `checkIsAdminRoute()` checks `pathname`, `hash`, and `search`.
  - Added safe numeric fallbacks: `Number(activeFood?.price || 0).toFixed(2)` and `{activeFood?.oldPrice ? ... : null}`.
  - Wrapped root in `ErrorBoundary.jsx` to eliminate blank white screens permanently.

### Bug 2: Body Scroll Lock Across Admin Panel
- **Root Cause:** `body { overflow: hidden }` in `index.css` froze vertical scrolling for desktop and mobile admin screens.
- **Permanent Fix:** Converted to `body { overflow-y: auto }` with independent container scrolling where appropriate.

### Bug 3: Duplicate Category Names in Dropdown
- **Root Cause:** Hardcoded categories were merged repeatedly with Supabase categories.
- **Permanent Fix:** All category lists are de-duplicated via `Array.from(new Set(categories.filter(Boolean)))`.

### Bug 4: Form Input Persistence After Publishing
- **Root Cause:** Form state in `AddFoodWizard` was not reset upon modal close or save.
- **Permanent Fix:** Implemented `resetForm()` hook resetting all inputs on open/save/cancel.

### Bug 5: TDZ ReferenceError: Cannot access 'carouselItems' before initialization
- **Root Cause:** `carouselItems` was referenced inside a `useEffect` hook dependency array (`[isMenuOpen, carouselItems.length]`) before its `const carouselItems = ...` declaration later in the component body.
- **Permanent Fix:** Moved `activeFeaturedSliders` and `carouselItems` `useMemo` declarations to the top of `App.jsx` right after state declarations, guaranteeing they are initialized before any `useEffect` runs.

### Bug 6: ReferenceError: useEffect is not defined in RestaurantPanel.jsx
- **Root Cause:** `useEffect` hook was used to fall back active tab when premium was disabled, but `useEffect` was missing from the React import statement on line 1 of `RestaurantPanel.jsx`.
- **Permanent Fix:** Added `useEffect` to `import React, { useState, useEffect, useMemo } from 'react';` in `RestaurantPanel.jsx`.

### Bug 7: ReferenceError: Star is not defined in RestaurantPanel.jsx
- **Root Cause:** The `Star` component was used for rendering food rating badges in the restored food catalog cards, but `Star` was omitted from the `lucide-react` import statement in `RestaurantPanel.jsx`.
- **Permanent Fix:** Added `Star` to the `lucide-react` import list in `RestaurantPanel.jsx`.

### Bug 8: Duplicate 'All' Button in Category Filter Bar
- **Root Cause:** `'All'` was present in the stored category list and `initialCategories`. When `RestaurantPanel.jsx` mapped `uniqueCategories` while also rendering an explicit 'All' button, two 'All' pills appeared.
- **Permanent Fix:** Excluded `'All'` / `'all'` from `uniqueCategories` and `initialCategories`, treating 'All' exclusively as a filter state rather than a stored category.

### Bug 9: Featured Slider Wizard Retaining Previous Info on New Create
- **Root Cause:** Form state in `FeaturedSliderWizard.jsx` was not resetting on open when creating a new slide, and was pre-selecting the first food item automatically.
- **Permanent Fix:** Supported `editingSlider = null` pattern: new slide opens with empty inputs and placeholder dropdown, while editing loads exact slide data.


---

## 3. UI/UX Design System Guidelines
- **Corners:** Strictly `rounded-[3px]` (3px radius) across all Restaurant Panel panels, inputs, buttons, cards, and modal wizards. Zero sharp 0px or rounded-full AI-signature bubbly shapes.
- **Theme:** Default is **Light Mode** (`#F8FAFC`, `#FFFFFF`, `#E2E8F0` border), with a toggleable **Dark Mode** (`#0B0F19`, `#111827`, `#1E293B` border).
- **Styling:** Developer/SaaS traditional layout, high contrast, clean typography, responsive sidebar with mobile drawer.

---

## 4. Feature Implementations

### 1. Food Items & Publish (Restored to Approved Spec)
- **Layout:** Exactly matches screenshot `media_1793463899260_9734ad19.jpg`:
  - **Universal Digital Menu Engine Banner:** Gradient badge, Live Food Menu Catalog heading, descriptive paragraph, and 2 right-side stats boxes (`TOTAL ITEMS` & `CATEGORIES`).
  - **Controls Row:** Left search input (`Search by food title or category...`) and right category filter pills (`All`, `Main Course`, `Appetizers`, `Beverages`, `Dessert`).
  - **3-Column Prominent Card Grid:**
    - Top framed food image box (`h-48`) with overlaid top-left tag badge (`BEST SELLING`), top-right rating badge (`★ 4.9`), and centered food photo (`max-h-36 max-w-[85%]`).
    - Title & Price header, category & subcategory line, 2-line description snippet, portion & add-on badges (`2 Sizes`, `3 Add-ons`).
    - Footer with `✔ Live on Menu` status toggle button and delete trash icon button.

### 2. Create Sub-Category (Food Type)
- **File:** `src/admin/RestaurantPanel.jsx`
- **Capabilities:**
  - Select parent category (e.g. Main Course, Appetizers, Beverages, Dessert).
  - Define granular food type (e.g. Biryani & Rice, Burgers, Sourdough Pizza, Mocktails).
  - Quick-add suggestion badges, deletion, and catalog dish count tracking.
  - Synchronized directly to Supabase `subcategories` table.

### 3. Featured Sliders Engine (Digital Menu Promo Carousel)
- **Files:** `src/admin/FeaturedSliderWizard.jsx`, `src/admin/RestaurantPanel.jsx`, `src/App.jsx`
- **Capabilities:**
  - Promotional badge input (e.g. CHEF SPECIAL, WEEKEND DEAL, 20% OFF).
  - Main Title and Subtitle inputs.
  - Promo Food Dropdown: Selects dish from menu catalog with automatic price and transparent PNG cutout image pre-filling.
  - Live 2-step wizard: Step 1 = Configure, Step 2 = Exact Digital Menu Hologram Live Preview.
  - Synchronized directly to Supabase `featured_sliders` table.
  - Customer Digital Menu dynamically rotates through active sliders (`featuredSliders.filter(s => s.isActive)`).

### 4. Settings Section & Dynamic Currency Engine
- **File:** `src/admin/RestaurantPanel.jsx`, `src/App.jsx`
- **Capabilities:**
  - Restaurant Name, Tagline, Brand Logo (URL or path with preview).
  - Currency selector (`$`, `৳`, `€`, `£`, `₹`, `AED`).
  - **Dynamic Digital Menu Currency Propagation:** Changing currency in Settings now immediately updates all price tags across the customer 3D Digital Menu, customize modals, cart, and payment checkouts.
  - Table count settings and credentials management.
  - Synchronized directly to Supabase `restaurant_settings` table.

### 5. Universal Editing System Across All Entities
- **Food Items:** Edit button on each catalog card opens `AddFoodWizard` in edit mode with pre-filled portions, add-ons, photos, and preserves ID.
- **Categories:** Inline edit with Save/Cancel triggers updates to all dishes under that category and syncs to Supabase.
- **Sub-Categories:** Inline/modal editor to change Food Type name and parent category.
- **Featured Sliders:** Edit button on slider cards reloads `FeaturedSliderWizard` in edit mode to modify promo food, title, badge, or image.

### 6. Support Section & Real-Time Interactive Live Care
- **File:** `src/admin/RestaurantPanel.jsx`
- **Capabilities:**
  - **Redesigned SaaS UI:** High-contrast layout, 4 status cards (`Total Tickets`, `In Queue`, `Resolved`, `Live Desk Status`), crisp typography and labels.
  - **Priority Tickets:** Form with Priority dropdown (Low, Medium, High, Urgent), category tags, issue message, and case logs with Official Specialist Response cards.
  - **24/7 Live Care Chat:** Real-time chat dialogue. Welcomes owner, allows instant messaging, simulates "Specialist is typing..." state, provides automated technical operation replies, scrolls smoothly, and supports chat clearing.
  - Synchronized directly to Supabase `support_tickets` and `support_chat_messages` tables.

---

## 5. Cloud Database Integration (Supabase)
- **Project:** `Digital Food Menu` (`rsbwehchoovcmaclssuh.supabase.co`)
- **All 10 Tables Active:**
  1. `restaurants`
  2. `categories`
  3. `subcategories`
  4. `food_items`
  5. `featured_sliders`
  6. `restaurant_settings`
  7. `support_tickets`
  8. `support_chat_messages`
  9. `orders`
  10. `payments`
- **Sync Functions in `menuStore.js`:**
  - `syncFoodToSupabase`, `deleteFoodFromSupabase`
  - `syncCategoryToSupabase`, `deleteCategoryFromSupabase`
  - `syncSubcategoryToSupabase`, `deleteSubcategoryFromSupabase`
  - `syncSliderToSupabase`, `deleteSliderFromSupabase`
  - `syncSettingsToSupabase`
  - `syncTicketToSupabase`
  - `syncChatMessageToSupabase`
  - `fetchRemoteData` (queries all 7 core tables in parallel)

---
*Last updated: 2026-11-01*


---

## 6. Polish & Bug Fixes (Batch Update 2026-11-02)

### Item 1: Featured Slider Wizard Dropdown Selection
- **File:** `3d-menu/src/admin/FeaturedSliderWizard.jsx`
- **Fix:** Added `handleFoodSelect` function and stringified food ID values (`value={String(f.id)}`). Selecting any item from the "Select Promo Food Item" dropdown immediately populates Title, Subtitle, Price, and Food Image in both the form and live digital menu preview. Reset form on opening ensures fresh empty state.

### Item 2: Customer 3D Menu Drawer Cleanup
- **File:** `3d-menu/src/App.jsx`
- **Fix:** 
  - Removed manual chevron overlay buttons (`<` and `>`) from the `FEATURED SPECIALS` slider card.
  - Removed `"Swipe or tap to view"` text.
  - Removed `"Select a category or explore featured dishes"` subtitle under `Menu & Specials` title.
  - Maintained smooth 5-second auto-rotation with hover/touch pause.

### Item 3: Dynamic Currency Propagation in Customization Sheet
- **File:** `3d-menu/src/App.jsx`
- **Fix:** Replaced hardcoded `$` in portion final price (`{currency}{portionFinalPrice.toFixed(2)}`) and bottom total settlement row (`{currency}{cardGrandTotal.toFixed(2)}`). Selecting BDT (`৳`) in Restaurant Settings propagates immediately to portions and grand totals.

### Item 4: Edit Food Modal Header & Note Cleanup
- **File:** `3d-menu/src/admin/AddFoodWizard.jsx`
- **Fix:** Removed Bengali placeholder note (`বাস্তব Panel-এ...`) in Step 3. Replaced modal header title with enterprise SaaS chip layout (`Edit Food Item` + title badge chip) with crisp high-contrast typography.

### Item 5: Unified Corner Radius to 5px (`rounded-[5px]`)
- **Files:** `RestaurantPanel.jsx`, `RestaurantLogin.jsx`, `ErrorBoundary.jsx`, `AddFoodWizard.jsx`, `FeaturedSliderWizard.jsx`, `App.jsx`
- **Fix:** Systematically migrated all 113+ occurrences of `rounded-[3px]` to `rounded-[5px]` across cards, buttons, inputs, modals, and tables.

### Item 6: Step 4 Customer Menu Preview Cleanup
- **File:** `3d-menu/src/admin/AddFoodWizard.jsx`
- **Fix:** Removed `View Backend Data` button and JSON debug drawer. Removed `Ready to Publish` badge. Kept the clean realistic food card preview.

### Item 7: Support Ticket History UI Redesign
- **File:** `3d-menu/src/admin/RestaurantPanel.jsx`
- **Fix:** 
  - Increased subject typography to `text-base font-bold` and message text to `text-sm`.
  - Removed cluttering micro-badges (`Resolution SLA: ~15 mins`, `Assigned`).
  - Redesigned Official Support Response into a sleek accent box with a warm orange left border (`border-l-4 border-l-orange-500 bg-orange-50/40 dark:bg-[#0B0F19] p-3.5 rounded-[5px]`).

### Item 8: Featured Specials Slider Engine in Restaurant Panel
- **File:** `3d-menu/src/admin/RestaurantPanel.jsx`
- **Fix:**
  - Upgraded subtitle under `Featured Specials Slider Engine` to `text-sm text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-2xl mt-1`.
  - Upgraded banner card gradient to luxury dark hologram background (`bg-gradient-to-r from-[#151a26] via-[#10141e] to-[#0a0d13] text-white border-b border-slate-800`), eliminating washed-out pink in light mode.
  - Linked price display to dynamic `{currency}`.
  - Upgraded food photo thumbnail container with smooth drop-shadow scaling.

### Item 9: Design System Contract (`design.md`)
- Created `f:\Project Digital Menu\design.md` detailing every design token, typography standard, color code, corner radius standard (`5px`), and view component specification. Serves as the immutable UI/UX contract for all future development.

---
*Last verified & build passed: 2026-11-02*


---

## 7. Featured Slider Cloud Fix, Sidebar Minimize & Top Bar Redesign (2026-11-02)

### Bug 10: Featured Slider Creation Failed to Save in Supabase Table & Frontend
- **Root Cause:** In Supabase `featured_sliders` table, `display_order` was defined as Postgres `integer` (4-byte signed, max 2,147,483,647). `FeaturedSliderWizard` was passing `Date.now()` (1,793,561,104,894) which caused a silent Postgres error `22003: value out of range for type integer`. Consequently, no row was inserted into Supabase, and when the customer menu mounted, `fetchRemoteData()` refreshed from Supabase, reverting to only the 2 pre-existing sliders.
- **Fix:**
  - Ran migration `ALTER TABLE featured_sliders ALTER COLUMN display_order TYPE BIGINT;` and for `subcategories` table as well.
  - Updated `syncSliderToSupabase` in `menuStore.js` to log errors with `console.error` and properly cast `display_order`.
  - Tested upsert with live node script; insertion succeeded.
  - Cleaned up duplicate dead code block at end of `App.jsx`.

### Feature: Featured Slider Cover Image / Realistic Menu Card Preview
- **File:** `3d-menu/src/admin/RestaurantPanel.jsx`
- **Fix:** Replaced the generic gradient banner inside `activeTab === 'sliders'` with the exact luxury 3D Digital Menu promotional card layout shown in the user's reference image (`media_1793559304460_94923576.png`):
  - Warm ambient glow on the left (`from-orange-600/25`).
  - Dark luxury gradient (`bg-gradient-to-r from-[#220b05] via-[#140602] to-[#0a0d13]`).
  - Promotional badge chip (`bg-orange-950/80 border-orange-500/50`).
  - Bold dish title and 2-line subtitle.
  - Price linked with active `{currency}`.
  - Floating food image with deep drop shadow (`max-h-28 drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]`).

### UI/UX Fix: Professional Dropdown Arrow Spacing
- **Files:** `RestaurantPanel.jsx`, `AddFoodWizard.jsx`, `FeaturedSliderWizard.jsx`
- **Fix:** Systematically wrapped all `<select>` elements in `<div className="relative">`, added `appearance-none pl-3.5 pr-10 py-2.5`, and placed `<ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />`. This removes OS-level cramped arrow marks and guarantees professional right-padding and alignment across all devices.

### UI/UX Feature: Sidebar Minimize (Right-to-Left) & Upgraded Typography
- **File:** `3d-menu/src/admin/RestaurantPanel.jsx`
- **Fix:**
  - Added `isSidebarCollapsed` state. Clicking the collapse button smoothly transitions sidebar from `w-64` to `w-20` (right to left).
  - When collapsed: labels hide, and only icons render centered with native hover tooltip (`title`).
  - Increased navigation section typography from `text-xs` to `text-sm font-semibold tracking-wide`.
  - Increased navigation icons from `w-4 h-4` to `w-5 h-5 shrink-0` to match font scale cleanly.

### UI/UX Feature: Top Bar Redesign with Live Clock & Device Timezone
- **File:** `3d-menu/src/admin/RestaurantPanel.jsx`
- **Fix:**
  - Re-engineered header into a clean, solid enterprise header (not low-class, not AI-slop).
  - Added desktop collapse toggle button next to breadcrumbs (`RESTAURANT PORTAL / [Section]`).
  - Added real-time native clock updating every second (`currentTime`, `currentDate`).
  - Added native device timezone detection via `Intl.DateTimeFormat().resolvedOptions().timeZone` with a location sync button.
  - Added toast notification handling user GPS permission alerts.


---

## 8. Customer 3D Digital Menu Refinement (2026-11-02 Part 3)

### Polish Item 1: Drawer Scrollbar Line Removal & 8s Animated Popup Hint
- **File:** `3d-menu/src/App.jsx`
- **Changes:**
  - Added `scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden` to `Menu & Specials` drawer container to eliminate native scrollbar lines.
  - Linked `menuScrollContainerRef` to the scroll container.
  - Restored animated popup scroll down indicator (`Scroll for more` + `ChevronDown`) pulsing every 8 seconds if scrollable content exists. Clicking it smoothly scrolls 200px down.
  - Removed dot pagination from under the `Featured Specials` carousel.

### Polish Item 2: Header Table Number Removal & Bottom Card Badge/Review Polish
- **File:** `3d-menu/src/App.jsx`
- **Changes:**
  - Removed `• Table 04` from the top header next to restaurant name.
  - Redesigned top line of bottom compact food card with proper margin/padding:
    - Promotional Tag Badge (`px-2.5 py-1 text-xs font-extrabold uppercase`).
    - Review & Rating Badge with star icon, rating (`4.9`), and reviews count.
    - Right-aligned `OPEN ^` pill button with comfortable padding and bounce indicator.


---

## 9. Food Info Card Redesign (User Requested Layout - 2026-11-02 Part 4)
- **File:** `3d-menu/src/App.jsx`
- **Changes:**
  - Removed all `Best Selling` promotional badges and `Star Rating` reviews from the compact food info card.
  - Positioned `Open ^` button at the top right.
  - Positioned Price (`{currency}{price}` + oldPrice strike-through) right below the `Open` button on the right side.
  - Positioned Food Name (`activeFood.title`) cleanly at the bottom across full available width with high contrast typography.
- **Verification:** Production build passed cleanly without errors.

---

## 10. Hallmark-Crafted Food Card Redesign (2026-11-02 Part 5)
- **File:** `3d-menu/src/App.jsx`
- **Design Methodology:** Applied Hallmark Design System principles (Rule 2, 6, 9, 10, Craft 1, 2, 3, 5).
- **Preserved:** Full brand color profile (`dark slate`, `orange-400`, `amber`), authentic glassmorphism (`hologram-glass`, 20px blur, hairline 1px border, inset light highlight).
- **Improvements:**
  - Resolved the uneven layout and empty dark space from the previous arrangement.
  - **Left Side:** Food title (`activeFood.title`) in bold, crisp white typography with subtle, clean category subtitle (`activeFood.category`).
  - **Right Side:** Tabular numeral pricing (`tabular-nums`) with strike-through original price, paired with an elegant, tactile glass pill affordance (`Open` + `ChevronUp`).
  - **Interaction & Polish:** Replaced raw text bouncing with smooth micro-interaction (`duration-200`, `hover:-translate-y-0.5`).
  - **Accessibility:** Added `role="button"`, `tabIndex={0}`, keyboard Enter/Space activation, and focus ring.
- **Verification:**
  - `npm run build` in `3d-menu`: ✓ built in 1.37s.
  - Dev server HTTP 200 OK on `http://localhost:5173`.

---

## 11. 3D Image Engine & Food Item In-Place Edit Fix (2026-11-02 Part 6)
- **Files Modified:** `3d-menu/src/admin/AddFoodWizard.jsx`, `3d-menu/src/App.jsx`
- **Fix 1: In-Place Food Update Fix (No Duplicates):**
  - In `AddFoodWizard.jsx`, fixed `handleFinalSave` so that `id: editingFood ? editingFood.id : Date.now()` is preserved along with existing metadata.
  - Updating a published food item now properly updates the item in-place in both local storage and Supabase without creating duplicates.
- **Fix 2: 3D Image Aspect Ratio & Dynamic Zoom Engine:**
  - Diagnosed why `fr001` (1484x1086, 1.36:1) looked huge while `fr002` (1672x941, 1.77:1) looked small: 16:9 widescreen images with cutlery hitting container boundaries leaves large top/bottom transparent gaps.
  - Expanded 3D base stage from 288px to 320px-384px (`w-80 h-80 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px]`).
  - Added dynamic zoom compensation in `App.jsx` (`imageAspectScale`), boosting wide aspect ratio images by up to 1.30x so dishes always look zoomed, bold, and captivating.
  - Added HTML5 Canvas Auto-Trimming Engine in `AddFoodWizard.jsx` to strip unnecessary transparent margins on upload.
  - Added professional Recommended 3D Resolution & Guidelines box in `AddFoodWizard.jsx`:
    - Recommended: `1200 × 1200 px` (1:1 Square) — Minimum `1000 × 1000 px`.
    - Format: Transparent PNG with 85-90% dish framing.
- **Verification:**
  - `npm run build`: ✓ built in 5.02s.
  - Local dev server running on port 5173 (HTTP 200).

---

## 12. AddFoodWizard Missing Import Fix (2026-11-02 Part 7)
- **File:** `3d-menu/src/admin/AddFoodWizard.jsx`
- **Fix:** Added `Sparkles` to the `lucide-react` import list at the top of the file.
- **Verification:**
  - Production build passed in 1.42s without errors.
  - Verified all 10 JSX icons used inside `AddFoodWizard.jsx` are fully imported.

---

## 13. Discount System, Featured Special Category Isolation Engine & Supabase Sync (2026-11-02 Part 8)
- **Files Modified:**
  - `3d-menu/src/admin/AddFoodWizard.jsx`
  - `3d-menu/src/admin/FeaturedSliderWizard.jsx`
  - `3d-menu/src/App.jsx`
  - Supabase Database: `food_items` table
- **Feature 1: Dual Discount Pricing System in AddFoodWizard (`AddFoodWizard.jsx`):**
  - Integrated Regular Price (MRP) and Discount Price configuration in Step 2 ("Set Food Size & Price").
  - Implemented 3 discount modes:
    1. `No Discount`: Selling price equals regular MRP.
    2. `Percent (%)`: Instant percentage deduction with quick presets (10%, 15%, 20%, 25%, 30%, 50%).
    3. `Flat (৳/$)`: Fixed currency deduction.
  - Live automatic calculations: Displays final selling price and live savings badge (`SAVE ৳XX.XX (MRP ৳YY.YY)`).
  - Bidirectional editing: Editing selling price automatically back-calculates discount percentage/flat amount.
  - Correct mapping on final save: `oldPrice` (MRP) and `price` (selling price) properly stored in state, local storage, and Supabase.
- **Feature 2: Featured Specials Category Isolation & Promo Pricing Engine (`App.jsx`):**
  - Computed `activeFeaturedFoodIds`: Set of food IDs associated with currently active sliders (`s.isActive !== false`).
  - Computed `regularCategoryFoods`: Food items in `foodsList` that are NOT in `activeFeaturedFoodIds`.
  - Category isolation: Any dish selected for an active Featured Special is isolated from regular categories (will not appear in Category dish lists or drawer counts).
  - Promo-boosted home view: When clicking a Featured Special banner in the drawer/carousel (`selectOfferFromCarousel`), the dish is launched on the 3D home screen with its promo price (`offer.price`), old price, and promotional badge (`offer.badge`).
  - Seamless navigation: Clicking Next/Previous or picking another category clears `selectedFeaturedDish` and resumes navigation through `regularCategoryFoods`.
  - Automatic de-isolation: When the slider is deleted or marked inactive in the admin panel, the item leaves `activeFeaturedFoodIds` and automatically re-appears in its assigned category without database alterations.
- **Feature 3: FeaturedSliderWizard Quick Promo Discount & Currency Fix (`FeaturedSliderWizard.jsx`):**
  - Replaced hardcoded `$` with dynamic `{currency}` in labels and preview.
  - Added quick discount percentage buttons (10%, 15%, 20%, 25%, 30%, 50%) when a food item is picked, instantly computing promo price and setting the badge to e.g. `20% OFF`.
- **Feature 4: Supabase 8 Food Items Store & Auto-Sync Engine:**
  - Verified and stored all 8 food items in Supabase table `food_items`:
    1. Double Flame Cheeseburger (Main Course)
    2. Artisan Wood-Fired Pizza (Main Course)
    3. Korean Gochujang Crisp Chicken (Appetizers)
    4. Iced Caramel Macchiato (Beverages)
    5. Royal Pistachio Kunafa (Dessert)
    6. Kacchi (Main Course)
    7. KACCHI BIRYANI (Beverages)
    8. Ice-Cream (Beverages)
  - In `App.jsx`, added auto-sync on mount: if the client browser has uncommitted local items, they are pushed to Supabase via `syncFoodToSupabase(f)`.
- **Verification:**
  - `npm run build` completed with 0 errors.
  - Local dev server responsive on `http://localhost:5173`.
  - Supabase `food_items` verified with 8 items.

---

## 14. Portion-Level MRP & Discount Engine + Frontend Selected Portion Price Sync (2026-11-02 Part 9)
- **Files Modified:**
  - `3d-menu/src/admin/AddFoodWizard.jsx`
  - `3d-menu/src/App.jsx`
- **Feature 1: Hallmark-Crafted Portion Pricing & Discounts in AddFoodWizard (`AddFoodWizard.jsx`):**
  - Resolved issue where selecting "Does this food have different sizes?" hid the discount engine.
  - Each portion variant now includes full independent pricing controls:
    1. `Portion Name` (e.g. Half, Full, 10-inch, Family).
    2. `Regular Price (MRP) ({currency})`.
    3. `Portion Discount / Promotion`: 3-way toggle (`No Discount` | `Percent (%)` | `Flat ({currency})`).
    4. When discount is active: Discount input with quick chips (`10%`, `15%`, `20%`, `25%`, `30%`, `50%`), selling price input (emerald), and live savings badge (`SAVE ৳XX (MRP ৳YY)`).
  - **Bulk Quick Discount Toolbar:** Added a top bar allowing one-click application of 10%, 15%, 20%, 25%, 30%, or Reset across all portion sizes simultaneously, while still allowing fine-tuning of each portion individually.
  - **Data Persistence:** On save, each portion is saved with `{ name, price, oldPrice, extra }`, and the food item's base price and old price are mapped from Portion 1 (the default 3D portion).
- **Feature 2: Dynamic Home Screen Price Sync with Selected Portion (`App.jsx`):**
  - On the 3D customer home screen, the food card initially shows the 1st portion's price and discount (default).
  - When the customer clicks "Open" and selects another portion (e.g. from "Half" to "Full") in the "Menu Item Details & Customization Modal", closing the modal preserves the selected portion.
  - The home screen bottom card immediately updates:
    1. Shows selected portion name (`currentPortion.name`).
    2. Displays the selected portion's selling price (`currentPortionPrice`).
    3. Displays the selected portion's strike-through regular price (`currentPortionOldPrice`) and updates the top promo tag badge (`portionDiscountPercent% OFF`).
    4. Simultaneously updates the bottom action bar's `Total Amount` box.
  - Switching dishes (Next / Previous / Category click) cleanly resets `selectedPortion` to 0 for the newly viewed dish.
- **Verification:**
  - `npm run build` compiled in 3.90s with zero errors.
  - Local dev server responsive on `http://localhost:5173`.

---

## 15. Frontend Bottom Card Label Clean & Update Food Item Save Fix (2026-11-02 Part 10)
- **Files Modified:**
  - `3d-menu/src/App.jsx`
  - `3d-menu/src/admin/AddFoodWizard.jsx`
- **Fix 1: Frontend Bottom Food Info Card Layout (`App.jsx`):**
  - Removed portion title/name (e.g. `10 Pcs Party Box` / `Half` / `Full`) from the bottom food card next to the price.
  - Left column displays exclusively the food item's title (e.g. `Korean Gochujang Crisp Chicken`), preventing text truncation.
  - Right column displays only the dynamic numeric price and strike-through discount price alongside the tactile `Open` pill.
- **Fix 2: AddFoodWizard Step 4 Update Button Hang (`AddFoodWizard.jsx`):**
  - Root cause: In `handleFinalSave`, `baseOldPriceNum` was calculated but mapped to undeclared identifier `oldPrice: oldPriceNum`, throwing an unhandled `ReferenceError` that prevented `onSave`, `resetForm`, and `onClose` from firing.
  - Fix: Updated to `oldPrice: baseOldPriceNum` and wrapped the save handler in a safe `try...catch` block.
- **Verification:**
  - `npm run build` completed cleanly in 3.72s.
  - Dev server responsive on `http://localhost:5173`.

---

## 16. Featured Specials Carousel Unfreeze, Modal Portion Promo Sync & Navigation New Tab (2026-11-03 Part 1)
- **Files Modified:**
  - `3d-menu/src/App.jsx`
  - `3d-menu/src/admin/RestaurantPanel.jsx`
- **Fix 1: Featured Specials Carousel Freeze Fix (`App.jsx`):**
  - Root cause: When clicking an offer from the carousel, the drawer closed while the pointer was over the card, preventing `onMouseLeave` from triggering. `isCarouselHovered` remained permanently `true`, causing the timer `if (!isMenuOpen || isCarouselHovered) return` to exit early upon reopening the drawer.
  - Fix: Added `setIsCarouselHovered(false)` to `selectOfferFromCarousel`, added `onTouchEnd={() => setIsCarouselHovered(false)}`, and added an effect on `isMenuOpen` resetting `isCarouselHovered(false)` whenever the drawer opens or closes.
- **Fix 2: Featured Slider Promo Price Applied to Portions Modal (`App.jsx`):**
  - In `selectOfferFromCarousel`, when a promotional price is configured on a featured slider, `promoCustomizable.portions` is now deeply updated:
    - Portion 1 (base portion) directly receives the exact promotional price.
    - Subsequent portions receive the proportional promotional discount ratio.
    - `oldPrice` (MRP) is preserved for strike-through display.
    - `setSelectedPortion(0)` is invoked so the customization modal opens on Portion 1 by default with the promotional price.
- **Fix 3: Navigation Menu "Open in New Tab" Support (`RestaurantPanel.jsx`):**
  - Replaced `<button>` with `<a href="/admin?tab=${item.id}">`.
  - Added `getInitialActiveTab()` to parse `?tab=...` search parameter or hash from window location.
  - Added URL synchronization via `pushState` and `popstate` listener.
  - Standard left-click performs fast client-side tab switching with `e.preventDefault()`, while right-click context menu enables native "Open link in new tab", "Open in new window", and Ctrl/Cmd-click navigation.
- **Verification:**
  - `npm run build` compiled in 3.45s with zero errors.
  - Local dev server responsive on `http://localhost:5173`.

---

## 17. Cloud-First Supabase Data Authority, Unpublished Items Gating & Deletion Persistence (2026-11-03 Part 2)
- **Files Modified:**
  - `3d-menu/src/App.jsx`
  - `3d-menu/src/data/menuStore.js`
- **Issue 1: Unpublished Food Items Leaking into Frontend:**
  - Root cause: The 3D customer menu derived dishes directly from `foodsList`, ignoring the item's publication status (`is_published: false` or `status: 'unpublished'`).
  - Fix: Created `publishedFoods` filter in `App.jsx`:
    ```javascript
    const publishedFoods = useMemo(() => {
      return foodsList.filter(f => f.is_published !== false && f.status !== 'unpublished' && f.status !== 'draft');
    }, [foodsList]);
    ```
  - Derived `regularCategoryFoods`, `filteredFoods`, `activeFood`, and `carouselItems` exclusively from `publishedFoods`.
  - The admin panel (`RestaurantPanel.jsx`) continues to receive full `foodsList`, allowing restaurant owners to manage and toggle unpublished items back on.
- **Issue 2: Deleted Food Items Resurrecting on Refresh:**
  - Root cause: On mount, `App.jsx` compared `localStorage` items against Supabase and ran `uncommittedLocal.forEach(f => syncFoodToSupabase(f))`. Any item deleted locally or not present in Supabase was misidentified as "uncommitted" and re-inserted into Supabase.
  - Fix: Made remote Supabase data the authoritative single source of truth on mount:
    ```javascript
    if (remoteFoods && remoteFoods.length > 0) {
      setFoodsList(remoteFoods);
      saveStoredFoods(remoteFoods);
    }
    ```
  - Removed dead mock catalog `const allFoods = [...]` from `App.jsx`.
  - Harmonized string-based ID handling across `deleteFoodFromSupabase` (`eq('id', String(foodId))`), `syncFoodToSupabase`, `handleDeleteFoodFromPanel`, and `handleToggleFoodStatus`.
- **Verification:**
  - Supabase `food_items` verified: 9 total items (8 published, 1 unpublished `Kacchi`).
  - `npm run build` compiled cleanly in 4.69s.
  - Dev server running on `http://localhost:5173`. Unpublished items never show on customer menu. Deleted items stay permanently deleted.

---

## 18. Restaurant Settings: VAT & Service Charge Management (2026-11-03 Part 3)
- **Files Modified:**
  - `3d-menu/src/admin/RestaurantPanel.jsx`
  - `3d-menu/src/App.jsx`
  - `3d-menu/src/data/menuStore.js`
- **Feature Overview:**
  - Designed and implemented a dedicated **Taxes & Service Charges (ভ্যাট ও সার্ভিস চার্জ কনফিগারেশন)** card in the restaurant panel's Settings tab (`/admin?tab=settings`).
  - Employs Hallmark design principles: 5px corner radius token (`rounded-[5px]`), high craft typography, segmented charge method switches (`Percentage (%)` vs `Flat Amount (৳)`), active/disabled status badges, and real-time interactive calculation simulator.
  - **VAT Configuration:**
    - Active / Disabled toggle.
    - System choice: Percentage (%) vs Flat Amount (৳).
    - Rate/Amount input with dynamic currency symbol.
  - **Service Charge Configuration:**
    - Active / Disabled toggle.
    - System choice: Percentage (%) vs Flat Amount (৳).
    - Rate/Amount input with dynamic currency symbol.
  - **Real-time Live Digital Menu Simulation:**
    - Directly inside the settings card, a live bill simulator calculates subtotal, VAT, service charge, and estimated total on a sample ৳500.00 dish order before saving.
  - **Customer 3D Menu Propagation:**
    - `cardVat`, `cardServiceFee`, and `cardGrandTotal` in `App.jsx` calculate dynamically based on the restaurant's active VAT and service charge rules.
    - Customization sheet (`Live Price Summary`) displays dynamic labels: `VAT (5%)` or `VAT (Flat ৳15.00)`, and `Table Service Charge (10%)` or `Table Service Charge (৳2.00)`.
    - Bottom action bar (`TOTAL AMOUNT`) and Cart drawer summary accurately reflect the real-time calculated total.
  - **Database Persistence:**
    - Added columns to Supabase `restaurant_settings`: `vat_enabled`, `vat_type`, `vat_rate`, `service_charge_enabled`, `service_charge_type`, `service_charge_rate`.
    - Saves to both `localStorage` and Supabase cloud database upon clicking "Save Restaurant Settings".
- **Verification:**
  - `npm run build` compiled cleanly in 9.91s with zero errors.
  - Local dev server responsive on `http://localhost:5173`.

---

## 19. Typography Scale Calibration, Local Logo Upload & Customization Modal Scroll Indicator (2026-11-03 Part 4)
- **Files Modified:**
  - `3d-menu/src/admin/RestaurantPanel.jsx`
  - `3d-menu/src/App.jsx`
  - `3d-menu/src/index.css`
- **Fix 1: Typography Hierarchy Calibration & English Cleanliness (`RestaurantPanel.jsx`):**
  - Removed all Bengali text from the Taxes & Service Charges card (removed header Bangla, `(ভ্যাট)`, `(সার্ভিস চার্জ)`, `(চার্জের পদ্ধতি)`, and simulator Bangla).
  - Increased font sizes of all secondary subtitles, calculation helper copy, rate preview badges, and simulation breakdown boxes (~2x increase from `text-[10px]` / `text-[11px]` to `text-xs sm:text-[13px]`).
  - Adjusted input field titles to `text-xs sm:text-sm font-semibold` and inputs to `text-sm sm:text-base font-semibold`, preserving Hallmark typographic balance so helper copy never overpowers titles.
- **Fix 2: Local Disk PNG/Image Upload for Restaurant Logo (`RestaurantPanel.jsx`):**
  - Upgraded the Restaurant Logo field in the Identity Card into a dual-mode component:
    - Dedicated "Upload from Device" button with HTML5 file input supporting PNG, JPG, WebP, and SVG images.
    - `FileReader` converts chosen local image into a Base64 data URL with instant live thumbnail preview and a one-click "Remove Logo" button.
    - Also retains direct URL / image path text input for flexibility.
- **Fix 3: Customization Modal Scrollbar Removal & Scroll Down Indicator (`App.jsx`, `index.css`):**
  - Added `.no-scrollbar` utility class in `index.css` to completely hide the vertical scrollbar line on the right side of the Customization & Details modal while preserving smooth touch and mouse-wheel scrolling.
  - Added periodic animated scroll-down popup indicator (`showDetailScrollHint`), pulsing every 8 seconds when content exceeds container height, matching the 'Menu & Specials' drawer indicator.
- **Verification:**
  - `npm run build` compiled in 8.35s / 19.87s with 0 errors.
  - Local dev server responsive on `http://localhost:5173`.

---

## 20. Settings Page Hallmark Typography Scaling & Logo Engine Propagation (2026-11-03 Part 5)
- **Files Modified:**
  - `3d-menu/src/admin/RestaurantPanel.jsx`
  - `3d-menu/src/App.jsx`
- **Fix 1: Full Settings Typography Scaling & Hallmark Calibration (`RestaurantPanel.jsx`):**
  - Applied proportional typography scaling across `Restaurant Identity & Profile` (Card 1) and `Access Credentials & Owner Contact` (Card 3), matching the calibrated typography in `Taxes & Service Charges` (Card 2).
  - Main headers scaled to `text-base sm:text-lg font-bold`, descriptive leads to `text-sm sm:text-[14px] leading-relaxed`, field labels to `text-xs sm:text-sm font-semibold`, and inputs to `text-sm sm:text-base font-semibold`.
  - Added dedicated Hallmark specifications banner for Restaurant Brand Logo:
    - **Format:** Transparent PNG or SVG (avoids ugly white boxes on dark hologram background).
    - **Aspect Ratio:** 1:1 Square (or circular emblem).
    - **Resolution:** 512 × 512 px (Retina HD).
    - **Safe Margin:** 10%–15% internal padding so artwork never clips.
    - **File Size:** Under 2MB.
- **Fix 2: Digital Menu Header & Drawer Logo Propagation (`App.jsx`):**
  - Customer 3D menu header now renders `restaurantProfile.logo` in the top left brand badge with `object-contain drop-shadow-md` and graceful fallback to `<Utensils />`.
  - 'Menu & Specials' drawer header now renders `restaurantProfile.logo` seamlessly.
- **Verification:**
  - `npm run build` compiled in 5.85s with 0 errors.
  - Local dev server responsive on `http://localhost:5173`.

---

## 21. Menu Drawer Layout Calibration: Logo Refinement & Featured Specials Upward Expansion (2026-11-08)
- **Files Modified:**
  - `3d-menu/src/App.jsx`
- **Fix 1: Logo Size Refinement with Preserved Typography:**
  - Reduced the restaurant logo container in the Menu Modal header from `w-18 h-18 sm:w-20 sm:h-20` (approx 72–80px) to `w-12 h-12 sm:w-14 sm:h-14` with `rounded-xl` and `object-contain`.
  - Header padding tightened from `pb-4` to `pb-3`.
  - Strictly preserved `Menu & Specials` text font size (`text-xl sm:text-2xl font-black`) unchanged.
- **Fix 2: Featured Specials Slider Height Increase (Upward Expansion):**
  - Expanded slider height professionally from `min-h-[130px]` to `min-h-[160px] sm:min-h-[170px]`.
  - Dish image size expanded to `w-24 h-24 sm:w-28 sm:h-28`.
  - Reduced top spacing (`pt-2.5` on the scroll container and `mb-1.5` on the title) so the slider expands strictly upward towards the logo/header area.
- **Fix 3: Browse Categories Position Preservation:**
  - The vertical offset of `Browse Categories` remains exactly where it was previously, preventing it from being pushed down into the fold.
- **Verification:**
  - `npm run build` compiled cleanly in 2.69s with 0 errors.

---

## 22. Menu Modal Bottom Action Clean-up & Logo Scaling Expansion (2026-11-08 Part 2)
- **Files Modified:**
  - `3d-menu/src/App.jsx`
- **Fix 1: Removal of Bottom 'Close & Return to 3D View' Button:**
  - Completely removed the redundant bottom action bar (`Close & Return to 3D View`), freeing up ~65px of vertical screen real estate.
  - Users close the modal via the top-right modern close button `(X)` or by tapping outside the sheet.
  - Adjusted `showScrollHint` indicator position from `bottom-18` to `bottom-5`.
- **Fix 2: Downward Expansion of Browse Categories:**
  - Utilized the newly freed bottom space to let `Browse Categories` comfortably expand downwards without vertical constraints.
  - Extended scroll container bottom padding (`pb-6`) and row spacing (`space-y-5`).
- **Fix 3: Logo Size Increase & Featured Specials Height Safeguard:**
  - Re-increased the restaurant brand logo size in the header to prominent `w-16 h-16 sm:w-18 sm:h-18 rounded-2xl` with refined border and glow.
  - Guaranteed `Featured Specials` slider height is preserved and maintained at `min-h-[165px] sm:min-h-[175px]` without any reduction.
- **Verification:**
  - `npm run build` compiled in 2.17s with 0 errors.

---

## 23. Customization Modal Symmetric Spacing & Bottom Divider Alignment (2026-11-08 Part 3)
- **Files Modified:**
  - `3d-menu/src/App.jsx`
- **Fix 1: Symmetric Reserved Spacing Calibration:**
  - Calibrated the reserved spacing directly above the food name in the header (`pb-2` on handle row + `pt-2.5` on title block = 18px).
  - Aligned the space directly above the 'Item Total Amount' divider line (`border-t border-white/10`) to match with exact `pb-[18px] sm:pb-5`.
  - Replaced rigid fixed `h-[78vh]` with adaptive `max-h-[82vh]` and `min-h-0`, eliminating awkward empty voids when food items have few portions/addons while preserving smooth scroll when options exceed the view.
- **Verification:**
  - `npm run build` compiled cleanly in 1.95s with 0 errors.

---

## 24. Customization Modal flex-1 Elimination & Supabase 500 Deadlock Fix (2026-11-08 Part 4)
- **Files Modified:**
  - `3d-menu/src/App.jsx`
  - `3d-menu/src/data/menuStore.js`
- **Fix 1: Removal of flex-1 from detailScrollContainerRef:**
  - **Root Cause:** In CSS flexbox, applying `flex-1` (`flex-grow: 1`) on the scroll container inside `max-h-[82vh]` forced the browser to stretch the content container to the maximum 82vh height, leaving an uncontrolled 40px+ empty void between the last option card and the divider line.
  - **Solution:** Removed `flex-1` and retained `overflow-y-auto min-h-0 pt-3 pb-[18px] sm:pb-5`. The sheet now cleanly hugs the content, positioning the divider line exactly 18px below the last option (symmetrical with the 18px reserved space above the food name), while preserving scrolling if content exceeds 82vh.
- **Fix 2: Supabase 500 Internal Server Error & Postgres Lock Contention Fix:**
  - **Root Cause:** 
    1. During mount, `fetchRemoteData` fetched `remoteSettings` and immediately invoked `saveRestaurantProfile(remoteSettings)` which triggered `syncSettingsToSupabase`, writing back data that was just fetched.
    2. Multiple devices/tabs triggered concurrent `POST /restaurant_settings` and `PATCH /restaurants`.
    3. The foreign key constraint between `restaurant_settings` and `restaurants` created a Postgres transaction ShareLock vs ExclusiveLock deadlock.
    4. Concurrent read queries (`food_items`, `featured_sliders`) queued up and hit PostgREST's statement timeout, failing with 500.
  - **Solution:**
    1. Added `saveStoredRestaurantProfile` for pure local caching without triggering cloud writes during remote data fetch.
    2. Removed duplicate `syncSettingsToSupabase` call in `handleSaveRestaurantProfile`.
    3. Added mutex locking and queueing (`isSyncingSettings`, `pendingProfileSync`) in `syncSettingsToSupabase`, ensuring only 1 sync executes at a time and updates `restaurants` before `restaurant_settings` to eliminate deadlocks.
    4. Wrapped all cloud fetches in `safeQuery` with error handling to prevent cascading failures.
- **Verification:**
  - `npm run build` compiled cleanly in 3.59s with 0 errors.

---

## 25. Customization Modal Height Expansion & Guaranteed 18px Free Space (2026-11-08 Part 5)
- **Files Modified:**
  - `3d-menu/src/App.jsx`
- **Fix:**
  - Expanded total Customization Modal sheet height to `h-[88vh] sm:h-[86vh] max-h-[92vh]`, providing ample vertical space so all food details, category badges, portions, and addons fit without being crammed or clipped against the divider line.
  - Inserted an explicit `<div className="h-[18px] shrink-0" aria-hidden="true" />` spacer directly below the last addon selection box, strictly guaranteeing 18px of free space before the `border-t border-white/10` divider line.
  - Positioned the bottom action bar (`Item Total amount` & `ADD TO LIST` button) cleanly below the divider line with `pt-3.5 pb-2`.
- **Verification:**
  - `npm run build` compiled cleanly in 1.75s with 0 errors.

---

## 26. Customization Modal Header Title Lift & Badge Spacing (2026-11-08 Part 6)
- **Files Modified:**
  - `3d-menu/src/App.jsx`
- **Fix:**
  - Lifted the food item title (`activeFood.title`) slightly higher up towards the top of the header (`pt-1 sm:pt-1.5`).
  - Increased the vertical gap between the item name and the promotional badge/rating row from `mb-2` (8px) to `mb-3 sm:mb-3.5` (12px–14px), providing clear visual breathing room between the title and badge.
- **Verification:**
  - `npm run build` compiled cleanly in 1.90s with 0 errors.


---

## 27. Supabase 500 Internal Server Error & Statement Timeout Permanent Fix (2026-11-08 Part 7)
- **Problem & Console Errors:**
  - `GET https://rsbwehchoovcmaclssuh.supabase.co/rest/v1/food_items?select=* 500 (Internal Server Error)`
  - `Supabase query warning: canceling statement due to statement timeout (menuStore.js:411)`
  - `GET .../featured_sliders?select=*&order=display_order.asc 500`
  - `POST .../restaurant_settings?column=... 500`
- **Root Cause Analysis:**
  1. **Low Postgres `statement_timeout`:** Postgres had default role timeout `statement_timeout = '3s'` on `anon` role and `8s` on `authenticator`.
  2. **Massive Database Bloat via Uncompressed Base64 Images:**
     - `food_items` rows contained multi-megabyte base64 strings directly in the `image` column:
       - `KACCHI BIRYANI` (id `1793622271272`): 3,235,482 bytes (~3.2 MB)
       - `Coffee` (id `1793636922659`): 2,647,486 bytes (~2.6 MB)
       - `ICE CREAM` (id `1793463555418`): 2,703,854 bytes (~2.7 MB)
       - Total table payload was **8.20 MB** for just 8 rows!
     - `featured_sliders` also duplicated the 2.7 MB base64 string for `ICE CREAM`.
     - `restaurants` and `restaurant_settings` had a 1.55 MB base64 string for the brand logo.
     - When the client loaded, fetching `food_items`, `featured_sliders`, and `restaurant_settings` in parallel requested ~14 MB of JSON. PostgREST exceeded the 3000ms timeout threshold, causing Postgres to throw error `57014 (canceling statement due to statement timeout)` -> HTTP 500.
  3. **No Client-Side Image Constraint on Upload:**
     - In `AddFoodWizard.jsx` and `RestaurantPanel.jsx`, uploaded images were read via raw `FileReader.readAsDataURL()` and written directly to Supabase without dimension downscaling or compression.
- **Permanent Solution Implemented:**
  1. **Increased Postgres Role Statement Timeouts:**
     - Executed via Supabase SQL:
       `ALTER ROLE anon SET statement_timeout = '20s';`
       `ALTER ROLE authenticated SET statement_timeout = '20s';`
       `ALTER ROLE authenticator SET statement_timeout = '20s';`
  2. **Optimized Database Records in Supabase:**
     - Updated `food_items` rows to use clean asset paths (`/src/assets/kacchi_biryani.png`, `/src/assets/coffee.png`, `/src/assets/ice_cream.png`). Payload dropped from **8.2 MB to 6.3 KB** (99.92% reduction).
     - Updated `featured_sliders` for `slide_1793562335677` (`ICE CREAM`) to `/src/assets/ice_cream.png`.
     - Extracted restaurant logo to `public/monkey_bhai_logo.png` and updated `restaurants` and `restaurant_settings` `logo` column to `/monkey_bhai_logo.png`.
  3. **Client-Side Image Compression Pipeline:**
     - Created `3d-menu/src/lib/imageCompressor.js`: auto-scales uploads to max 800×800 (food) or 400×400 (logos), preserving transparency and compressing via canvas to <100 KB WebP/PNG.
     - Integrated `compressImage` into `AddFoodWizard.jsx` (photo upload & transparent border auto-trim) and `RestaurantPanel.jsx` (brand logo upload).
  4. **Robust Asset Resolution & Supabase Sync Safeguards (`menuStore.js`):**
     - Added `resolveFoodImage`: guarantees fallback food items map to bundled Vite assets in both dev and production `dist` builds.
     - Added safeguards in `syncFoodToSupabase`, `syncSliderToSupabase`, and `syncSettingsToSupabase` to prevent any string >200 KB from being sent to Supabase.
     - Bumped cache version to `v5_optimized_fast_cloud`.
- **Verification Results:**
  - Parallel fetch of all 7 Supabase collections completed in **532 ms** (down from >3200 ms timeout).
  - Restaurant settings upsert completed in **131 ms**.
  - `npm --prefix 3d-menu run build` compiled cleanly in 1.53s with 0 errors.
  - Browser console 500 errors completely eliminated.


---

## 28. Frontend Food Card Redesign & 'View Selected Items' Solid Glassmorphic Hook Button (2026-11-08 Part 8)
- **User Requests:**
  1. Transform 'View Selected Items' button into a solid color button with glassmorphism effect and an eye-catching psychological customer conversion hook.
  2. Redesign the current food name and price section to match the user's uploaded screenshot (media_1794158364575_155cecdb.jpg).
- **Files Modified:**
  - `3d-menu/src/App.jsx`
  - `3d-menu/src/index.css`
- **Key Changes Implemented:**
  1. **Solid Glassmorphism 'VIEW SELECTED ITEMS' CTA Button:**
     - Replaced multi-gradient background with a rich, solid brand amber color (`bg-[#F59E0B]`) when items are selected, and solid dark glass (`bg-[#0c111e]/90 backdrop-blur-xl`) when empty.
     - Implemented authentic glassmorphism specular highlights (`inset 0 1.5px 1px rgba(255, 255, 255, 0.55)`, frosted amber/white border, and glossy glass glaze overlay).
     - Added an active psychological conversion hook:
       - Breathing glow animation (`@keyframes buttonHookGlow` + `.selected-items-hook`).
       - High-contrast counter pill badge (`bg-black/20 text-black font-black`) with an active live ping radar indicator (`animate-ping`).
       - Micro-nudge on the right chevron arrow (`group-hover:translate-x-1`).
  2. **Food Name & Price Card Redesign (Exact Image 2 Match):**
     - Eliminated the bulky separate full-width "View Food Details >" bottom button to save vertical screen space and match the reference screenshot.
     - Single elegant compact card (`rounded-[20px] bg-[#0c101c]/90 backdrop-blur-xl border border-white/10`):
       - Left: Food Title (`text-white font-bold text-lg sm:text-[19px]`) + Category subtitle (`text-xs text-slate-400`).
       - Right: Prominent amber price (`text-[#F59E0B] font-bold text-2xl`) + aligned sub-row with strikethrough MRP (`৳250`) and inline `Details >` with chevron.
       - Entire card remains interactive and clickable to launch the customization sheet.
- **Verification:**
  - `npm --prefix 3d-menu run build` compiled cleanly in 3.92s with 0 errors.


---

## 29. Food Card Typography Refinements & 'View Selected Items' Matching Order Gradient (2026-11-08 Part 9)
- **User Requests:**
  1. Increase the font size of the `Details` button and chevron arrow; increase the vertical gap between the price and `Details` button for a more professional aesthetic.
  2. Remove the category name from below the food item title.
  3. Allow long food titles to wrap gracefully across two lines (`line-clamp-2`).
  4. Move the strikethrough discount/old price to the left side of the active price with an increased font size and clean baseline alignment.
  5. Reduce over-glassmorphism on the 'View Selected Items' button and match its background color/gradient to the 'Add to order' CTA button (`.cta-order-btn`) when items are selected, with crisp white typography.
- **Files Modified:**
  - `3d-menu/src/App.jsx`
- **Key Changes Implemented:**
  1. **Food Card Layout & Typography Overhaul:**
     - Category label removed completely from under the food title.
     - Food title updated with `line-clamp-2` and `text-lg sm:text-[20px] leading-snug`, allowing multi-word dishes to wrap across two lines cleanly without truncation.
     - Top price row now features the strikethrough old price (`text-sm sm:text-base text-slate-400/90 line-through tabular-nums font-medium`) situated cleanly to the LEFT of the main active price (`text-[#F59E0B] font-bold text-2xl sm:text-[26px]`).
     - `Details` link and chevron arrow enlarged (`text-sm sm:text-[14.5px] font-semibold text-white/90` with `w-4 h-4 stroke-[2.4]`) positioned directly below the price with an expanded gap (`mt-2 sm:mt-2.5`).
  2. **'View Selected Items' Button Refinement:**
     - Removed excessive glare layers and ping animations.
     - Applied `.cta-order-btn` (`linear-gradient(135deg, #F97316 0%, #EA580C 50%, #DC2626 100%)`) with `border-white/20 text-white font-extrabold uppercase` matching the 'Add to order' button in `media_1794160256855_f0b8a96c.png`.
- **Verification:**
  - `npm --prefix 3d-menu run build` compiled cleanly in 1.69s with 0 errors.


---

## 30. Details Button Right Flush Alignment & 'View Selected Items' True Center Alignment (2026-11-09)
- **User Requests:**
  1. Push the `Details >` button further to the right edge and fix the gap between `Details` and the right arrow `>` to a tight, standard spacing.
  2. Align the red-marked content `[checklist icon] VIEW SELECTED ITEMS (count)` to the **True Center** of the button.
- **Files Modified:**
  - `3d-menu/src/App.jsx`
- **Key Changes Implemented:**
  1. **Details Button Flush Right Alignment & Standard Gap:**
     - Removed stray JSX text whitespace between `Details` and `<ChevronRight />`, using `inline-flex items-center gap-0.5` with inline spans to ensure a tight, standard, professional gap.
     - Added `-mr-0.5` compensation so that the chevron's visual right tip aligns 100% flush with the digits of the price above (`৳180`).
  2. **'VIEW SELECTED ITEMS' True Center Alignment:**
     - Redesigned button layout using `relative flex items-center justify-center`:
       - The center content group (`[checklist icon]` + `VIEW SELECTED ITEMS (count)`) is rendered inside `flex items-center justify-center gap-2 sm:gap-2.5`, placing it in the mathematical and optical **True Center** of the button.
       - The right chevron arrow (`>`) is positioned absolutely on the right (`absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2`), ensuring it does not displace or skew the centered content.
- **Verification:**
  - `npm --prefix 3d-menu run build` compiled cleanly in 2.19s with 0 errors.

---

## 31. Super Admin Panel: Full Dummy Data Eviction & Live Multi-Tenant Supabase Connection (2026-11-09)
- **User Requests:**
  1. Delete/remove all dummy and mock data from the Super Admin Panel.
  2. Connect the Super Admin Panel live to Supabase PostgreSQL database.
  3. Ensure all database tables and schema in Supabase are created/configured and that the Super Admin Panel, Restaurant Panel, and customer 3D menu are properly synchronized.
- **Files Modified:**
  - `3d-menu/src/admin/super/superAdminStore.js`
  - `3d-menu/src/admin/super/SuperAdminPanel.jsx`
  - Supabase Database: `restaurants`, `restaurant_settings`, `orders`, `support_tickets`, `platform_settings`
- **Key Changes Implemented:**
  1. **Eviction of All Dummy Records from Supabase:**
     - Removed 5 legacy dummy restaurants (`resto_002` Kacchi Darbar, `resto_003` Hungry Bite Café, `resto_004` Spice Lounge, `resto_005` The Food Court, `resto_006` Royal Dine) directly from the Supabase `restaurants` and `restaurant_settings` tables.
     - Preserved only real active restaurant `resto_001` (`Moneky Bhai`, slug `3d-dine`).
  2. **Supabase Data Layer Overhaul (`superAdminStore.js`):**
     - Cleared all mock restaurants from fallback state, retaining only the authoritative `resto_001`.
     - Bumped local storage cache key to `dgm_superadmin_live_v2_` to purge stale mock data from browser localStorage.
     - Built comprehensive live query and mutator functions with Supabase JS client:
       - `fetchLiveRestaurantsFromSupabase()`: live multi-tenant restaurants query.
       - `fetchLiveOrdersFromSupabase()`: live customer orders query.
       - `fetchLiveTicketsFromSupabase()`: live support tickets query.
       - `fetchLiveCatalogFromSupabase()`: live food catalog and categories query.
       - `fetchLivePlatformSettingsFromSupabase()`: live platform global fee configuration query.
       - `syncNewRestaurantToSupabase(resto)`: synchronizes new restaurants and initializes matching `restaurant_settings`.
       - `updateRestaurantStatusInSupabase(id, status)`: live status toggle (active / suspended).
       - `deleteRestaurantFromSupabase(id)`: cascading delete of restaurant and settings from Supabase.
       - `updateTicketInSupabase(id, updates)`: live ticket resolution and status updates.
       - `updatePlatformSettingsInSupabase(settings)`: upserts global SaaS platform settings.
  3. **Super Admin Dashboard Component Overhaul (`SuperAdminPanel.jsx`):**
     - Completely removed all hardcoded metrics (`284` restaurants, `8,420` orders, `৳42,100` fee collection, `12` tickets, `52,680` visitors, and fake `trendData`).
     - **Dynamic KPIs:**
       - Total Restaurants: `restaurants.length` (real count from Supabase).
       - Active Digital Menus: `restaurants.filter(r => r.status === 'active').length`.
       - Total Orders: `orders.length` (real order bills recorded).
       - Service Fee Collection: `৳${(orders.length * (platformSettings?.feeRules?.platformFeePerBill ?? 5)).toLocaleString()}`.
       - Total Menu Visitors: dynamically calculated from live customer traffic.
     - **Dynamic Trend Chart:**
       - Computes daily order volume and ৳ fee aggregation over the last 14 days from real Supabase `orders.createdAt` timestamps.
       - Renders scalable SVG bars and fee line dynamically with interactive tooltips.
     - **Dynamic Order Status Ring:**
       - Calculates exact real-time percentages and SVG stroke dash arrays for `Completed (Paid)`, `Pending Confirmation`, `Cancelled`, and `Disputed` orders from Supabase.
     - **Recent Restaurants:**
       - Renders real restaurants directly from PostgreSQL with their slug, location, joined date, and active status.
     - **Functional Subpages:**
       - **All Restaurants:** Live list, status toggle (Active/Suspend), delete restaurant from Supabase with confirmation, and direct link to customer 3D menu (`/?resto=${r.slug}`).
       - **New Registrations:** Real pending queue with one-click "Approve & Activate".
       - **Digital Menus & QR Stands:** Shows each restaurant's unique URL and table QR count.
       - **Food Catalog:** Displays real food items, categories, prices, and 3D AR readiness from Supabase.
       - **Digital Bills & Fee Ledger:** Real verified orders table and restaurant monthly fee ledger (৳5/bill).
       - **Revenue & Settlement:** SaaS accrued platform fees, fee rule preview, and settlement status.
       - **Support Center:** Live support tickets from Supabase `support_tickets` with "Resolve" button updating Supabase live.
       - **Platform Settings:** Real-time editor for platform fee per bill and minimum bill amount, saving directly to Supabase `platform_settings` table.
- **Verification:**
  - `npm --prefix 3d-menu run build` compiled cleanly in 1.42s with 0 errors.
  - Supabase connectivity verified with 1 real restaurant (`Moneky Bhai`), 14 real orders, 4 real tickets, and global configuration.

---

## 32. Super Admin Dashboard: 10 KPI Cards, Real-Time Settlements & Period Dropdown Filter (2026-11-09)
- **User Requests:**
  1. Add/update 10 dedicated KPI cards in the Super Admin dashboard:
     - 1. `Total DGM Orders` (renamed from 'Total Orders (Bills)')
     - 2. `Today DGM Orders` (count of today's orders across all restaurants)
     - 3. `Total Suspended Restaurants` (count of suspended restaurants)
     - 4. `Total Scans` (renamed from 'Total Menu Visitors', all restaurants)
     - 5. `Today Scans` (today's scan count across all restaurants)
     - 6. `Total Fees Collections` (renamed from 'Service Fee Collection', all restaurants)
     - 7. `Today Fees Collections` (today's fees across all restaurants)
     - 8. `Total Due Settlements` (pending ৳5 platform fee dues from restaurants)
     - 9. `Total Cleared Settlement` (cleared settlement amounts with interactive dropdown for Month, Week, Day, Year, Total, showing selected period amount + total cleared)
     - 10. `Total Earnings` (100% realized revenue collected from cleared settlements)
  2. Match Super Admin dashboard theme and color profile with related icons and animations.
- **Files Modified:**
  - `3d-menu/src/admin/super/superAdminStore.js`
  - `3d-menu/src/admin/super/SuperAdminPanel.jsx`
  - `3d-menu/src/admin/super/superAdminStyles.css`
  - Supabase Database: created `settlements` table with RLS and public policies.
- **Key Changes Implemented:**
  1. **Supabase `settlements` Table & Store Functions:**
     - Created `public.settlements` table with columns: `id`, `restaurant_id`, `amount`, `fee_per_bill`, `orders_count`, `period_start`, `period_end`, `payment_method`, `transaction_ref`, `status`, `notes`, `cleared_at`, `created_at`.
     - Built `fetchLiveSettlementsFromSupabase()` and `recordSettlementInSupabase()` in `superAdminStore.js`.
  2. **10 Dynamic Dashboard KPI Cards:**
     - **Card 1: Total DGM Orders:** Live count of all verified orders (`orders.length`). Icon: `<ReceiptText />`, tone: `purple`.
     - **Card 2: Today DGM Orders:** Orders placed today across all restaurants (`createdAt === todayStr`). Icon: `<ShoppingBag />`, tone: `orange`, with live pulse indicator dot.
     - **Card 3: Total Suspended Restaurants:** Count of restaurants with `status === 'suspended'`. Icon: `<AlertCircle />`, tone: `red`/`rose`.
     - **Card 4: Total Scans:** Real-time customer QR & AR menu scans across all restaurants. Icon: `<QrCode />`, tone: `teal`.
     - **Card 5: Today Scans:** Today's QR & AR scans across all restaurants. Icon: `<TrendingUp />`, tone: `cyan`, with live pulse indicator dot.
     - **Card 6: Total Fees Collections:** All-time accrued SaaS fee (`orders.length * feePerBill`). Icon: `<Coins />`, tone: `gold`.
     - **Card 7: Today Fees Collections:** SaaS fees accrued today (`todayOrders.length * feePerBill`). Icon: `<Wallet />`, tone: `amber`, with live pulse indicator dot.
     - **Card 8: Total Due Settlements:** Pending due fees (`totalFees - totalCleared`). Icon: `<Clock3 />`, tone: `orange`.
     - **Card 9: Total Cleared Settlement:**
       - Embedded interactive dropdown menu inside the card: `Month`, `Week`, `Day`, `Year`, `Total`.
       - Displays the cleared amount for the selected period (`৳...`) and subtitle showing `Total Cleared: ৳...`.
       - Icon: `<CheckCircle2 />`, tone: `emerald`.
     - **Card 10: Total Earnings:**
       - Realized revenue collected from cleared settlements (`= totalCleared`).
       - Features `.earnings-glow` luxury gradient border and subtle green specular highlight.
       - Icon: `<ShieldCheck />`, tone: `violet`.
  3. **Settlement Management in `RevenueSettlementView`:**
     - Added "+ Record Settlement Payment" modal allowing Super Admin to record payments received from restaurants (amount, method, TRX reference ID, notes).
     - Added one-click "Clear Due" button on each restaurant row in the ledger table.
     - Added "Cleared Settlements History" transaction audit table.
  4. **Styling & Responsive Layout:**
     - Extended `.superadmin-app .kpi-row` to 5 columns on desktop (clean 2 rows of 5 cards), collapsing to 3 on tablet and 2/1 on mobile.
     - Added CSS tones (`blue`, `cyan`, `emerald`, `amber`, `violet`, `rose`) with matching dark mode variables and `.kpi-pulse-dot` animation.
- **Verification:**
  - `npm --prefix 3d-menu run build` compiled cleanly in 1.54s with 0 errors.
  - Vite dev server running and hot-reloaded.

---

## 33. Restaurant Panel: Purge of Dummy Metrics & Live Connection to Real Data in 'Live Food Menu Catalog' (2026-11-09)
- **User Request:**
  - In Restaurant Panel, under the 'Live Food Menu Catalog' section cards, delete all dummy data so only real data is displayed.
- **Root Cause Analysis:**
  - The 10 KPI metric cards under `Live Food Menu Catalog` contained hardcoded strings (`1,428`, `86`, `342`, `+14`), dummy fallback values (`|| 8`, `|| 5`, `|| 15`, `|| 11`, `55`), and fake static percentage trends (`+12.6%`, `+18.6%`, `+25.0%`, `+57.1%`, `+10.0%`, `+7.5%`, `+75.0%`, `+3 items`, `+1 category`).
  - `fetchRemoteData()` in `menuStore.js` was querying food items, categories, and settings, but was omitting the `orders` table. Thus, order metrics fell back to `initialOrders` or mock counts.
  - The food cards below the banner also had fake tag fallbacks (`|| 'BEST SELLING'`), fake rating fallbacks (`|| '4.9'`), and generic placeholder descriptions.
- **Key Changes Implemented:**
  1. **Supabase Orders Hydration (`menuStore.js` & `App.jsx`):**
     - Updated `fetchRemoteData()` to query Supabase `orders` table for `resto_001` and map to normalized camelCase records.
     - Handled `remoteOrders` in `App.jsx` on mount, updating both state and `localStorage`.
  2. **Real Customer Engagement Tracking (`menuStore.js`):**
     - Built `recordMenuScan(restaurantId)` to record real menu scans every time a diner visits `/`.
     - Built `getMenuScans(restaurantId, ordersCount)` to aggregate total and today scans.
     - Built `getRestaurantFollowers(restaurantId, ordersList)` to compute real distinct customer diners and followers (defaults strictly to 0, no mock `342` or `+14`).
  3. **Real Metric Calculation & Purge of Fallbacks (`RestaurantPanel.jsx`):**
     - **Card 1 (Total Items):** Strictly `foods.length`. Trend shows real active/draft breakdown (`${metrics.totalPublishedItems} Active` / `${metrics.unpublishedItems} Draft`).
     - **Card 2 (Categories):** Strictly `uniqueCategories.length`. Trend shows real sub-category count (`${subcategories.length} Sub-types`).
     - **Card 3 (Total Scan):** Real tracked customer visits (`scansData.totalScans`).
     - **Card 4 (Today Scan):** Real scans recorded today (`scansData.todayScans`).
     - **Card 5 (Total DGM Orders):** Live confirmed orders from Supabase (`metrics.totalOrders`).
     - **Card 6 (Today DGM Orders):** Orders created today from Supabase (`metrics.todayOrders`).
     - **Card 7 (Today Fees Collection):** Accurately `metrics.todayOrders * 5` (৳0 if 0 orders, never fake ৳55).
     - **Card 8 (Total Due Settlement):** Real platform due calculated from `orders * 5 - clearedSettlements` (৳0 if settled).
     - **Card 9 (Total Followers):** Real distinct diner base (`followersData.totalFollowers`).
     - **Card 10 (Today Followers):** Real new diners/followers today (`followersData.todayFollowers`).
  4. **Clean Food Item Cards:**
     - Removed fake `|| 'BEST SELLING'` tag (tags render only when explicitly defined).
     - Removed fake `|| '4.9'` rating (renders `New` for unrated items).
     - Cleaned description fallback from generic marketing filler to honest `No description added yet.`.
  5. **Git & Build Verification:**
     - `npm --prefix 3d-menu run build` passed in 4.33s with 0 errors.
     - Committed and pushed cleanly to GitHub `sojolkhan1889-web/digital-food-menu` on `main`.
