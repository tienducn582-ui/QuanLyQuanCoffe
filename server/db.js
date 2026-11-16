/**
 * server/db.js - Quản lý kết nối SQL Server và cung cấp hàm thực thi truy vấn
 *
 * VÍ DỤ SỬ DỤNG CHO CÁC ROUTER (TV2, TV3, TV4):
 * const { query } = require('../db');
 *
 * // 1. Lấy danh sách:
 * const result = await query('SELECT * FROM Tasks WHERE Status = @status', { status: 'Pending' });
 * const tasks = result.recordset;
 *
 * // 2. Lấy 1 bản ghi:
 * const result = await query('SELECT * FROM Users WHERE Id = @id', { id: 1 });
 * const user = result.recordset[0];
 *
 * // 3. Thêm/Sửa/Xóa:
 * const result = await query(
 *   'INSERT INTO Categories (Name) VALUES (@name); SELECT SCOPE_IDENTITY() AS Id;',
 *   { name: 'Đồ uống' }
 * );
 * const newId = result.recordset[0].Id;
 *
 * LƯU Ý QUAN TRỌNG:
 * - Luôn tham số hóa tham số qua params, KHÔNG cộng chuỗi SQL để tránh SQL Injection.
 * - Cột TIME của SQL Server trả về kiểu Date trong mssql: hãy chuyển sang định dạng 'HH:mm' trước khi trả về client.
 */

const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_NAME || 'CafeTaskManager',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise = null;

/**
 * Lấy hoặc khởi tạo connection pool SQL Server
 */
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then(pool => {
        console.log('[CSDL] Đã kết nối thành công tới SQL Server:', config.database);
        return pool;
      })
      .catch(err => {
        console.error('[CSDL] Lỗi kết nối CSDL SQL Server:', err.message);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

/**
 * Thực thi câu lệnh SQL với tham số hóa
 * @param {string} sqlString - Câu lệnh SQL chứa các biến @paramName
 * @param {Object} params - Object các tham số { paramName: value }
 * @returns {Promise<sql.IResult<any>>} - Kết quả trả về (recordset, rowsAffected)
 */
async function query(sqlString, params = {}) {
  const pool = await getPool();
  const request = pool.request();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      request.input(key, null);
    } else {
      request.input(key, value);
    }
  }

  return await request.query(sqlString);
}

module.exports = {
  sql,
  getPool,
  query
};
