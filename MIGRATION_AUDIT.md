# Comprehensive Migration Audit: Supabase Cloud to Self-Hosted Supabase on Oracle Cloud ARM64 (Docker & Coolify)

**Project:** Universal 3D Digital Food Menu & Restaurant SaaS Platform  
**Target Architecture:** Oracle Cloud Infrastructure (OCI) Ampere A1 (ARM64 / aarch64, 4 OCPU, 24 GB RAM) running Ubuntu 22.04/24.04 LTS, Docker Engine with Compose V2, and Coolify PaaS.  
**Source Cloud Infrastructure:** Supabase Cloud (`rsbwehchoovcmaclssuh.supabase.co`)  
**Audit Date:** November 2026  
**Scope:** Read-Only Full Stack & Infrastructure Audit. Zero production modifications performed during this audit.

---

## 1. Executive Summary & Architecture Overview

The Digital Food Menu application is an advanced interactive 3D/AR Web application built with **React 19**, **Vite 8**, **Tailwind CSS v4**, and **Google `<model-viewer>`**, paired with a custom multi-tenant restaurant and super-admin management platform.

### Key Finding on Architecture Simplicity:
- **Client-Side SPA Architecture:** The application does not use server-rendered Next.js/Nuxt. All frontend logic, routing, 3D model manipulation, and data access execute purely on the client side via the `@supabase/supabase-js` SDK (`v2.118.0`).
- **No Supabase Auth (`gotrue`) Dependency:** Neither the restaurant portal nor the super-admin portal uses Supabase Auth (`auth.users`, OAuth, JWT session tokens, or GoTrue). Instead, multi-tenant authentication is managed through application-level table lookups (`public.restaurants`, `public.platform_settings`) with localStorage session tokens (`dgm_restaurant_auth`, `dgm_super_admin_auth_session`).
- **No Storage Bucket Dependencies:** 3D assets (`.glb` models) and high-definition food images are served from static paths (`public/models/*.glb`, `public/*.png`, `src/assets/*.png`) and local client caches (IndexedDB `foods_offline_store` and browser localStorage). There are **zero active buckets in Supabase Storage** (`storage.buckets` count = 0).
- **Single Edge Function:** Only one Supabase Edge Function exists: `send-web-push` (version 2, Deno runtime), which orchestrates OS-level background Web Push notifications via VAPID (`web-push@3.6.7`) to wake up mobile devices and trigger background Service Worker push events.
- **Supabase Realtime:** Realtime channels are actively utilized for live dish broadcast events (`dgm_restaurant_realtime_broadcast`) and live database change notifications (`realtime_restaurant_notifications_db`) on tables `restaurant_notifications` and `restaurant_followers`.

---

## 2. Inventory of Frontend & Backend Applications

| Application / Module | Tech Stack / Framework | Path | Build / Dev Command | Current Host / Target Host |
| :--- | :--- | :--- | :--- | :--- |
| **3D Customer Menu & Portals** | React 19.3.1, Vite 8.3.4, Tailwind CSS 4.3.3 | `3d-menu/` | `vite build` / `vite` | Vercel (`3d-menu-rho.vercel.app`) / Coolify (Docker or Static Nginx) |
| **Root Workspace Harness** | Node.js (Proxy scripts) | `./` | `npm run build` (`cd 3d-menu && npm install && npm run build`) | Monorepo Root |
| **Service Worker** | Vanilla JS (Web Push API) | `3d-menu/public/sw.js` | Static asset copied to `dist/` | Client Browser Service Worker |
| **Edge Function (`send-web-push`)** | Deno TypeScript, `web-push@3.6.7` | Supabase Cloud Function slug `send-web-push` | Deno Edge Runtime deploy | Supabase Edge Runtime / Standalone Node.js/Bun microservice in Docker |

---

## 3. Environment Variables & Endpoint References

### Active Frontend Environment Variables (`3d-menu/src/lib/supabaseClient.js`)
Currently, the client uses fallback variables directly in code:
```javascript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rsbwehchoovcmaclssuh.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '<LEGACY_SUPABASE_ANON_JWT>';
```

### Hardcoded Cloud Endpoint References (Must Be Parameterized)
1. **Supabase Client Endpoint:**
   - File: `3d-menu/src/lib/supabaseClient.js` (Line 3)
   - Current: Fallback to `'https://rsbwehchoovcmaclssuh.supabase.co'`
   - Required Change: Parameterize strictly through `import.meta.env.VITE_SUPABASE_URL`.
2. **Direct Edge Function Invocation in Menu Store:**
   - File: `3d-menu/src/data/menuStore.js` (Line 804)
   - Code:
     ```javascript
     fetch('https://rsbwehchoovcmaclssuh.supabase.co/functions/v1/send-web-push', { ... })
     ```
   - Required Change: Update to use dynamic base URL:
     ```javascript
     const apiUrl = import.meta.env.VITE_SUPABASE_URL || 'https://api.yourdomain.com';
     fetch(`${apiUrl}/functions/v1/send-web-push`, { ... })
     ```
     Or when self-hosting edge functions on a dedicated endpoint/subdomain:
     ```javascript
     const edgePushUrl = import.meta.env.VITE_EDGE_PUSH_URL || `${apiUrl}/functions/v1/send-web-push`;
     ```

---

## 4. Database Schema, Migration & Data Inventory

### PostgreSQL Extensions Installed:
- `uuid-ossp` (v1.1)
- `pgcrypto` (v1.3)
- *Note:* `pg_cron` and `pg_net` are **not installed or used**.

### Complete Public Schema Table Inventory:
There are **15 tables** in the `public` schema. All 15 have Row Level Security (RLS) enabled.

| Table Name | Primary Key | Row Count | Foreign Keys | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `restaurants` | `id` (text) | 1 | None | Multi-tenant restaurant profile, credentials, themes, subscription plan |
| `categories` | `id` (text) | 6 | `restaurant_id` -> `restaurants.id` | Food menu primary categories |
| `subcategories` | `id` (text) | 7 | `restaurant_id` -> `restaurants.id` | Subcategory taxonomy |
| `food_items` | `id` (text) | 9 | `restaurant_id` -> `restaurants.id` | Food catalog, pricing, ratings, options, image references |
| `featured_sliders` | `id` (text) | 4 | `restaurant_id` -> `restaurants.id` | Home banner 3D special dishes |
| `restaurant_settings` | `id` (text) | 1 | `restaurant_id` -> `restaurants.id` | Tax, VAT, service charges, table count, branding |
| `platform_settings` | `id` (text) | 1 | None | Super admin global SaaS fees, billing cycle, currency |
| `orders` | `id` (text) | 20 | `restaurant_id` -> `restaurants.id` | Live customer orders, billing breakdown, payment status |
| `payments` | `id` (text) | 0 | `restaurant_id` -> `restaurants.id` | Transaction logs |
| `settlements` | `id` (text) | 0 | `restaurant_id` -> `restaurants.id` | Platform revenue settlements |
| `menu_scans` | `id` (text) | 102 | None | QR code scan telemetry & table tracking |
| `restaurant_followers` | `id` (text) | 7 | None | Diner subscriptions & Web Push VAPID endpoints |
| `restaurant_notifications`| `id` (text) | 23 | None | Sent broadcast notification history |
| `support_tickets` | `id` (text) | 4 | `restaurant_id` -> `restaurants.id` | Restaurant-to-admin help desk |
| `support_chat_messages` | `id` (text) | 5 | `restaurant_id` -> `restaurants.id` | Help desk messaging thread |

### Database Constraints & Indexes:
- `restaurants_slug_key` (Unique index on `slug`)
- `restaurants_login_id_key` (Unique index on `login_id`)
- Primary keys defined on all 15 tables (`btree (id)`).
- `REPLICA IDENTITY FULL` configured on: `restaurant_notifications` (for Supabase Realtime CDC).

### Row Level Security (RLS) Policies:
Every table currently has permissive access configured for `anon` and `authenticated` roles (e.g., `Allow all access to food_items`, `Allow all access to orders`), because authentication is validated at the application store layer (`menuStore.js` and `superAdminStore.js`).
- In self-hosted Supabase, standard PostgREST RLS behaviors with PostgREST `anon` and `service_role` tokens behave 100% identically to Supabase Cloud.

---

## 5. Supabase Realtime & Publication Configuration

### Publication Details:
- Publication name: `supabase_realtime`
- Monitored Tables:
  1. `public.restaurant_followers`
  2. `public.restaurant_notifications`
- Replica Identity: `restaurant_notifications` is set to `REPLICA IDENTITY FULL`.

### Active Client-Side Realtime Subscriptions:
1. **Broadcast Channel:**
   ```javascript
   supabase.channel('dgm_restaurant_realtime_broadcast')
     .on('broadcast', { event: 'new_slider_notif' }, (data) => { ... })
     .subscribe();
   ```
2. **Postgres Changes Channel:**
   ```javascript
   supabase.channel('realtime_restaurant_notifications_db')
     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'restaurant_notifications' }, (payload) => { ... })
     .subscribe();
   ```

### Coolify / Self-Hosted Requirement for Realtime:
In self-hosted Supabase Docker containers:
- `realtime-dev.supabase-realtime` container must have network access to PostgreSQL (port 5432) with logical replication enabled (`wal_level = logical`).
- In Coolify, ensure `REALTIME_ENABLED=true` and `SLOT_NAME=supabase_realtime_rls` are set in the Supabase service environment.

---

## 6. Edge Function & Web Push Architecture

### Function Analysis: `send-web-push`
- **Location:** Cloud Supabase Edge Runtime (`/tmp/user_fn_.../source/index.ts`)
- **Runtime:** Deno
- **Dependencies:**
  - `jsr:@supabase/functions-js/edge-runtime.d.ts`
  - `npm:@supabase/supabase-js@2.49.1`
  - `npm:web-push@3.6.7`
- **Configuration & Secrets:**
  - `VAPID_PUBLIC_KEY`: Embedded in function and `menuStore.js`
  - `VAPID_PRIVATE_KEY`: Embedded in function
  - `VAPID_SUBJECT`: `mailto:support@digitalfoodmenu.com`
  - `SUPABASE_URL`: From Deno environment variable
  - `SUPABASE_SERVICE_ROLE_KEY`: From Deno environment variable
- **Workflow:**
  1. Receives POST request from Restaurant Admin when a special offer is broadcasted.
  2. Queries `public.restaurant_followers` where `subscription IS NOT NULL` and `restaurant_id = ...`.
  3. Formats payload with `urgency: 'high'` and `TTL: 86400`.
  4. Dispatches encrypted web push to Google FCM endpoints (`fcm.googleapis.com`).
  5. Cleans up expired (404/410) subscriptions from `restaurant_followers`.

### Self-Hosted Execution Strategy:
Supabase self-hosted stack includes `edge-runtime` container. However, deploying functions to the self-hosted edge runtime via Coolify requires volume-mounting `/home/deno/functions` or using Supabase CLI.
**Recommended Architecture for Coolify:**
- **Option A (Supabase Edge Runtime):** Mount the function folder into the Supabase Edge Runtime container in your Docker Compose file.
- **Option B (Node.js/Bun Microservice - Recommended for Simplicity):** Run a lightweight microservice (or Fastify/Express container) on the same Docker network with the same 80 lines of `web-push` code. It eliminates Deno Edge runtime overhead and runs natively on ARM64.

---

## 7. Storage Buckets, Assets & CDN References

- **Supabase Cloud Storage Buckets:** None. `storage.buckets` returns `[]`.
- **Media Asset Handling:**
  - Food images uploaded in the admin portal are stored directly as Base64 strings or external image URLs inside the `image` column of `food_items` and `featured_sliders`.
  - Offline image caching is powered by IndexedDB (`foods_offline_store`) inside `3d-menu/src/data/menuStore.js`.
  - 3D models (`.glb` files) reside directly in the frontend repository (`3d-menu/public/models/`).
- **Conclusion:** No file migration from `storage.objects` is required. This drastically reduces migration complexity and eliminates S3/MinIO bucket synchronization risks.

---

## 8. ARM64 / aarch64 Compatibility Analysis (Oracle Cloud Ampere A1)

Oracle Cloud Infrastructure (OCI) Ampere A1 Compute instances use ARM64 architecture (Neoverse-N1 cores). All containers in the self-hosted Supabase stack must provide multi-arch or `linux/arm64` container images.

| Service Container | Image Name | ARM64 Support Status | Notes & Verification |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Database** | `supabase/postgres:15.6.1.139` (or newer) | Native ARM64 Available | Official Supabase PostgreSQL images have native `arm64` builds. |
| **PostgREST** | `postgrest/postgrest:v12.0.2` | Native ARM64 Available | PostgREST publishes official multi-arch images (`amd64`, `arm64`). |
| **Supabase Realtime** | `supabase/realtime:v2.30.23` | Native ARM64 Available | Elixir/Phoenix multi-arch release supports `linux/arm64`. |
| **Supabase Storage API**| `supabase/storage-api:v1.11.13`| Native ARM64 Available | Node.js based, fully compatible with ARM64. Optional since not currently used. |
| **Supabase Studio** | `supabase/studio:20240729-fa80cfc` | Native ARM64 Available | Next.js based dashboard; runs natively on ARM64. |
| **Kong API Gateway** | `kong:2.8.1-alpine` | Native ARM64 Available | Official Alpine/Kong provides native ARM64 support. |
| **Supabase Edge Runtime**| `supabase/edge-runtime:v1.64.0`| Native ARM64 Available | Deno-based runtime with multi-arch ARM64 images. |
| **Coolify PaaS** | `ghcr.io/coollabsio/coolify:latest` | Native ARM64 Available | Coolify officially supports Oracle Cloud ARM64 instances. |

---

## 9. Step-by-Step Ordered Migration Plan

```
[Phase 1: OCI & Coolify Setup] ➔ [Phase 2: Self-Hosted Supabase Deployment] ➔ [Phase 3: Database Dump & Restore] ➔ [Phase 4: Function Deployment] ➔ [Phase 5: Frontend Build & DNS Switch] ➔ [Phase 6: Live Smoke Test]
```

### Phase 1: OCI Ampere VM Preparation
1. Create an OCI Compute Instance:
   - Shape: `VM.Standard.A1.Flex` (4 OCPU, 24 GB RAM, 200 GB Boot Volume).
   - OS: Ubuntu 24.04 LTS or 22.04 LTS (aarch64).
2. Configure OCI VCN Security List & Ingress Rules:
   - Port 22 (SSH)
   - Port 80 (HTTP / ACME Let's Encrypt)
   - Port 443 (HTTPS)
   - Port 8000 (Kong Gateway - keep internal to Docker or reverse-proxy via Coolify Traefik)
3. Open host iptables (Ubuntu on OCI has strict default firewall):
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```
4. Install Docker & Coolify:
   ```bash
   curl -fsSL https://get.coolify.io | bash
   ```

### Phase 2: Deploy Self-Hosted Supabase in Coolify
1. In the Coolify Dashboard:
   - Navigate to **Services** -> **Add New Service** -> Select **Supabase**.
   - Coolify will load the pre-configured official Supabase Docker Compose stack.
2. Generate Cryptographic Keys for Self-Hosted Supabase:
   - Generate secure passwords for `POSTGRES_PASSWORD`, `JWT_SECRET`, and `DASHBOARD_PASSWORD`.
   - Generate `ANON_KEY` and `SERVICE_ROLE_KEY` using the new `JWT_SECRET`.
3. Set Public URLs:
   - Set `API_EXTERNAL_URL` to `https://api.yourdomain.com` (configured with automatic SSL via Coolify/Traefik).
   - Set `STUDIO_DEFAULT_ORGANIZATION` and `STUDIO_DEFAULT_PROJECT`.
4. Start the Supabase service and verify all containers are healthy.

### Phase 3: Zero-Data-Loss Database Dump & Restore
1. Dump current Supabase Cloud database schema and data using `pg_dump`:
   ```bash
   # Connect to Supabase Cloud via direct pooler/DB connection string
   pg_dump "postgres://postgres.rsbwehchoovcmaclssuh:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" \
     --schema=public \
     --no-owner \
     --no-privileges \
     --file=dgm_backup.sql
   ```
2. Restore to Self-Hosted PostgreSQL on Oracle Cloud:
   ```bash
   # Restore into the self-hosted database container
   docker exec -i <supabase-db-container-id> psql -U postgres -d postgres < dgm_backup.sql
   ```
3. Enable Realtime Replication in the self-hosted database:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_notifications;
   ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_followers;
   ALTER TABLE public.restaurant_notifications REPLICA IDENTITY FULL;
   ```

### Phase 4: Deploy Edge Function (`send-web-push`)
1. Extract the function code from Supabase Cloud (already verified in version 2).
2. Configure the function inside the self-hosted environment with:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `SUPABASE_URL = http://kong:8000` (internal network) or `https://api.yourdomain.com`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Verify invocation with a test payload:
   ```bash
   curl -X POST https://api.yourdomain.com/functions/v1/send-web-push \
     -H "Content-Type: application/json" \
     -d '{"restaurant_id": "resto_001", "title": "Test Ping"}'
   ```

### Phase 5: Frontend Parameterization & Rebuild
1. Create `.env.production` in `3d-menu/`:
   ```env
   VITE_SUPABASE_URL=https://api.yourdomain.com
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...<NEW_SELF_HOSTED_ANON_KEY>
   ```
2. Update `3d-menu/src/data/menuStore.js` line 804 to use dynamic URL:
   ```javascript
   const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rsbwehchoovcmaclssuh.supabase.co';
   fetch(`${baseUrl}/functions/v1/send-web-push`, { ... });
   ```
3. Build the frontend application (`npm run build`).
4. Deploy the frontend to Coolify as a static site (or maintain on Vercel pointed to the self-hosted API domain).

---

## 10. Risk Analysis, Breaking Changes & Rollback Strategy

| Identified Risk | Severity | Root Cause | Prevention / Mitigation |
| :--- | :--- | :--- | :--- |
| **Hardcoded Supabase Cloud URL in `menuStore.js`** | High | Line 804 explicitly targets `rsbwehchoovcmaclssuh.supabase.co`. | Must be updated to use `import.meta.env.VITE_SUPABASE_URL` before cutting over; otherwise web push notifications continue hitting Supabase Cloud. |
| **Realtime WebSocket Connection Blocked** | High | Proxy/Reverse proxy stripping WebSocket headers. | Ensure Traefik in Coolify has WebSocket upgrades enabled for `/realtime/v1/websocket`. |
| **Oracle Cloud Host Firewall Dropping Traffic** | Medium | OCI Ubuntu images include restrictive default `iptables` rules. | Explicitly open ports 80/443 using `iptables -I INPUT` and persist rules. |
| **CORS Errors on Self-Hosted API** | Medium | PostgREST / Kong not permitting requests from frontend domain. | Configure `SUPABASE_PUBLIC_URL` and Kong CORS headers to allow `https://3d-menu-rho.vercel.app` and custom domains. |
| **Client VAPID Key Mismatch** | Medium | Changing VAPID keys would invalidate existing 7 mobile subscriptions. | **Retain the existing VAPID key pair** (`BLeOyg0...` / `iYS-a9F...`) so existing diner devices receive push notifications without needing to re-follow. |

### Rollback Strategy (Zero Downtime Guarantee):
Because the existing Supabase Cloud database remains completely untouched:
1. If the self-hosted instance encounters any connectivity, network, or performance issues, simply revert `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the frontend back to the Supabase Cloud credentials.
2. Re-deploy the frontend on Vercel/Coolify. Recovery time: under 2 minutes.

---

## 11. Verification Checklist for Post-Migration Testing

- [ ] `GET https://api.yourdomain.com/rest/v1/restaurants` returns status 200 with `resto_001`.
- [ ] Realtime WebSocket connects successfully: check browser dev tools network tab for `101 Switching Protocols` on `.../realtime/v1/websocket`.
- [ ] Restaurant login (`admin` / `admin123`) loads live menus and active categories.
- [ ] Super Admin login (`superadmin@digitalmenu.com` / `superadmin2026`) opens platform overview with live data metrics.
- [ ] Customer QR Menu scan increments `menu_scans` table count in self-hosted PostgreSQL.
- [ ] Customer "+ Follow" registers device subscription into `restaurant_followers`.
- [ ] Restaurant Featured Slider push broadcast executes `send-web-push` and triggers phone lock screen vibration and notification drawer.
- [ ] Tapping the notification opens `/?openSlide=...&foodId=...` and centers the 3D AR canvas on the promoted dish.

