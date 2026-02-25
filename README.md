# 🏢 Universal Offline-First SaaS POS System

An enterprise-grade, scalable **Desktop POS + Cloud SaaS platform** designed for diverse retail environments. Built for speed, resilience, and multi-branch management.

## 🧠 Core Philosophy

- **Offline-First**: 100% functional without an active internet connection. Sales are lightning-fast and never blocked by network latency.
- **Cloud-Enhanced**: Synchronization adds centralized analytics, multi-branch control, and real-time dashboard updates without becoming a bottleneck.

## 🏗 System Architecture

```
Desktop Application (Electron)
 ├── UI: React with Cyber-Glass Aesthetic
 ├── Database: Local SQLite (Encrypted)
 ├── Sync Engine: Change-Log Based (UUID v4)
 └── Hardware: QR/Barcode Scanning & Thermal Printing

Cloud Backend (Planned)
 ├── API: Node.js / PostgreSQL
 ├── Cache: Redis for Real-time Performance
 └── Messaging: WebSocket for Instant Sync
```

## ✨ Key Features

### 🛒 Point of Sale (POS)

- **High Performance**: Cart management and checkout in milliseconds.
- **Multi-Unit Logic**: Specialized support for unstitched fabric (Suits/Meters) and standard items.
- **Interactive Price Editing**: Manager-approved retail price overrides with wholesale price protection.
- **Professional Receipts**: Thermal-style receipts with custom branding, QR codes, and PKR support.

### 📦 Inventory & Logistics

- **Precision Tracking**: Multi-roll stock management and design-based categorization.
- **Bulk Operations**: Intelligent CSV Import tool with auto-brand creation.
- **Audit Trails**: Complete stock ledger logs for every gram/meter of movement.
- **QR Eco-system**: Generate and scan product labels for instant checkout.

### 👤 Management & Security

- **RBAC**: Role-Based Access Control (Owner, Manager, Cashier) with PIN-based login.
- **Staff Analytics**: Performance tracking and specialized permission guardrails.
- **Danger Zone**: Multi-step protected resets for inventory and history.

### 📊 Intelligence

- **Real-time Visualization**: Sales trends, brand distribution, and profitability charts using Recharts.
- **Compliance**: Daily/Weekly/Monthly reports with Tax and NTN support.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development environment (Vite + Electron):
   ```bash
   npm run dev:electron
   ```

## 🎯 Development Roadmap

- [x] **Phase 1**: Core Offline Desktop POS & Local DB
- [/] **Phase 2**: Cloud SaaS Backend & Multi-tenant API
- [/] **Phase 3**: Bidirectional Sync Engine
- [ ] **Phase 4**: WebSocket Real-time Mobile Scanning
- [ ] **Phase 5**: Mobile App Integration (iOS/Android)

---

_Built for the next generation of retailers._
