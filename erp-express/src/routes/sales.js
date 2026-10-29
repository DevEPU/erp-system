const express = require('express');
const router = express.Router();
const c = require('../controllers/salesController');
const auth = require('../middleware/auth');

// ── Customers ─────────────────────────────────────────────────
router.get('/customers-list', auth, c.getCustomerList);
router.get('/customers', auth, c.getCustomers);
router.get('/customers/:id', auth, c.getCustomerById);
router.post('/customers', auth, c.createCustomer);
router.put('/customers/:id', auth, c.updateCustomer);
router.delete('/customers/:id', auth, c.deleteCustomer);

// ── Forecast ────────────────────────────────────────────────────
router.get('/forecasts', auth, c.getForecasts);
router.get('/forecasts/:id', auth, c.getForecastById);
router.post('/forecasts', auth, c.createForecast);
router.put('/forecasts/:id', auth, c.updateForecast);
router.delete('/forecasts/:id', auth, c.deleteForecast);

// ── Customer PO ─────────────────────────────────────────────────
router.get('/customer-po', auth, c.getCustomerPOs);
router.get('/customer-po/forecast-items', auth, c.getForecastItemsForPO);   // pull forecast
router.get('/customer-po/:id', auth, c.getCustomerPOById);
router.post('/customer-po', auth, c.createCustomerPO);
router.put('/customer-po/:id', auth, c.updateCustomerPO);
router.delete('/customer-po/:id', auth, c.deleteCustomerPO);

// ── Order Sheet ─────────────────────────────────────────────────
router.get('/order-sheets', auth, c.getOrderSheets);
router.get('/order-sheets/po-items', auth, c.getPOItemsForOrderSheet);      // pull CPO
router.get('/order-sheets/:id', auth, c.getOrderSheetById);
router.post('/order-sheets', auth, c.createOrderSheet);
router.put('/order-sheets/:id', auth, c.updateOrderSheet);
router.delete('/order-sheets/:id', auth, c.deleteOrderSheet);

// ── Tutup Pending SO ────────────────────────────────────────────
router.get('/tutup-pending-so', auth, c.getTutupPendingSo);
router.get('/tutup-pending-so/:id', auth, c.getTutupPendingSoById);
router.post('/tutup-pending-so', auth, c.createTutupPendingSo);
router.put('/tutup-pending-so/:id', auth, c.updateTutupPendingSo);
router.delete('/tutup-pending-so/:id', auth, c.deleteTutupPendingSo);

// ── Transaksi A.R. ──────────────────────────────────────────────
router.get('/transaksi-ar', auth, c.getTransaksiAr);
router.get('/transaksi-ar/:id', auth, c.getTransaksiArById);
router.post('/transaksi-ar', auth, c.createTransaksiAr);
router.put('/transaksi-ar/:id', auth, c.updateTransaksiAr);
router.delete('/transaksi-ar/:id', auth, c.deleteTransaksiAr);

// ── Surat Jalan ─────────────────────────────────────────────────
router.get('/surat-jalan', auth, c.getSuratJalan);
router.get('/surat-jalan/:id', auth, c.getSuratJalanById);
router.post('/surat-jalan', auth, c.createSuratJalan);
router.put('/surat-jalan/:id/return', auth, c.updateSuratJalanReturn);
router.put('/surat-jalan/:id', auth, c.updateSuratJalan);
router.delete('/surat-jalan/:id', auth, c.deleteSuratJalan);

// ── Retur Surat Jalan ───────────────────────────────────────────
router.get('/retur-surat-jalan', auth, c.getReturSuratJalan);
router.get('/retur-surat-jalan/:id', auth, c.getReturSuratJalanById);
router.post('/retur-surat-jalan', auth, c.createReturSuratJalan);
router.put('/retur-surat-jalan/:id', auth, c.updateReturSuratJalan);
router.delete('/retur-surat-jalan/:id', auth, c.deleteReturSuratJalan);

// ── Penjualan Via S.J. ──────────────────────────────────────────
router.get('/penjualan-via-sj', auth, c.getPenjualanViaSj);
router.get('/penjualan-via-sj/:id', auth, c.getPenjualanViaSjById);
router.post('/penjualan-via-sj', auth, c.createPenjualanViaSj);
router.put('/penjualan-via-sj/:id', auth, c.updatePenjualanViaSj);
router.delete('/penjualan-via-sj/:id', auth, c.deletePenjualanViaSj);

// ── Penjualan Via S.O. ──────────────────────────────────────────
router.get('/penjualan-via-so', auth, c.getPenjualanViaSo);
router.get('/penjualan-via-so/:id', auth, c.getPenjualanViaSoById);
router.post('/penjualan-via-so', auth, c.createPenjualanViaSo);
router.put('/penjualan-via-so/:id', auth, c.updatePenjualanViaSo);
router.delete('/penjualan-via-so/:id', auth, c.deletePenjualanViaSo);

// ── Penjualan Langsung ──────────────────────────────────────────
router.get('/penjualan-langsung', auth, c.getPenjualanLangsung);
router.get('/penjualan-langsung/:id', auth, c.getPenjualanLangsungById);
router.post('/penjualan-langsung', auth, c.createPenjualanLangsung);
router.put('/penjualan-langsung/:id', auth, c.updatePenjualanLangsung);
router.delete('/penjualan-langsung/:id', auth, c.deletePenjualanLangsung);
// ── Master Sales Tables ──────────────────────────────────────────
const mc = require('../controllers/salesMasterController');

const generateRoutes = (path, controller) => {
    router.get(`/${path}`, auth, controller.getAll);
    router.get(`/${path}/:id`, auth, controller.getById);
    router.post(`/${path}`, auth, controller.create);
    router.put(`/${path}/:id`, auth, controller.update);
    router.delete(`/${path}/:id`, auth, controller.delete);
};

generateRoutes('salesman', mc.salesman);
generateRoutes('tipe-customer', mc.tipe_customer);
generateRoutes('grup-customer', mc.grup_customer);
generateRoutes('penagihan-piutang', mc.penagihan_piutang);
generateRoutes('penerimaan-piutang', mc.penerimaan_piutang);
generateRoutes('retur-penjualan', mc.retur_penjualan);
generateRoutes('tanda-terima', mc.tanda_terima);
generateRoutes('jurnal-ar', mc.jurnal_ar);
generateRoutes('jurnal-penjualan', mc.jurnal_penjualan);
generateRoutes('rumus-komisi', mc.rumus_komisi);
generateRoutes('komisi-per-item', mc.komisi_per_item);
generateRoutes('weekday-settings', mc.weekday_settings);
generateRoutes('scan-product-log', mc.scan_product_log);

module.exports = router;
