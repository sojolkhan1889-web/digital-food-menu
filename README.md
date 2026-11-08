# 🍽️ Universal 3D Digital Food Menu & Restaurant SaaS Platform

A high-performance, futuristic 3D Holographic digital food menu and complete restaurant management SaaS platform built with **React 19**, **Vite**, **Tailwind CSS v4**, **Three.js / Google Model-Viewer**, and **Supabase Realtime Database**.

---

## 🌟 Key Features

### 1. 📱 Customer 3D AR Digital Menu (`/`)
- **Interactive 3D Stage**: Smooth 360° rotation of dishes with Three.js and Google Model-Viewer.
- **Dynamic Category Filtering**: Real-time category selection and multi-dish browsing.
- **Portions & Addons Customization Modal**: Bottom sheet modal for selecting portions (radio) and addons (checkboxes) with dynamic live price calculation.
- **Featured Specials Carousel**: Auto-rotating promotional banner carousel with pause on hover/touch.
- **Order Cart & Summary**: Seamless review of selected items with clear quantities, totals, and ordering workflows.

### 2. 🏪 Restaurant Manager Portal (`/admin`)
- **Solid Enterprise UI**: Clean, high-contrast, professional design with standard 5px corner radii.
- **Food Items & Menu Management**: Add, edit, toggle availability, and delete menu items with instant Supabase sync.
- **Categories & Food Types (Sub-categories)**: Create, reorder, and manage menu classifications.
- **Featured Sliders Manager**: Upload custom banners, promotional specials, and manage display order.
- **Table QR Code Generation**: Instant QR code generation for tables with direct customer menu deep links.
- **Billing & Settlement**: Track order confirmation fees, view dues, and make settlement payments.

### 3. 👑 Super Admin SaaS Console (`/admin` -> Super Admin Tab)
- **10 Real-time KPI Metric Cards**:
  1. Total DGM Orders
  2. Today DGM Orders
  3. Total Suspended Restaurants
  4. Total Menu Scans
  5. Today Scans
  6. Total Fees Collections
  7. Today Fees Collections
  8. Total Due Settlements
  9. Total Cleared Settlements (with Period Filter: Month, Week, Day, Year, Total)
  10. Total Platform Earnings (with luxury emerald glow)
- **Live Supabase Sync**: Real-time settlements and order tracking across all registered restaurants.

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/sojolkhan1889-web/digital-food-menu.git
cd digital-food-menu

# 2. Navigate to the 3d-menu directory
cd 3d-menu

# 3. Install dependencies
npm install

# 4. Start local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ☁️ 1-Click Deployment on Vercel

1. Push this repository to GitHub (`sojolkhan1889-web/digital-food-menu`).
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import the `digital-food-menu` repository.
4. Deployment settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `3d-menu` (or `./` with included `vercel.json`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Environment Variables (Optional - defaults are already configured in code):
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key
6. Click **Deploy**. Your app will be live with full SPA routing support!

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Lucide React
- **3D & Visuals**: `@google/model-viewer`, Three.js, CSS 3D
- **Backend & Database**: Supabase (PostgreSQL, Realtime, Storage)
- **Deployment**: Vercel

---

## 📄 License
Private & Proprietary — All Rights Reserved.

