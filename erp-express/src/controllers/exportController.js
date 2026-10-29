const { generateIntegratedExcelWorkbook } = require('../services/generateIntegratedExcelService');

exports.exportIntegratedExcel = async (req, res) => {
    try {
        const workbook = await generateIntegratedExcelWorkbook();

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="ERP_Integrated_Master_BOM_MRP.xlsx"'
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting integrated Excel:', error);
        res.status(500).json({ success: false, message: 'Failed to export Excel file', error: error.message });
    }
};
