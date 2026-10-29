const path = require('path');
const { generateIntegratedExcelWorkbook } = require('../services/generateIntegratedExcelService');

async function main() {
    try {
        console.log('Generating Exact Split Excel Workbook (1,400 Total Net Req -> 700 Pcs per Vendor 50%)...');
        const workbook = await generateIntegratedExcelWorkbook();
        
        const outputPath = path.join(__dirname, '../../../ERP_MRP_Exact_Split_1400_to_700.xlsx');
        await workbook.xlsx.writeFile(outputPath);
        console.log(`Excel Workbook successfully saved to: ${outputPath}`);

        try {
            const outputPath2 = path.join(__dirname, '../../../ERP_Normalized_MultiVendor_MRP_Quota.xlsx');
            await workbook.xlsx.writeFile(outputPath2);
            console.log(`Also saved to: ${outputPath2}`);
        } catch (e) {
            console.warn("ERP_Normalized_MultiVendor_MRP_Quota.xlsx locked, written to ERP_MRP_Exact_Split_1400_to_700.xlsx");
        }

        process.exit(0);
    } catch (error) {
        console.error('Error generating Excel Workbook:', error);
        process.exit(1);
    }
}

main();
