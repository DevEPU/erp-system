const path = require('path');
const { generateIntegratedExcelWorkbook } = require('../services/generateIntegratedExcelService');

async function main() {
    try {
        console.log('Generating Integrated Excel Workbook for PO CPO/26/08/0001...');
        const workbook = await generateIntegratedExcelWorkbook();
        
        const outputPath1 = path.join(__dirname, '../../../ERP_MRP_Transaction_CPO_26_08_0001.xlsx');
        await workbook.xlsx.writeFile(outputPath1);
        console.log(`Excel Workbook successfully saved to: ${outputPath1}`);

        try {
            const outputPath2 = path.join(__dirname, '../../../ERP_Integrated_Master_BOM_MRP.xlsx');
            await workbook.xlsx.writeFile(outputPath2);
            console.log(`Excel Workbook also saved to: ${outputPath2}`);
        } catch (err) {
            console.warn('Primary file locked, saved to ERP_MRP_Transaction_CPO_26_08_0001.xlsx');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error generating Excel Workbook:', error);
        process.exit(1);
    }
}

main();
