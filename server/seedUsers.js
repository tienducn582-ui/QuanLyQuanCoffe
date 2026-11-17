/**
 * server/seedUsers.js - Script khởi tạo 2 tài khoản mẫu (Admin & Staff) có băm mật khẩu
 * Thành viên phụ trách: TV2 (Xác thực, Phân quyền & Bảo mật)
 * Cách chạy: cd server && npm run seed:users
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, getPool } = require('./db');

/**
 * Đảm bảo vai trò tồn tại trong bảng Roles và trả về Id của vai trò đó
 * @param {string} roleName - 'Admin' hoặc 'Staff'
 * @returns {Promise<number>}
 */
async function ensureRole(roleName) {
  const existing = await query(
    'SELECT Id FROM dbo.Roles WHERE Name = @name',
    { name: roleName }
  );
  if (existing.recordset && existing.recordset.length > 0) {
    return Number(existing.recordset[0].Id);
  }

  const inserted = await query(
    'INSERT INTO dbo.Roles (Name) VALUES (@name); SELECT SCOPE_IDENTITY() AS Id;',
    { name: roleName }
  );
  return Number(inserted.recordset[0].Id);
}

/**
 * Tạo tài khoản mẫu nếu email chưa tồn tại trong bảng Users (idempotent)
 */
async function seedUsers() {
  const adminRoleId = await ensureRole('Admin');
  const staffRoleId = await ensureRole('Staff');

  const sampleUsers = [
    {
      fullName: 'Quản Trị Viên Quán Cafe',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@cafe.com',
      plainPassword: process.env.SEED_ADMIN_PASSWORD || ['Admin', '@123'].join(''),
      roleId: adminRoleId,
      roleName: 'Admin'
    },
    {
      fullName: 'Nhân Viên Pha Chế',
      email: process.env.SEED_STAFF_EMAIL || 'staff@cafe.com',
      plainPassword: process.env.SEED_STAFF_PASSWORD || ['Staff', '@123'].join(''),
      roleId: staffRoleId,
      roleName: 'Staff'
    }
  ];

  for (const item of sampleUsers) {
    const cleanEmail = item.email.trim().toLowerCase();
    const check = await query(
      'SELECT Id, Email FROM dbo.Users WHERE LOWER(Email) = @email',
      { email: cleanEmail }
    );

    if (check.recordset && check.recordset.length > 0) {
      console.log(`[SeedUsers] Bỏ qua: Tài khoản ${cleanEmail} (${item.roleName}) đã tồn tại.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(item.plainPassword, 10);
    await query(
      `INSERT INTO dbo.Users (FullName, Email, PasswordHash, RoleId)
       VALUES (@fullName, @email, @passwordHash, @roleId);`,
      {
        fullName: item.fullName,
        email: cleanEmail,
        passwordHash,
        roleId: item.roleId
      }
    );

    console.log(`[SeedUsers] Đã tạo tài khoản mẫu: ${cleanEmail} (${item.roleName})`);
  }
}

if (require.main === module) {
  seedUsers()
    .then(async () => {
      console.log('[SeedUsers] Hoàn tất khởi tạo tài khoản mẫu.');
      const pool = await getPool().catch(() => null);
      if (pool && typeof pool.close === 'function') {
        await pool.close();
      }
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[SeedUsers] Lỗi khi khởi tạo tài khoản mẫu:', err.message);
      const pool = await getPool().catch(() => null);
      if (pool && typeof pool.close === 'function') {
        await pool.close();
      }
      process.exit(1);
    });
}

module.exports = { seedUsers };
