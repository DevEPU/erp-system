const xlsx = require('xlsx');
const db = require('../src/config/db');

// Machine specs mapping from image & Mapping Group:
// Tonage & Year from image:
// 170T: MC-1 (2024), MC-21 (2024)
// 200T: MC-2 (2019), MC-22 (2019), MC-23 (2021)
// 220T: MC-3 (2024), MC-4 (2024), MC-5 (2024), MC-6 (2024), MC-24 (2024), MC-25 (2024), MC-26 (2024)
// 260T: MC-27 (2022)
// 320T: MC-7 (2019), MC-8 (2020), MC-9 (2021), MC-28 (2023)
// 400T: MC-10 (2024)
// 450T: MC-29 (2024), MC-30 (2024)
// 500T: MC-35 (2021), MC-36 (2021)
// 550T: MC-13 (2024), MC-14 (2024)
// 600T: MC-11 (2021)
// 650T: MC-12 (2019), MC-16 (2024), MC-32 (2024)
// 750T: MC-15 (2024)
// 800T: MC-37 (2022)
// 850T: MC-17 (2023), MC-18 (2024), MC-19 (2024), MC-38 (2024)
// 1050T: MC-39 (2023)

const machineSpecs = [
  { mc: 1, ton: 170, year: 2024, group: 'Sharing', mp: 1 },
  { mc: 2, ton: 200, year: 2019, group: 'OFF', mp: 1 },
  { mc: 3, ton: 220, year: 2024, group: 'OFF', mp: 1 },
  { mc: 4, ton: 220, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 5, ton: 220, year: 2024, group: 'Sharing', mp: 1 },
  { mc: 6, ton: 220, year: 2024, group: 'Sharing', mp: 1 },
  { mc: 7, ton: 320, year: 2019, group: 'Dedicated', mp: 1 },
  { mc: 8, ton: 320, year: 2020, group: 'Dedicated', mp: 1 },
  { mc: 9, ton: 320, year: 2021, group: 'Dedicated', mp: 1 },
  { mc: 10, ton: 400, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 11, ton: 600, year: 2021, group: 'Dedicated', mp: 3 },
  { mc: 12, ton: 650, year: 2019, group: 'Dedicated', mp: 2 },
  { mc: 13, ton: 550, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 14, ton: 550, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 15, ton: 750, year: 2024, group: 'Dedicated', mp: 2 },
  { mc: 16, ton: 650, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 17, ton: 850, year: 2023, group: 'Dedicated', mp: 3 },
  { mc: 18, ton: 850, year: 2024, group: 'Dedicated', mp: 3 },
  { mc: 19, ton: 850, year: 2024, group: 'Dedicated', mp: 3 },
  { mc: 21, ton: 170, year: 2024, group: 'OFF', mp: 1 },
  { mc: 22, ton: 200, year: 2019, group: 'Dedicated', mp: 1 },
  { mc: 23, ton: 200, year: 2021, group: 'Dedicated', mp: 1 },
  { mc: 24, ton: 220, year: 2024, group: 'Sharing', mp: 1 },
  { mc: 25, ton: 220, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 26, ton: 220, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 27, ton: 260, year: 2022, group: 'Dedicated', mp: 1 },
  { mc: 28, ton: 320, year: 2023, group: 'Sharing', mp: 1 },
  { mc: 29, ton: 450, year: 2024, group: 'OFF', mp: 1 },
  { mc: 30, ton: 450, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 32, ton: 650, year: 2024, group: 'Dedicated', mp: 2 },
  { mc: 35, ton: 500, year: 2021, group: 'Sharing', mp: 1 },
  { mc: 36, ton: 500, year: 2021, group: 'Dedicated', mp: 2 },
  { mc: 37, ton: 800, year: 2022, group: 'Sharing', mp: 2 },
  { mc: 38, ton: 850, year: 2024, group: 'Dedicated', mp: 2 },
  { mc: 39, ton: 1050, year: 2023, group: 'Dedicated', mp: 3 }
];

async function dryRun() {
  console.log('=== DRY RUN: VERIFYING 35 MACHINES ===');
  console.log(`Total machines: ${machineSpecs.length}`);

  // Count by tonnage
  const tonCount = {};
  machineSpecs.forEach(m => {
    tonCount[m.ton] = (tonCount[m.ton] || 0) + 1;
  });
  console.log('Tonnage breakdown:', tonCount);

  // Count by year
  const yearCount = {};
  machineSpecs.forEach(m => {
    yearCount[m.year] = (yearCount[m.year] || 0) + 1;
  });
  console.log('Year breakdown:', yearCount);

  process.exit(0);
}

dryRun();
