const mysql = require('mysql2/promise');
require('dotenv').config();

let dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "",
  database: process.env.DB_NAME || "budgeting",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

if (process.env.DATABASE_URL && !process.env.DB_HOST) {
  try {
    const parsed = new URL(process.env.DATABASE_URL);
    dbConfig.host = parsed.hostname || dbConfig.host;
    dbConfig.user = parsed.username || dbConfig.user;
    dbConfig.password = parsed.password || dbConfig.password;
    if (parsed.pathname) {
      dbConfig.database = parsed.pathname.replace(/^\//, '') || dbConfig.database;
    }
    if (parsed.port) {
      dbConfig.port = parseInt(parsed.port, 10);
    }
  } catch (e) {
    // URL parse fallback
  }
}

const pool = mysql.createPool(dbConfig);

/**
 * Systemic fix for "Bind parameters must not contain undefined"
 * This ensures that if any part of the application passes 'undefined' in the params array,
 * it is automatically converted to 'null' before reaching the MySQL driver.
 */
const sanitizeParams = (params) => {
  if (!params || !Array.isArray(params)) return params;
  return params.map(p => p === undefined ? null : p);
};

// Wrap the pool methods
const originalExecute = pool.execute.bind(pool);
const originalQuery = pool.query.bind(pool);
const originalGetConnection = pool.getConnection.bind(pool);

pool.execute = async (sql, params) => {
  const sanitized = sanitizeParams(params);
  console.log(`[DB DEBUG] Executing SQL: ${sql.substring(0, 100)}...`);
  console.log(`[DB DEBUG] Param count: ${sanitized ? sanitized.length : 0}`);
  return originalExecute(sql, sanitized);
};

pool.query = async (sql, params) => {
  return originalQuery(sql, sanitizeParams(params));
};

pool.getConnection = async () => {
  const connection = await originalGetConnection();
  
  const connExecute = connection.execute.bind(connection);
  const connQuery = connection.query.bind(connection);
  
  connection.execute = async (sql, params) => {
    const sanitized = sanitizeParams(params);
    console.log(`[DB DEBUG CONN] Executing SQL: ${sql.substring(0, 100)}...`);
    console.log(`[DB DEBUG CONN] Param count: ${sanitized ? sanitized.length : 0}`);
    return connExecute(sql, sanitized);
  };
  
  connection.query = async (sql, params) => {
    return connQuery(sql, sanitizeParams(params));
  };
  
  return connection;
};

module.exports = pool;
