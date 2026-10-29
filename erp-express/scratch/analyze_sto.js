const xlsx = require('xlsx');

function analyzeSTO() {
    const filePath = 'c:/laragon/www/erp-epu-main/STO.xlsx';
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Part No') || row.includes('Part name')));
    console.log("Header row index:", headerRowIdx);
    console.log("Header row content:", rawData[headerRowIdx]);

    const headers = rawData[headerRowIdx];
    const partNoIdx = headers.indexOf('Part No');
    const partNameIdx = headers.indexOf('Part name');
    const stoIdx = headers.indexOf('STO');

    console.log(`Column Indexes -> Part No: ${partNoIdx}, Part Name: ${partNameIdx}, STO: ${stoIdx}`);

    const stoItems = [];
    for (let i = headerRowIdx + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const partNo = row[partNoIdx] ? String(row[partNoIdx]).trim() : '';
        const partName = row[partNameIdx] ? String(row[partNameIdx]).trim() : '';
        let stoVal = row[stoIdx];

        if (stoVal !== undefined && stoVal !== null && stoVal !== '') {
            stoVal = Number(stoVal);
            if (isNaN(stoVal)) stoVal = 0;
        } else {
            stoVal = 0;
        }

        if (partNo || partName) {
            stoItems.push({ partNo, partName, stoVal });
        }
    }

    console.log(`Parsed ${stoItems.length} items from STO.xlsx.`);
    console.log("First 10 items:", stoItems.slice(0, 10));
    console.log("Items with STO > 0 count:", stoItems.filter(x => x.stoVal > 0).length);
}

analyzeSTO();
