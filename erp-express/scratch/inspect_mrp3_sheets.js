const xlsx = require('xlsx');

function inspectMRP3() {
    const f1 = 'c:/laragon/www/erp-epu-main/8. Agustus 2026 MRP-1.xlsx';
    const f2 = 'c:/laragon/www/erp-epu-main/8. Agustus 2026 MRP-2 Rev02.xlsx';

    const wb1 = xlsx.readFile(f1);
    const d1 = xlsx.utils.sheet_to_json(wb1.Sheets['D. MRP (3)'], { header: 1 });

    const wb2 = xlsx.readFile(f2);
    const d2 = xlsx.utils.sheet_to_json(wb2.Sheets['D. MRP (3)'], { header: 1 });

    console.log('=== PO-1 % values in MRP-1 D. MRP (3) ===');
    const po1Map = {};
    let countPo1 = 0;
    for (let r = 4; r < d1.length; r++) {
        const row = d1[r];
        if (row && row[2]) {
            countPo1++;
            const pCode = String(row[2]).trim();
            const pVendor = row[4] ? String(row[4]).trim() : pCode;
            const vName = row[6] ? String(row[6]).trim() : '';
            const mrp1 = Number(row[15]) || 0;
            const po1PctRaw = Number(row[19]);
            const po1Pct = isNaN(po1PctRaw) ? 100 : (po1PctRaw <= 1 ? Math.round(po1PctRaw * 100) : Math.round(po1PctRaw));
            const actPo1 = Number(row[21]) || 0;
            const key = pCode + '_' + pVendor;
            po1Map[key] = { pCode, pVendor, vName, mrp1, po1Pct, actPo1 };
        }
    }
    console.log('Total items in MRP-1 D. MRP (3):', countPo1);

    console.log('\n=== MRP-2 D. MRP (3) Summary Stats ===');
    let totalMrp2Kumulatif = 0, totalActPo1InMrp2 = 0, totalActPo2 = 0, totalAmountPo2 = 0;
    for (let r = 4; r < d2.length; r++) {
        const row = d2[r];
        if (row && row[2]) {
            const mrpTotal = Number(row[16]) || 0;
            const actPo1 = Number(row[22]) || 0;
            const actPo2 = Number(row[27]) || 0;
            const amountPo2 = Number(row[28]) || 0;
            totalMrp2Kumulatif += mrpTotal;
            totalActPo1InMrp2 += actPo1;
            totalActPo2 += actPo2;
            totalAmountPo2 += amountPo2;
        }
    }
    console.log({ totalMrp2Kumulatif, totalActPo1InMrp2, totalActPo2, totalAmountPo2 });

    console.log('\n=== Sample items comparison ===');
    for (let r = 4; r < 20; r++) {
        const row = d2[r];
        if (row && row[2]) {
            console.log({
                no: row[0],
                partNo: row[2],
                partName: row[3],
                vendor: row[6],
                price: row[7],
                mrp2_total: row[16],
                po1_pct: (Number(row[21] || 0) * 100) + '%',
                act_po1: row[22],
                act_po2_order_baru: row[27],
                amount_po2: row[28],
                total_po: row[29]
            });
        }
    }
}

inspectMRP3();
