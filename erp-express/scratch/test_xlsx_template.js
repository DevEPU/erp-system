const xlsx = require('xlsx');

function testXlsx() {
    const templatePath = 'c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx';
    const outputPath = 'c:/laragon/www/erp-epu-main/Schedule_Delivery_Exported_Xlsx_Test.xlsx';

    const workbook = xlsx.readFile(templatePath, { cellStyles: true });
    
    // Modify one cell on GINSA sheet
    const ws = workbook.Sheets['GINSA'];
    if (ws['I4']) {
        console.log("Original cell I4:", ws['I4']);
        ws['I4'].v = 9999; // Change schedule to 9999
        ws['I4'].t = 'n';
    }

    xlsx.writeFile(workbook, outputPath);
    console.log("Written output file with xlsx.");
}

testXlsx();
