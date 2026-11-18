const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 2121;

// 2. CORS
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (origin.indexOf('localhost') !== -1 || origin.indexOf('127.0.0.1') !== -1) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

// Request Logger
app.use((req, res, next) => {
    console.log(`[EXPRESS REQUEST] ${req.method} ${req.url}`);
    next();
});

// Use express.json() with error handling for malformed JSON
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      console.error('JSON Parsing Error:', err.message);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    next();
  });
});

// Import Routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/user');
const roleRoutes = require('./src/routes/role');
const masterRoutes = require('./src/routes/master');
const productRoutes = require('./src/routes/product');
const budgetRoutes = require('./src/routes/budget');
const approvalRoutes = require('./src/routes/approval');
const homeRoutes = require('./src/routes/home');
const purchaseRoutes = require('./src/routes/purchase');
const reportRoutes = require('./src/routes/report');
const productRequestRoutes = require('./src/routes/productRequest');
const permissionRoutes = require('./src/routes/permission');
const supplierRoutes = require('./src/routes/supplier');
const purchaseOrderRoutes = require('./src/routes/purchaseOrder');
const goodsReceiptRoutes = require('./src/routes/goodsReceipt');
const purchaseInvoiceRoutes = require('./src/routes/purchaseInvoice');
const purchasePaymentRoutes = require('./src/routes/purchasePayment');
const settingsRoutes = require('./src/routes/settings');
const warehouseRoutes = require('./src/routes/warehouse');
const salesRoutes = require('./src/routes/sales');
const manufacturingRoutes = require('./src/routes/manufacturing');
const stockOpnameRoutes = require('./src/routes/stockOpname');
const adjustmentRoutes = require('./src/routes/adjustment');
const vendorScheduleRoutes = require('./src/routes/vendorSchedule');
const activityLogRoutes = require('./src/routes/activityLog');
const errorLogRoutes = require('./src/routes/errorLog');
const employeeRoutes = require('./src/routes/employee');


app.use('/api', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/error-logs', errorLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api', masterRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/product-requests', productRequestRoutes);
app.use('/api', budgetRoutes);
app.use('/api', approvalRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/goods-receipts', goodsReceiptRoutes);
app.use('/api/purchase-invoices', purchaseInvoiceRoutes);
app.use('/api/purchase-payments', purchasePaymentRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/references', require('./src/routes/reference'));
app.use('/api/bank-accounts', require('./src/routes/bankAccount'));
app.use('/api', reportRoutes);
app.use('/api', salesRoutes);
app.use('/api/manufacturing', manufacturingRoutes);
app.use('/api/stock-opnames', stockOpnameRoutes);
app.use('/api/adjustments', adjustmentRoutes);
app.use('/api/vendor-schedules', vendorScheduleRoutes);
app.use('/api/receipt-by-schedule', require('./src/routes/receiptBySchedule'));
app.use('/api/internal-transfers', require('./src/routes/internalTransfer'));
app.use('/api/ng-disposals', require('./src/routes/ngDisposal'));
app.use('/api/export', require('./src/routes/exportRoutes'));
app.use('/api/employees', employeeRoutes);

// Main Route (Health Check)
app.get('/', (req, res) => {
    res.json({ message: "Welcome to Budgeting Express API" });
});

// Database Test
const db = require('./src/config/db');
db.getConnection().then(connection => {
    console.log('Database connected successfully to port 3306');
    connection.release();
}).catch(err => {
    console.error('Database connection failed', err);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('================================================');
    console.log(`Server is running on port ${PORT}`);
    console.log('DIAGNOSTIC: PO CONTROLLER V3 LOADED');
    console.log('================================================');
});
