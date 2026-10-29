const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "budgeting"
  });

  try {
    const [tables] = await pool.query("SHOW TABLES");
    console.log("ALL TABLES:");
    console.log(tables.map(t => Object.values(t)[0]));

    console.log("\nDESCRIBE machine_mold_uph:");
    const [cols] = await pool.query("DESCRIBE machine_mold_uph");
    console.log(cols);

    // Let's see if there is any other table starting with machine or mold or planning
    const [planningCols] = await pool.query("DESCRIBE planning_produksi");
    console.log("\nDESCRIBE planning_produksi:");
    console.log(planningCols);

  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await pool.end();
  }
}

run();
