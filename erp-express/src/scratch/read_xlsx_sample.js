const XLSX = require('xlsx');

const filePath = "C:\\laragon\\www\\erp-epu-main\\06. Jun MD Vendor 1.xlsx";

try {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    
    // Parse to JSON (include raw values)
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const uniqueVendors = new Set();
    const rows = [];

    // Let's iterate through rows, skip header rows (first two rows usually don't have proper vendor data)
    data.forEach((row, index) => {
        const vendor = row['__EMPTY_5'];
        if (vendor && vendor !== 'Vendor' && vendor !== 'VENDOR') {
            uniqueVendors.add(vendor.trim());
            rows.push({
                index,
                vendor: vendor.trim(),
                partNo: row['__EMPTY_3'],
                partName: row['__EMPTY_4']
            });
        }
    });

    console.log('Total Rows with Vendors:', rows.length);
    console.log('Unique Vendors Count:', uniqueVendors.size);
    console.log('Unique Vendors List:', Array.from(uniqueVendors).sort());
} catch (err) {
    console.error('Error:', err);
}
