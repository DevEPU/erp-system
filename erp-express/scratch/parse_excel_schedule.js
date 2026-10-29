const xlsx = require('xlsx');
const path = require('path');

const excelSerialToDateStr = (serial) => {
    if (typeof serial !== 'number') return String(serial);
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    const Y = date.getUTCFullYear();
    const M = String(date.getUTCMonth() + 1).padStart(2, '0');
    const D = String(date.getUTCDate()).padStart(2, '0');
    return `${Y}-${M}-${D}`;
};

function parseExcel() {
    const filePath = 'c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx';
    const workbook = xlsx.readFile(filePath);

    const result = [];

    // We process sheets: GINSA, TATA, GRAF, FSCM, HYMAN, SASA, MATERIAL
    const validSheets = ['GINSA', 'TATA, GRAF', 'FSCM', 'HYMAN', 'SASA', 'MATERIAL'];

    for (const sheetName of validSheets) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        // Find Vendor Name (usually in Row 0 or Row 1)
        let vendorName = '';
        for (let r = 0; r < 5; r++) {
            if (rawData[r]) {
                const found = rawData[r].find(val => val && typeof val === 'string' && (val.includes('PT') || val.includes('Silverplas')));
                if (found) {
                    vendorName = found.trim();
                    break;
                }
            }
        }
        if (!vendorName) vendorName = sheetName;

        // Find header row (usually contains 'Name Part' or 'Part name')
        const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Name Part') || row.includes('Part name')));
        if (headerRowIdx === -1) {
            console.log(`Skipped sheet ${sheetName}: no header row`);
            continue;
        }

        const headers = rawData[headerRowIdx];
        const namePartIdx = headers.indexOf('Name Part');
        const po2Idx = headers.indexOf('PO-2');
        const po1Idx = headers.indexOf('PO-1');
        const totalIdx = headers.indexOf('Total');
        const scheduleIdx = headers.indexOf('Schedule');
        const deviasiIdx = headers.indexOf('Deviasi');

        // Extract dates from columns index 8 onwards (or whatever column has numbers)
        const dateCols = [];
        for (let c = 0; c < headers.length; c++) {
            const val = headers[c];
            if (typeof val === 'number' && val > 40000) {
                dateCols.push({
                    colIdx: c,
                    dateStr: excelSerialToDateStr(val),
                    serial: val
                });
            }
        }

        // Now parse items. Items are in blocks of 3 rows:
        // Row 1: Schedule
        // Row 2: Act In
        // Row 3: Dev
        const items = [];
        for (let r = headerRowIdx + 1; r < rawData.length; r++) {
            const row = rawData[r];
            if (!row || row.length === 0) continue;

            // Check if this is the start of an item (has a number or a part name in column namePartIdx)
            const partName = row[namePartIdx] ? String(row[namePartIdx]).trim() : '';
            const rowLabel = row[7] ? String(row[7]).trim() : ''; // Column 7 is 'Schedule' / 'Act In' / 'Dev'

            if (partName && (rowLabel === 'Schedule' || !rowLabel)) {
                // Read 3 rows
                const rowSched = rawData[r] || [];
                const rowAct = rawData[r + 1] || [];
                const rowDev = rawData[r + 2] || [];

                const itemNo = rowSched[0] ? Number(rowSched[0]) : items.length + 1;
                const po2Val = Number(rowSched[po2Idx]) || 0;
                const po1Val = Number(rowSched[po1Idx]) || 0;
                const totalVal = Number(rowSched[totalIdx]) || 0;
                const schedTotal = Number(rowSched[scheduleIdx]) || 0;
                const devTotal = Number(rowSched[deviasiIdx]) || 0;

                const daily = {};
                for (const dCol of dateCols) {
                    daily[dCol.dateStr] = {
                        schedule: Number(rowSched[dCol.colIdx]) || 0,
                        actIn: Number(rowAct[dCol.colIdx]) || 0,
                        dev: Number(rowDev[dCol.colIdx]) || 0
                    };
                }

                items.push({
                    no: itemNo,
                    partName,
                    po2: po2Val,
                    po1: po1Val,
                    total: totalVal,
                    scheduleTotal: schedTotal,
                    devTotal: devTotal,
                    daily
                });

                // Skip next 2 rows since we parsed them
                r += 2;
            }
        }

        result.push({
            sheetName,
            vendorName,
            dates: dateCols.map(d => d.dateStr),
            items
        });
    }

    console.log(`Parsed ${result.length} sheets successfully.`);
    if (result.length > 0) {
        console.log("Sheet 1 sample item:", JSON.stringify(result[0].items[0], null, 2));
    }
}

parseExcel();
