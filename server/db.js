/**
 * db.js - Quản lý kết nối SQL Server và hàm query tham số hóa
 * 
 * Ví dụ sử dụng:
 * const { query } = require('./db');
 * 
 * // 1. Lấy danh sách:
 * const result = await query('SELECT * FROM Users WHERE RoleId = @roleId', { roleId: 2 });
 * const users = result.recordset;
 * 
 * // 2. Thêm mới / Cập nhật:
 * const updateRes = await query('UPDATE Tasks SET Status = @status WHERE Id = @id', { status: 'Done', id: 5 });
 * console.log('Số dòng ảnh hưởng:', updateRes.rowsAffected[0]);
 */

const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_NAME || 'CafeTaskManager',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false'
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

/**
 * Lấy connection pool mssql (tạo mới nếu chưa có)
 */
async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

/**
 * Thực thi câu lệnh SQL với tham số hóa
 * @param {string} queryString - Câu lệnh SQL (dùng cú pháp @paramName)
 * @param {object} params - Object chứa các tham số truyền vào { paramName: value }
 * @returns {Promise<sql.IResult<any>>}
 */
async function query(queryString, params = {}) {
  const currentPool = await getPool();
  const request = currentPool.request();

  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }

  return await request.query(queryString);
}

module.exports = {
  getPool,
  query,
  sql
};
