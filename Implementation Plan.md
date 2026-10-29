# Manufacturing ERP Planning Flow

## Customer → Order Sheet → MPP → MRP

---

# 1. OVERVIEW

Sistem ini dirancang untuk mengintegrasikan proses:

* Customer Forecast
* Customer PO
* Sales Planning
* Production Planning
* Material Planning
* Purchasing Process

Tujuan utama:

* Mengontrol demand customer
* Menyesuaikan kapasitas produksi
* Mengontrol kebutuhan material
* Mengurangi overstock dan shortage
* Mempermudah planning antar departemen
* Meningkatkan akurasi produksi

---

# 2. BUSINESS FLOW OVERVIEW

```text
CUSTOMER
   │
   ├── Forecast
   └── PO
          │
          ▼
MARKETING / SALES
          │
          ▼
ORDER SHEET
          │
          ├── Deviasi Monitoring
          │
          ▼
MPP
(Master Production Planning)
          │
          ├── Production Plan
          ├── Machine Plan
          ├── Work Order
          │
          ▼
MRP
(Material Requirement Planning)
          │
          ├── Material Calculation
          ├── Auto PR
          │
          ▼
PURCHASING
          │
          ▼
SUPPLIER
```

---

# 3. CUSTOMER MODULE

## Purpose

Mengelola seluruh data demand customer sebagai dasar planning produksi.

---

## Features

### Customer Forecast

Customer memberikan estimasi kebutuhan bulanan.

### Customer PO

Customer memberikan actual purchase order.

### Delivery Schedule

Mengatur jadwal pengiriman customer.

### Customer Claim

Monitoring complaint dan defect customer.

---

## Main Data

| Field         | Description       |
| ------------- | ----------------- |
| Customer Code | Kode customer     |
| Forecast Qty  | Estimasi demand   |
| PO Qty        | Actual order      |
| Delivery Date | Jadwal pengiriman |
| Product Code  | Produk customer   |

---

# 4. MARKETING / SALES MODULE

## Purpose

Mengelola balancing antara Forecast dan Actual PO.

---

# ORDER SHEET

Order Sheet adalah planning internal perusahaan yang digunakan sebagai dasar:

* Production Planning
* Capacity Planning
* Material Planning

---

## ORDER SHEET FLOW

```text
Customer Forecast
        │
        ├── Historical Analysis
        ├── Customer Communication
        ├── Sales Adjustment
        │
        ▼
     Order Sheet
```

---

## ORDER SHEET FUNCTIONS

| Function             | Description            |
| -------------------- | ---------------------- |
| Demand Planning      | Estimasi demand aktual |
| Sales Adjustment     | Penyesuaian forecast   |
| Production Reference | Acuan produksi         |
| MPP Reference        | Dasar MPP              |
| MRP Reference        | Dasar MRP              |

---

# 5. DEVIASI MONITORING

## Purpose

Mengukur akurasi forecast dan actual demand.

---

# DEVIASI FLOW

```text
Forecast
    │
    ├── Compare
    ▼
Order Sheet
    │
    ├── Compare
    ▼
PO Actual
```

---

# DEVIASI TYPES

## 1. Forecast vs Order Sheet

Mengukur akurasi sales planning.

### Formula

```text
((Order Sheet - Forecast) / Forecast) x 100%
```

---

## 2. Order Sheet vs PO Actual

Mengukur realisasi actual order customer.

### Formula

```text
((PO Actual - Order Sheet) / Order Sheet) x 100%
```

---

## 3. Forecast vs PO Actual

Mengukur akurasi forecasting customer.

### Formula

```text
((PO Actual - Forecast) / Forecast) x 100%
```

---

# 6. MPP MODULE

# MASTER PRODUCTION PLANNING

---

# PURPOSE

MPP digunakan untuk menentukan:

* Apa yang diproduksi
* Berapa qty produksi
* Kapan produksi dilakukan
* Mesin mana yang digunakan
* Shift produksi

---

# MPP INPUT

| Source              | Description          |
| ------------------- | -------------------- |
| Order Sheet         | Demand planning      |
| Machine Capacity    | Kapasitas mesin      |
| Current FG Stock    | Stock finished goods |
| Production Calendar | Jadwal produksi      |
| Delivery Schedule   | Jadwal pengiriman    |

---

# MPP FLOW

```text
Order Sheet
     │
     ▼
Master Production Planning
     │
     ├── Production Qty Planning
     ├── Machine Capacity Planning
     ├── Shift Planning
     ├── Mold Planning
     ├── Delivery Planning
     │
     ▼
Production Schedule
     │
     ├── Daily Production Plan
     ├── Weekly Production Plan
     ├── Work Order
     │
     ▼
Production Department
```

---

# MPP OUTPUT

| Output              | Description        |
| ------------------- | ------------------ |
| Production Schedule | Jadwal produksi    |
| Work Order          | Instruksi produksi |
| Machine Allocation  | Alokasi mesin      |
| Shift Planning      | Jadwal operator    |
| Production Target   | Target produksi    |

---

# MPP FEATURES

* Production Planning
* Machine Planning
* Shift Planning
* Capacity Monitoring
* Work Order Generation
* Production Monitoring
* Mold Allocation
* Overtime Planning

---

# 7. MRP MODULE

# MATERIAL REQUIREMENT PLANNING

---

# PURPOSE

MRP digunakan untuk menghitung kebutuhan material berdasarkan production planning.

---

# MRP INPUT

| Source         | Description               |
| -------------- | ------------------------- |
| MPP            | Production schedule       |
| BOM            | Bill of Material          |
| Current Stock  | Stock material            |
| Safety Stock   | Minimum stock             |
| Lead Time      | Waktu kedatangan material |
| Outstanding PO | PO yang belum datang      |

---

# MRP FLOW

```text
MPP
 │
 ├── Production Schedule
 ├── BOM
 ├── Stock Analysis
 ├── Lead Time Analysis
 │
 ▼
Material Requirement Planning
 │
 ├── Resin Requirement
 ├── Masterbatch Requirement
 ├── Additive Requirement
 ├── Packaging Requirement
 │
 ▼
Purchase Request
 │
 ├── PR Auto Generate
 ├── Purchase Planning
 ├── Incoming Schedule
 │
 ▼
Purchasing
```

---

# MRP PROCESS

## Step 1 — BOM Explosion

Menghitung kebutuhan material berdasarkan BOM.

---

## Step 2 — Stock Checking

Membandingkan kebutuhan material dengan stock existing.

---

## Step 3 — Safety Stock Validation

Memastikan stock minimum tetap aman.

---

## Step 4 — Lead Time Planning

Menghitung kapan material harus dibeli.

---

## Step 5 — PR Generation

Generate Purchase Request otomatis.

---

# MRP OUTPUT

| Output               | Description            |
| -------------------- | ---------------------- |
| Material Requirement | Kebutuhan material     |
| Purchase Request     | Permintaan pembelian   |
| Incoming Schedule    | Jadwal material datang |
| Material Shortage    | Kekurangan material    |
| Material Projection  | Proyeksi stock         |

---

# 8. INTEGRATION FLOW

---

# SALES TO PRODUCTION FLOW

```text
Customer Forecast
        │
        ▼
Customer PO
        │
        ▼
Order Sheet
        │
        ▼
MPP
        │
        ▼
Work Order
        │
        ▼
Production
```

---

# PRODUCTION TO MATERIAL FLOW

```text
MPP
    │
    ▼
MRP
    │
    ├── BOM Explosion
    ├── Stock Validation
    ├── Safety Stock Check
    │
    ▼
Purchase Request
    │
    ▼
Purchasing
    │
    ▼
Supplier
```

---

# 9. DATABASE DESIGN RECOMMENDATION

---

# MASTER TABLES

```text
customers
products
materials
machines
suppliers
bom
```

---

# TRANSACTION TABLES

```text
customer_forecasts
customer_po
order_sheets
order_sheet_details
mpp_headers
mpp_details
work_orders
mrp_results
purchase_requests
purchase_orders
```

---

# 10. DASHBOARD RECOMMENDATION

---

# SALES DASHBOARD

* Forecast Accuracy
* PO Achievement
* Order Sheet Achievement
* Customer Demand Trend

---

# MPP DASHBOARD

* Production Target
* Machine Utilization
* Capacity Usage
* Production Achievement

---

# MRP DASHBOARD

* Material Requirement
* Stock Projection
* Material Shortage
* Incoming Material Schedule

---

# 11. FUTURE DEVELOPMENT

---

# PHASE 1

* Forecast
* Customer PO
* Order Sheet
* Basic MPP

---

# PHASE 2

* Advanced MRP
* Auto PR
* BOM Explosion
* Safety Stock Monitoring

---

# PHASE 3

* IoT Machine Monitoring
* OEE Monitoring
* Real-Time Production
* Reject Monitoring

---

# PHASE 4

* AI Forecasting
* Predictive Material Planning
* Smart Scheduling
* Auto Capacity Balancing

---

# 12. CONCLUSION

Sistem ini merupakan integrated manufacturing planning system yang menghubungkan:

* Customer Demand
* Sales Planning
* Production Planning
* Material Planning
* Purchasing Process

melalui konsep:

* Forecast Management
* Order Sheet Planning
* MPP
* MRP
* Deviasi Monitoring

untuk mendukung pengembangan:

* Manufacturing ERP
* Smart Factory
* Production Monitoring System
* MES Integration
* Real-Time Manufacturing Analytics
