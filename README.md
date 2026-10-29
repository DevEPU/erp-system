# ERP Budgeting System - PT Eran Plastindo Utama

A comprehensive multi-stack budgeting and procurement management system designed for **PT Eran Plastindo Utama**. This project automates the workflow of departmental budget management, purchase requests, and smart approval processing.

## 🚀 Project Overview

The system transitions from a legacy Laravel implementation to a modern Next.js and Express.js architecture, ensuring high performance, responsive UI, and a robust approval engine.

### Key Modules
- **Master Budget**: Centralized management of department budgets with category-level limits.
- **Purchase Requests (PR)**: Automated requisition system with real-time budget verification.
- **Smart Borrowing**: Advanced logic for borrowing budget across categories (Internal) or between departments (External/Over Budget).
- **Approval Engine**: Multi-level transaction tracking (Pending, Approved, Rejected) with full audit logs.
- **Sales Targets**: Dynamic budget calculations linked to monthly sales performance.

---

## 🛠 Tech Stack

### Frontend (`/erp-next`)
- **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: React Hooks & Context
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend (API) (`/erp-express`)
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MySQL](https://www.mysql.com/) via `mysql2` & `Prisma`
- **Auth**: JWT & Bcryptjs

### Legacy Backend (`/budgeting-laravel`)
- **Framework**: [Laravel](https://laravel.com/) (Used for legacy data consistency and parity checks)

---

## 🏗 System Architecture

The project is structured as a monorepo-style workspace:

```text
/
├── erp-next/          # Next.js Frontend (Port 5555)
├── erp-express/       # Express API Backend (Port 5656)
├── erp-laravel (Archive)/ # Legacy Laravel Service
└── README.md          # This documentation
```

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PHP & Composer (for Laravel legacy)
- MySQL Server

### 1. Setup Backend (Express)
```bash
cd erp-express
npm install
# Configure your .env (DB credentials, JWT_SECRET, etc.)
node server.js
```

### 2. Setup Frontend (Next.js)
```bash
cd erp-next
npm install
# Configure your .env (NEXT_PUBLIC_API_URL pointing to Express port 5656)
npm run dev
```

### 3. Setup Legacy Service (Optional)
```bash
cd budgeting-laravel
composer install
php artisan serve --port=5454
```

---

## 💡 Features in Detail

### Smart Budget Verification
When a user creates a Purchase Request, the system automatically:
1. Validates available balance in the specific Category.
2. Checks if the budget is "Mandatory" or "Others".
3. Provides a **Borrowing UI** if the balance is insufficient, allowing users to safely pull funds from other categories or departments.

### Responsive UI
Built with a "Rich Aesthetics" philosophy:
- **Glassmorphism**: Sleek modal designs and blurred backdrops.
- **Micro-animations**: Smooth transitions for loading states and button interactions.
- **Dark/Light Harmony**: Premium color palettes tailored for industrial ERP usage.

---

## 📄 License
This project is private and proprietary to **PT Eran Plastindo Utama**.

---
