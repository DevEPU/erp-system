const db = require('../config/db');
const poCtrl = require('./purchaseOrderController');
const grCtrl = require('./goodsReceiptController');
const piCtrl = require('./purchaseInvoiceController');
const pymCtrl = require('./purchasePaymentController');
const pCtrl = require('./purchaseController');

exports.getNextReference = async (req, res) => {
    const { type, department_id } = req.query;
    console.log(`[DEBUG] getNextReference called: type=${type}, dept=${department_id}`);
    const connection = await db.getConnection();
    try {
        let reference = '';
        const deptId = department_id && department_id !== '' ? Number(department_id) : null;

        switch (type) {
            case 'PO':
                reference = await poCtrl.generatePOReference(connection, deptId);
                break;
            case 'BPB':
            case 'GR':
                reference = await grCtrl.generateGRReference(connection, deptId);
                break;
            case 'INV':
            case 'PI':
                reference = await piCtrl.generatePIReference(connection, deptId);
                break;
            case 'PYM':
                reference = await pymCtrl.generatePaymentReference(connection, deptId);
                break;
            case 'PR':
                reference = await pCtrl.generatePRReference(connection, deptId, 'PR');
                break;
            case 'PL':
                reference = await pCtrl.generatePRReference(connection, deptId, 'PL');
                break;
            case 'STO':
                const stockOpnameController = require('./stockOpnameController');
                reference = await stockOpnameController.generateSTOReference(connection, deptId);
                break;
            default:
                return res.status(400).json({ message: 'Invalid reference type' });
        }

        return res.json({ success: true, reference });
    } catch (error) {
        console.error('generateRef error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};
