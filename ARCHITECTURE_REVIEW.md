# InventoriMan — Architecture Review & Enhancement Roadmap

> **Status**: This is a **recommendation document** — **no code changes have been implemented yet**. The project is feature-rich but has critical gaps for production readiness at scale.

---

## 📊 Executive Summary

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Core POS** | ✅ 9/10 | Complete checkout, returns, exchanges, customer credit |
| **Inventory** | ✅ 8/10 | Brands, rolls, stock logs, CSV import/export |
| **Multi-Store Sync** | ✅ 8/10 | RLS, anon-key only, store-scoped — architecturally sound |
| **Offline-First** | ⚠️ 5/10 | No conflict resolution, no realtime, polling only |
| **Licensing** | ✅ 7/10 | Hardware-bound, grace period, trial — needs server validation |
| **Testing** | ⚠️ 4/10 | Unit tests only; no integration/e2e/component tests |
| **DevEx/CI** | ⚠️ 3/10 | No CI/CD, no typed IPC, no shared types package |
| **Extensibility** | ❌ 2/10 | No plugin system, no webhooks, no partner API |

**Verdict**: Excellent foundation for a single-store desktop POS. **Not yet ready** for multi-device, multi-store, or SaaS distribution without Phase 1 work.

---

## ✅ What's Already Built (Strong Foundation)

### Core POS Features
- Full checkout flow: cart, barcode scanner (html5-qrcode), split payments, customer lookup
- Returns & Exchanges: complete workflow with 4 balance outcomes (cash refund, store credit, extra paid, none)
- Customer credit tracking with audit logs (`customer_credit_logs`)
- Receipt printing (80mm thermal via `@page { size: 80mm auto }`) + PDF generation

### Inventory Management
- Products with brands, SKUs, wholesale/retail/cost pricing
- Stock adjustments with audit trail (`inventory_logs`)
- Low-stock alerts per product
- Roll-based inventory for textiles (meters per roll, roll tracking)
- CSV import/export with validation

### Multi-Store & Cloud Sync (Supabase)
- **10 tables** with store-scoped RLS: `stores`, `store_members`, `products`, `brands`, `customers`, `orders`, `order_items`, `returns`, `rolls`, `inventory_logs`, `customer_credit_logs`
- **Anon-key only** — service-role keys explicitly rejected in config & tests (`supabaseSync.test.cjs`)
- Sync queue (`sync_queue`) with retry logic (max 10), exponential backoff, store-scoped processing
- Store activation flow: Supabase Auth → `store_members` membership validation → RLS enforcement

### Business Profiles (8 Vertical Templates)
| Profile | Stock Unit | Has Rolls | Has Brands | Has Expiry | Has Variants |
|---------|------------|-----------|------------|------------|--------------|
| Textile | meter | ✅ | ✅ | ❌ | ❌ |
| Grocery | kg | ❌ | ❌ | ✅ | ❌ |
| Ice Cream | scoop | ❌ | ❌ | ✅ | ✅ |
| Electronics | pcs | ❌ | ✅ | ❌ | ✅ |
| Pharmacy | strip | ❌ | ✅ | ✅ | ❌ |
| Bakery | pcs | ❌ | ❌ | ✅ | ❌ |
| Restaurant | portion | ❌ | ❌ | ❌ | ✅ |
| General | pcs | ❌ | ✅ | ❌ | ❌ |

### Staff & Permissions
- 4 roles: `owner` > `admin` > `manager` > `cashier`
- PIN auth with bcrypt migration from plain text (migration seeds `pin_hash`, clears `pin`)
- `usePermissions` hook for UI-level gating (`can('manage_inventory')`, `can('view_reports')`, etc.)
- Audit logs (`activity_logs`, `login_logs`) for compliance

### Settings & Config
- 8 settings tabs: Theme, Business, System, Staff, Cloud Sync, Database, License, Audit Logs
- Business profile persisted in `settings` table with upsert
- License: hardware-bound, 1-year expiry, 7-day grace, demo mode in dev
- Database maintenance: clear inventory / clear all (owner/admin only)

### Testing (4 Suites)
| File | Coverage |
|------|----------|
| `hardening.test.cjs` | Migrations, order/return/exchange logic, PIN hashing, sync payload mapping, asset protocol |
| `supabaseSync.test.cjs` | Service-role rejection, store activation normalization, CloudSyncSettings SQL coverage (RLS + all 10 tables), payload normalization, hardening checks |
| `businessProfiles.test.cjs` | All 8 profiles match exact spec, `resolveStockUnitLabel` custom override |
| `releaseConfig.test.cjs` | electron-builder files config, macOS/Windows packaging scripts |

---

## 🎯 Critical Gaps (Must-Have for Production)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| **1** | **Offline Conflict Resolution** | Same record edited on 2 devices → data loss | 1-2 weeks |
| **2** | **Supabase Realtime** | 30s polling delay; no instant multi-device sync | 1 week |
| **3** | **Backup/Restore** | No disaster recovery; "clear data" only destroys | 3-5 days |
| **4** | **Barcode/QR Label Printing** | Scanner exists but no label generation | 3-5 days |
| **5** | **Purchase Orders / Suppliers** | Sales-only; no procurement workflow | 2-3 weeks |
| **6** | **Tax Compliance (GST/VAT)** | Basic tax field only; no HSN, tax invoices, GSTR reports | 2-3 weeks |
| **7** | **End-to-End Encryption** | RLS only; data visible to Supabase admin | 1-2 weeks |
| **8** | **Multi-Language (i18n)** | English only; no RTL for MENA/South Asia | 2-3 weeks |

---

## 🚀 Modern POS Features (Today's Competitive Baseline)

| Feature | Business Value | Complexity |
|---------|----------------|------------|
| **Loyalty Program** | +15-30% retention; points, tiers, referrals | Medium |
| **Gift Cards** | High-margin revenue; corporate gifting | Medium |
| **Kitchen Display System (KDS)** | Essential for restaurant profile; real-time routing | Medium |
| **Customer Facing Display** | Upsell ads, transparency, reduce disputes | Low |
| **Payment Terminal Integration** | Stripe Terminal, Adyen, Paytm, Razorpay hardware | Medium |
| **PWA Mobile Companion** | Staff check stock/orders on phone | Medium |
| **AI Demand Forecasting** | Auto-reorder, reduce stockouts/waste | High |
| **Omnichannel Orders** | Web/WhatsApp/Instagram → POS fulfillment | High |
| **Fiscal Printer / Z-Report** | Legal requirement (FR, DE, IN, BR, etc.) | Medium |
| **Subscriptions / Recurring Billing** | SaaS, memberships, recurring orders | Medium |

---

## 📋 Recommended Roadmap

### Phase 1: Production Hardening (2-3 Weeks)

| Task | Description | Acceptance Criteria |
|------|-------------|---------------------|
| **1.1 Conflict Resolution** | Field-level merge with vector clocks / last-write-wins per field; conflict UI for manual resolution | Simultaneous offline edits on 2 devices merge without data loss |
| **1.2 Supabase Realtime** | Subscribe to store-scoped `postgres_changes`; push local changes instantly; fallback to polling | < 500ms sync latency across devices |
| **1.3 Backup/Restore** | Encrypted backup (SQLCipher or `age`) to USB/local/cloud; restore wizard with schema validation | One-click backup → restore on fresh machine works |
| **1.4 Barcode Labels** | Generate Code128/QR labels for products; print on 80mm thermal or Avery sheets | Batch print 100+ labels from Inventory page |
| **1.5 Purchase Orders** | Suppliers table, PO create/receive, landed cost, stock increase on receive | Full procure-to-pay cycle tracked |
| **1.6 Tax Compliance** | GST/VAT fields (HSN/SAC, CGST/SGST/IGST), tax invoice template, GSTR-1/3B export (India) / VAT return (EU) | Accountant can file returns from exports |

---

### Phase 2: Modern POS Features (4-6 Weeks)

| Task | Description | Priority |
|------|-------------|----------|
| **2.1 Loyalty Engine** | Points per ₹, tier rules (Silver/Gold/Platinum), birthday bonus, referral rewards, POS redemption | 🔴 High |
| **2.2 Gift Cards** | Sell/redeem, balance check, expiry, bulk import, physical card numbering | 🔴 High |
| **2.3 Kitchen Display System** | Real-time order routing by category (starters/mains/drinks), bump screen, prep time tracking | 🟠 Med (Restaurant profile) |
| **2.4 Customer Facing Display** | Second screen (HDMI/USB-C) showing cart, promos, QR for loyalty signup | 🟠 Med |
| **2.5 Payment Terminal** | Abstract `PaymentTerminal` interface + Stripe Terminal adapter + local provider plugins | 🟠 Med |
| **2.6 PWA Mobile App** | Installable staff dashboard: stock lookup, order status, customer search, push notifications | 🟠 Med |

---

### Phase 3: Intelligence & Scale (6-8 Weeks)

| Task | Description |
|------|-------------|
| **3.1 AI Demand Forecasting** | Prophet/ARIMA on `orders` → reorder suggestions per product per store |
| **3.2 Anomaly Detection** | Isolation Forest on refunds, voids, discounts → Slack/email alerts |
| **3.3 Omnichannel Sync** | Webhook receiver for Shopify/WooCommerce/Instagram → create orders in POS |
| **3.4 Inter-Store Transfers** | Stock transfer requests, approval, shipping/receiving, audit trail |
| **3.5 Plugin Architecture** | Extension points: UI slots, data models, lifecycle hooks, marketplace |
| **3.6 Accounting Integrations** | Push to QuickBooks, Xero, Tally, Zoho Books via webhooks/API |

---

### Phase 4: Platform & Ecosystem (Ongoing)

| Task | Description |
|------|-------------|
| **4.1 i18n Framework** | `react-i18next` + RTL; ship EN, AR, UR, ES, FR, HI, BN |
| **4.2 Plugin Marketplace** | Curated extensions: loyalty, accounting, e-commerce, CRM, marketing |
| **4.3 White-Labeling** | Configurable branding, custom domain for cloud sync, custom receipt templates |
| **4.4 Partner API** | REST/GraphQL for ERP, CRM, marketing tools; OAuth2 for 3rd-party apps |

---

## ⚡ Quick Wins (Do This Week)

```bash
# 1. Pre-commit hooks + formatting
npm add -D husky lint-staged prettier
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"

# 2. Component + unit testing
npm add -D vitest @testing-library/react @testing-library/user-event jsdom @vitest/ui

# 3. E2E testing
npm add -D @playwright/test
npx playwright install chromium

# 4. GitHub Actions CI
# .github/workflows/ci.yml → build, test, lint, typecheck

# 5. Error tracking (opt-in)
npm add @sentry/electron @sentry/react

# 6. Shared types package (monorepo)
# packages/shared-types/
#   - Zod schemas for all IPC, DB rows, sync payloads
#   - Published as internal npm package
```

---

## 🔧 Architectural Recommendations

### 1. Typed RPC Layer (Replace Raw IPC)
```typescript
// packages/shared-types/src/ipc.ts
import { z } from 'zod';

export const CreateOrderInput = z.object({
  store_id: z.string(),
  customer_id: z.string().optional(),
  items: z.array(OrderItemInput),
  // ...
});

export type CreateOrderInput = z.infer<typeof CreateOrderInput>;
```

```typescript
// electron/main.cjs — use tsrpc or electron-trpc
import { createServer } from 'tsrpc';
import { CreateOrderInput } from '@inventoriman/shared-types';

const server = createServer({ /* ... */ });
server.route('api:orders:create', async (call) => {
  const input = CreateOrderInput.parse(call.req);
  return createOrder(db, input);
});
```

**Benefit**: Compile-time safety across main/renderer; auto-generated TS client.

---

### 2. Event-Driven Sync Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Local DB    │────▶│ Event Bus    │────▶│ Sync Queue      │
│ (better-    │     │ (mitt/       │     │ (IndexedDB +    │
│  sqlite3)   │     │  EventEmitter)     │  SQLite)        │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                  │
                    ┌──────────────┐              │
                    │ Conflict     │◀─────────────┘
                    │ Detector     │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │ Auto-Merge  │           │ Manual      │
       │ (LWW/field) │           │ Resolution  │
       └─────────────┘           └─────────────┘
              │                         │
              └────────────┬────────────┘
                           ▼
                    ┌──────────────┐
                    │ Supabase     │
                    │ Realtime     │
                    └──────────────┘
```

---

### 3. Plugin System Design
```typescript
// packages/core/src/plugins/types.ts
interface POSPlugin {
  name: string;
  version: string;
  uiExtensions: {
    posToolbar?: React.ComponentType<{ cart: CartItem[] }>;
    settingsTabs?: SettingsTab[];
    dashboardWidgets?: Widget[];
    customerProfileTabs?: CustomerTab[];
  };
  dataModels: DataModelDefinition[];
  hooks: {
    onOrderComplete?: (order: Order) => Promise<void>;
    onStockChange?: (productId: string, delta: number) => Promise<void>;
    onCustomerCreate?: (customer: Customer) => Promise<void>;
    onSyncConflict?: (conflict: SyncConflict) => Promise<Resolution>;
  };
  permissions: string[]; // e.g., 'loyalty.manage', 'giftcards.sell'
}
```

**Loading**: Dynamic `import()` at runtime; sandboxed via Electron `UtilityProcess`.

---

### 4. Offline-First Conflict Resolution Strategy
```typescript
interface SyncConflict {
  entityId: string;
  table: string;
  localVersion: Record<string, any>;    // current local state
  remoteVersion: Record<string, any>;   // incoming remote state
  baseVersion: Record<string, any>;     // last known synced state (vector clock)
  timestamp: number;                    // for LWW fallback
}

type MergeStrategy =
  | 'last-write-wins'           // whole record
  | 'field-level-lww'           // per-field timestamp
  | 'crdt'                      // yjs/automerge for collaborative fields
  | 'manual'                    // user decides

function resolveConflict(conflict: SyncConflict, strategy: MergeStrategy): Record<string, any> {
  // Implement per strategy
}
```

---

## 📁 Suggested Repository Structure (Monorepo)

```
inventoriman/
├── apps/
│   ├── desktop/           # Electron + React (current)
│   ├── mobile-pwa/        # Vite + PWA (Phase 2.6)
│   └── admin-dashboard/   # React Admin for multi-store owners (future)
├── packages/
│   ├── core/              # Shared business logic (TS, no framework)
│   │   ├── domain/        # Entities, value objects, domain events
│   │   ├── use-cases/     # Application services (createOrder, etc.)
│   │   └── plugins/       # Plugin system types + runtime
│   ├── shared-types/      # Zod schemas + TS types for IPC, DB, API
│   ├── ui-components/     # Shared React components (Button, Card, etc.)
│   ├── sync-engine/       # Conflict resolution, Realtime client
│   └── licensing/         # License validation, hardware fingerprint
├── tools/
│   ├── build-scripts/     # electron-builder config, notarization
│   └── release/           # Auto-changelog, GitHub release notes
├── .github/
│   └── workflows/         # CI/CD pipelines
└── turbo.json             # Turborepo config (if adopting)
```

---

## 🎯 Decision Matrix: What to Build Next

| If your goal is... | Start with... |
|---------------------|---------------|
| **Sell to retailers today** | Phase 1.3 (Backup), 1.4 (Labels), 1.6 (Tax) |
| **Multi-store SaaS** | Phase 1.1 (Conflicts), 1.2 (Realtime), 3.4 (Transfers) |
| **Restaurant vertical** | Phase 2.3 (KDS), 2.4 (Customer Display), 2.5 (Terminal) |
| **Enterprise/White-label** | Phase 3.5 (Plugins), 4.3 (White-label), 4.4 (Partner API) |
| **Investor demo / Series A** | Phase 2.1 (Loyalty), 3.1 (AI Forecasting), 2.6 (Mobile PWA) |

---

## 📝 Next Steps

> **Choose one** and I'll create a detailed implementation plan with milestones, or start coding:

1. **`Phase 1: Production Hardening`** — Conflict resolution + Realtime + Backup/Restore + Labels + PO + Tax
2. **`Loyalty Program`** — Points, tiers, referrals, POS redemption
3. **`Purchase Orders + Suppliers`** — Full procure-to-pay
4. **`DevEx Upgrade`** — CI/CD, typed RPC, shared types, Vitest + Playwright
5. **`Plugin Architecture`** — Extension points, marketplace foundation
6. **`Detailed SPEC for any above`** — Before implementation

---

*Generated: 2026-06-16 | InventoriMan Architecture Review*