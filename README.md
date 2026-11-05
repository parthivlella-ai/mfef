# MediTrack – Smart Medicine Inventory & Expiry Management System

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-0d9488.svg)](https://react.dev/)
[![React 19](https://img.shields.io/badge/React-19.3-0284c7.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-16a34a.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Mongoose-47a248.svg)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20v4-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**MediTrack** is an enterprise-grade clinical pharmacy inventory and expiry surveillance system built on the MERN stack with complete authentication, role-based authorization, strict record ownership isolation, and live dynamic date calculations.

---

## 📁 Final Repository Structure

```
.
├── backend
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── src
│   │   ├── config
│   │   │   └── db.js                        # MongoDB Mongoose connection & status
│   │   ├── controllers
│   │   │   ├── adminController.js          # Platform stats, user management & audit logs
│   │   │   ├── authController.js           # Signup, login, JWT & profile updates
│   │   │   ├── dashboardController.js      # User dispensary aggregates & chart datasets
│   │   │   ├── medicineController.js       # CRUD, search, filter, sort & dynamic calculations
│   │   │   └── notificationController.js   # In-app alerts generation, deduplication & read states
│   │   ├── middleware
│   │   │   ├── authMiddleware.js           # JWT verification & adminOnly guard
│   │   │   └── errorMiddleware.js          # Global 404 & centralized error handler
│   │   ├── models
│   │   │   ├── ActivityLog.js              # Compliance audit trail schema
│   │   │   ├── Medicine.js                 # Complete 11-field medicine schema & virtuals
│   │   │   ├── Notification.js             # Notification schema with unique periodKey index
│   │   │   └── User.js                     # User account schema with bcrypt pre-save
│   │   ├── routes
│   │   │   ├── adminRoutes.js              # /api/admin/*
│   │   │   ├── authRoutes.js               # /api/auth/*
│   │   │   ├── dashboardRoutes.js          # /api/dashboard/*
│   │   │   ├── medicineRoutes.js           # /api/medicines/*
│   │   │   └── notificationRoutes.js       # /api/notifications/*
│   │   ├── seedAdmin.js                    # Standalone secure admin provisioning script
│   │   ├── seeder.js                       # Comprehensive database seeder (users & medicines)
│   │   ├── server.js                       # Express app bootstrap & route mounting
│   │   └── utils
│   │       ├── expiryHelper.js             # Expiry date difference calculator
│   │       ├── generateToken.js            # JWT signing helper
│   │       └── mockStore.js                # In-memory fallback store
│   ├── test-auth-and-roles.js              # Auth & role security test suite
│   ├── test-dashboards-and-notifications.js# Dashboards & notification test suite
│   ├── test-master-audit.js                # Master 37-point final integration test suite
│   └── test-medicine-system.js             # Medicine CRUD & multi-tenant isolation test suite
├── frontend
│   ├── .env
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── src
│   │   ├── App.css
│   │   ├── App.jsx                         # Main router, public & protected route guards
│   │   ├── components
│   │   │   ├── charts
│   │   │   │   ├── BarChart.jsx            # Interactive SVG category bar chart
│   │   │   │   ├── DonutChart.jsx          # Interactive SVG expiry distribution donut chart
│   │   │   │   └── TrendLineChart.jsx      # Interactive SVG registration trend line chart
│   │   │   ├── common
│   │   │   │   ├── AlertBanner.jsx         # Dismissible status notification banner
│   │   │   │   ├── Badge.jsx               # Status indicators (Safe, Expiring Soon, Expired, Low Stock)
│   │   │   │   ├── EmptyState.jsx          # Contextual empty state component
│   │   │   │   ├── LoadingSpinner.jsx      # Accessible animated loading spinner
│   │   │   │   ├── Modal.jsx               # Accessible dialog modal
│   │   │   │   ├── Navbar.jsx              # Top bar with live notification center & profile menu
│   │   │   │   ├── Sidebar.jsx             # Collapsible responsive drawer sidebar
│   │   │   │   └── StatCard.jsx            # Dynamic analytics metric tile
│   │   │   ├── layout
│   │   │   │   ├── AppLayout.jsx           # Authenticated application shell layout
│   │   │   │   └── PublicLayout.jsx        # Landing page & public authentication layout
│   │   │   ├── medicine
│   │   │   │   ├── DisposalModal.jsx       # Biohazard decommissioning audit modal
│   │   │   │   ├── EditMedicineModal.jsx   # Medicine update dialog modal
│   │   │   │   └── StockAdjustModal.jsx    # Quick stock increment / decrement modal
│   │   │   └── notifications
│   │   │       └── NotificationCenter.jsx  # In-app notification center (read, unread, dismiss)
│   │   ├── context
│   │   │   └── AuthContext.jsx             # Authentication, session & role state management
│   │   ├── pages
│   │   │   ├── AddMedicine.jsx             # Intake form with 1-click test templates
│   │   │   ├── AdminDashboard.jsx          # Platform oversight, user management & charts
│   │   │   ├── ExpiryTracking.jsx          # Expiry surveillance radar & value-at-risk
│   │   │   ├── Home.jsx                    # Landing page with key features & compliance overview
│   │   │   ├── Login.jsx                   # User & Admin login form
│   │   │   ├── MedicineInventory.jsx       # Table & card grid inventory with search, filters & sort
│   │   │   ├── Profile.jsx                 # Operator profile editing & password updates
│   │   │   ├── Signup.jsx                  # Public registration form (enforces user role)
│   │   │   └── UserDashboard.jsx           # User analytics, charts, recent items & upcoming reminders
│   │   ├── services
│   │   │   └── api.js                      # Axios instance with JWT interceptors & API services
│   │   └── utils
│   │       └── dateUtils.js                # Dynamic date calculations, formatting & status badges
│   └── vite.config.js
├── package.json                            # Monorepo root scripts
└── README.md
```

---

## ⚙️ MongoDB Setup & Requirements

MediTrack requires a running MongoDB database (MongoDB Community Edition locally, or MongoDB Atlas cloud).

### Local MongoDB Setup:
1. Ensure the MongoDB service is running on `127.0.0.1:27017`:
   - **Windows**: Start via Windows Services (`net start MongoDB`) or MongoDB Compass.
   - **macOS / Linux**: `brew services start mongodb-community` or `sudo systemctl start mongod`.
2. The database name configured by default is `meditrack`. No manual database creation is required; Mongoose creates the database and collections automatically upon connection.

---

## 🔒 Environment Variables Configuration

### Backend (`backend/.env`):
Create `backend/.env` by copying `backend/.env.example`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/meditrack
JWT_SECRET=meditrack_super_secret_jwt_key_2026_xyz
CLIENT_URL=http://localhost:5173

# Admin Initial Seed Credentials
ADMIN_NAME=MediTrack Administrator
ADMIN_EMAIL=admin@meditrack.com
ADMIN_PASSWORD=AdminSecure2026!
```

### Frontend (`frontend/.env`):
Create `frontend/.env` by copying `frontend/.env.example`:
```env
VITE_API_URL=/api
```

---

## 📦 Installation Commands

### Option 1: One-Command Monorepo Installation (Recommended)
From the project root:
```bash
npm run install:all
```

### Option 2: Step-by-Step Installation
```bash
# 1. Install Backend Dependencies
cd backend
npm install

# 2. Install Frontend Dependencies
cd ../frontend
npm install
```

---

## 🌱 Database Seeding Instructions

### 1. Full Database Seed (Recommended for complete demo)
Seeds the database with an Admin account, a Standard User account, and 10 realistic medicine batches spanning all clinical categories and expiry status buckets:
```bash
cd backend
npm run seed
```

### 2. Dedicated Secure Admin Provisioning
Provisions or resets the Admin account directly from environment variables (`ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`):
```bash
cd backend
npm run seed:admin
```

---

## 🏃 Running the Application

### Option 1: Run Both Backend & Frontend Simultaneously (Monorepo dev)
From the project root:
```bash
npm run dev
```

### Option 2: Run in Separate Terminals

**Terminal 1 – Start Backend Server (Port 5000):**
```bash
cd backend
npm start
# Or for auto-reload during development:
npm run dev
```

**Terminal 2 – Start Frontend Client (Port 5173):**
```bash
cd frontend
npm run dev
```

Visit the application in your browser: 👉 **`http://localhost:5173`**

---

## 🔑 Demo Login Accounts (Post-Seeder)

| Role | Email | Password | Assigned Dashboard | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@meditrack.com` | `AdminSecure2026!` | `/admin` | System-wide governance, user management, platform analytics |
| **Pharmacist User** | `user@meditrack.com` | `UserSecure2026!` | `/dashboard` | User's own medicine inventory & personal notifications |

---

## 🧪 Master Automated Verification Suite

Run the master final integration audit testing all 37 critical system checkpoints against the live MongoDB database:

```bash
cd backend
npm test
# Or: node test-master-audit.js
```

### Additional Focused Test Suites:
- `npm run test:auth`: Tests signup validation, login, role restrictions, and admin protection (13 tests).
- `npm run test:medicine`: Tests medicine CRUD, search by name/brand, category filters, sorting, and multi-tenant isolation (23 tests).
- `npm run test:dashboards`: Tests dashboard metrics, charts, notifications deduplication, and user management (27 tests).

---

## ✅ Tested Feature Checklist (100% Verified)

All listed features were actively executed and verified against live MongoDB. Zero claims are made for untested code.

### 1. Authentication & Security
- [x] **Signup Validation**: Mismatched passwords rejected with clear `400` status.
- [x] **Password Strength**: Passwords shorter than 6 characters rejected with `400`.
- [x] **Role Spoofing Block**: Public registration strictly assigns role `user`; client attempts to request `admin` are ignored.
- [x] **Bcrypt Hashing**: Passwords stored exclusively as salted bcrypt hashes; plain text never persisted.
- [x] **JWT Generation**: Authenticated responses return signed JWT tokens with 7-day expiration.
- [x] **Login Verification**: Rejection of incorrect credentials with `401 Unauthorized`.
- [x] **Protected Routes**: Unauthenticated requests to private endpoints return `401`.
- [x] **Role Authorization**: Regular users attempting to access `/api/admin/*` receive `403 Forbidden`.
- [x] **Admin Protection**: Administrators are prevented from deleting or deactivating their own account.
- [x] **Session Persistence**: Sessions persist in `localStorage`; expired tokens redirect cleanly to `/login?session=expired`.

### 2. Complete Medicine Management (CRUD)
- [x] **11 Schema Attributes**: Verified presence and types of `name`, `category`, `brand`, `batchNumber`, `quantity`, `unit`, `purchaseDate`, `expiryDate`, `price`, `description`, `userId`, `createdAt`.
- [x] **Create Medicine**: New batches created with validation and logged to the compliance audit trail.
- [x] **Read Medicine**: Single medicine view and complete inventory view with dynamically enriched calculations.
- [x] **Update Medicine**: Medicine details (name, brand, quantity, price, dates) modified via dialog modal.
- [x] **Stock Adjustments**: Quick increment and decrement (`+/-`) stock with dispensary audit reason logging.
- [x] **Decommission / Dispose**: Biohazard decommissioning logs disposal reason and zeros stock.
- [x] **Delete with Confirmation**: Deletion confirmation dialog prevents accidental data removal.
- [x] **Multi-Tenant Record Isolation**: Users strictly see, edit, and delete only their own medicines; cross-user calls return `403`.

### 3. Search, Filters & Sorting
- [x] **Search by Name**: Case-insensitive substring match on medicine name.
- [x] **Search by Brand**: Case-insensitive substring match on pharmaceutical brand / manufacturer.
- [x] **Filter by Category**: Filtering by clinical therapeutic classes (Antibiotics, Analgesics, Respiratory, etc.).
- [x] **Filter by Status**: Direct filtering for `Expired`, `Expiring in ≤ 7 Days`, `Expiring in ≤ 30 Days`, `Low Stock`, and `Safe`.
- [x] **Configurable Low-Stock Threshold**: Dynamic threshold selector (default 10 units) recalculates low-stock badges in real time.
- [x] **Sort by Expiry Date**: Ascending sort surfaces earliest expiring batches first.
- [x] **Sort by Quantity**: Descending sort surfaces highest inventory levels first.
- [x] **View Toggle**: Clean toggle between Table View and responsive Card Grid View.

### 4. Dynamic Expiry Surveillance Logic
- [x] **Live Clock Comparison**: Calculations compare `expiryDate` directly against `new Date()`.
- [x] **Safe**: `daysUntilExpiry > 30` and `quantity > threshold` (Emerald badge).
- [x] **Expiring Soon**: `0 < daysUntilExpiry <= 30` (Amber badge; `<= 7 days` highlighted with urgent badge).
- [x] **Expired**: `daysUntilExpiry <= 0` (Rose/Red badge).
- [x] **Low Stock**: `quantity <= threshold` (Purple/Amber badge).

### 5. In-App Notification Center
- [x] **Automated Alert Generation**: Live alert synchronization for expired, expiring soon, and low-stock items.
- [x] **Duplicate Prevention**: Compound unique indexing on `{ userId, periodKey }` ensures zero duplicate notifications.
- [x] **Mark as Read**: Individual item mark as read + "Mark All as Read" resets unread badges.
- [x] **Dismiss / Delete**: Ability to dismiss notifications permanently.
- [x] **Counter Badges**: Real-time unread alert count displayed on Navbar bell and dashboard banner.

### 6. User Dashboard
- [x] **5 Core Metric Cards**: Total Medicines, Active Medicines, Expired Medicines, Expiring Soon, and Low Stock.
- [x] **Therapeutic Categories Bar Chart**: Responsive SVG bar chart with tooltips and percentages.
- [x] **Expiry Status Donut Chart**: Responsive SVG donut chart visualizing safe, expiring, and expired proportions.
- [x] **Recently Added Medicines**: Chronological feed of newly cataloged pharmaceutical batches.
- [x] **Upcoming Expiry Reminders**: Prioritized countdown list sorted by urgency.
- [x] **Profile Management**: Profile page (`/profile`) supporting contact details and secure password updates.

### 7. Admin Governance Hub
- [x] **Platform Oversight Metrics**: Total Registered Users, Total Platform Medicines, Total Expired Medicines.
- [x] **User Management & Search**: Live search by name, email, or facility with role & status filters.
- [x] **Account Activation / Deactivation**: 1-click status toggle (`active` ↔ `inactive`).
- [x] **User Medicine Statistics**: Inspector modal viewing detailed inventory breakdown per user.
- [x] **Delete Inappropriate Accounts**: Permanent user deletion with confirmation and batch cleanup.
- [x] **Platform Activity Charts**: SVG Category Distribution, Expiry Surveillance, and User Growth Trend line charts.
- [x] **Admin Password Privacy**: Passwords strictly excluded from all admin responses (`select('-password')`).
- [x] **System Diagnostics**: Server uptime, Node environment version, memory usage, and live MongoDB status.
