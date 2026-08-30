# Nathshikha Handmade Jewellery — Modular Client & Server Build

Handcrafted Maharashtrian luxury jewellery e-commerce application featuring Peshwai craft aesthetics, guest & customer checkout, UPI payment verification with live QR generation, customer order tracking, and a private studio admin dashboard.

---

## Folder Structure

```
├── public/
│   ├── assets/                 # Brand assets, logos, and mandala graphics
│   └── uploads/                # Dynamic product image uploads
├── server/
│   ├── create-admin.js         # Interactive CLI to create/update studio admin
│   ├── index.js                # Express REST API & SQLite database
│   └── store.db                # SQLite database (auto-seeded on first run)
├── src/
│   ├── components/             # Modular, reusable UI components with separate CSS
│   │   ├── admin/              # AdminStats, AdminProductForm, AdminProductList, AdminOrderList, AdminPaymentList
│   │   ├── common/             # TopBar, Header, Footer, SectionTitle, ScrollToTop, RouteErrorBoundary, Toast, ProtectedRoute
│   │   ├── home/               # Hero carousel, CategoryGrid, Testimonials, Features
│   │   └── product/            # ProductCard, SearchPanel
│   ├── context/                # React state context providers
│   │   ├── AuthContext.jsx     # Customer & Admin isolated session management
│   │   ├── CartContext.jsx     # Cart & Wishlist with localStorage sync
│   │   └── ToastContext.jsx    # Global notification alerts
│   ├── pages/                  # Route views with individual dedicated CSS
│   │   ├── About/              # Brand story & craftsmanship
│   │   ├── Account/            # Customer account hub
│   │   ├── Admin/              # AdminLogin, AdminDashboard, AdminGate
│   │   ├── Auth/               # Customer login & registration
│   │   ├── Cart/               # Shopping bag & price summary
│   │   ├── Category/           # Category filter view
│   │   ├── Checkout/           # Guest/customer delivery form & UPI QR payment
│   │   ├── Home/               # Landing page showcase
│   │   ├── NotFound/           # 404 handler
│   │   ├── Orders/             # Customer order tracking timeline
│   │   ├── OrderSuccess/       # Order confirmation & WhatsApp action
│   │   ├── Product/            # Product detail view
│   │   ├── Shop/               # All jewellery catalogue with sorting
│   │   └── Wishlist/           # Saved favourites
│   ├── services/
│   │   └── api.js              # Fetch client with auto auth header injection
│   ├── styles/
│   │   ├── variables.css       # Design tokens (Maroon, Gold, Cream, Typography)
│   │   └── global.css          # CSS reset, base elements & button styles
│   ├── utils/
│   │   └── formatters.js       # Indian Rupee currency formatting (₹)
│   ├── App.css                 # Main app container styling
│   ├── App.jsx                 # Routing table and layout shell
│   └── main.jsx                # Application root mount
├── .env.example
├── .env
├── index.html
├── package.json
└── vite.config.js
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and set your desired values:
```env
PORT=4000
JWT_SECRET=your-secret-key
UPI_ID=shwetadarekar04-1@okhdfcbank
ADMIN_EMAIL=admin@nathshikha.local
ADMIN_PASSWORD=your-secure-password
VITE_UPI_ID=shwetadarekar04-1@okhdfcbank
```

### 3. Create Studio Admin
```bash
npm run create-admin
```

### 4. Run Development Servers
```bash
# Run both API backend & Vite frontend concurrently
npm run dev:all

# Or run separately:
# Terminal 1: npm run server
# Terminal 2: npm run client
```

- **Frontend Store**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`
- **Studio Admin**: `http://localhost:5173/admin/login`

---

## Production Build

```bash
npm run build
```
The compiled SPA is output to `dist/` and automatically served by Express in production mode.
