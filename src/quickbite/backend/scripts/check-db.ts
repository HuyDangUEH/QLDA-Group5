/**
 * Kiểm tra nhanh kết nối MySQL và số lượng dữ liệu: npm run db:check
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma.js';

// Thông báo dễ hiểu cho các lỗi kết nối thường gặp của Prisma
const HINTS: Record<string, string> = {
  P1000: 'Sai tên đăng nhập hoặc mật khẩu MySQL. Kiểm tra DATABASE_URL trong file .env.',
  P1001: 'Không tìm thấy MySQL server. Kiểm tra MySQL đã chạy chưa (services.msc) và đúng host/cổng chưa.',
  P1003: 'Đăng nhập MySQL thành công nhưng database chưa tồn tại. Chạy "npm run db:migrate" để tạo database và các bảng.',
};

try {
  const [row] = await prisma.$queryRaw<{ version: string; db: string | null }[]>`
    SELECT VERSION() AS version, DATABASE() AS db`;
  console.log(`✅ Kết nối MySQL thành công (phiên bản ${row?.version}, database: ${row?.db})`);

  try {
    const [users, stalls, menuItems, orders] = await Promise.all([
      prisma.user.count(),
      prisma.foodStall.count(),
      prisma.menuItem.count(),
      prisma.order.count(),
    ]);
    console.log(`   Dữ liệu: ${users} người dùng, ${stalls} quầy, ${menuItems} món, ${orders} đơn hàng`);
  } catch {
    console.log('   ⚠️  Chưa có bảng dữ liệu. Chạy "npm run db:migrate" để tạo bảng.');
  }
} catch (err) {
  const message = err instanceof Error ? err.message : '';
  // Prisma không phải lúc nào cũng gắn mã lỗi, nên dự phòng bằng nội dung thông báo
  const code =
    (err instanceof Prisma.PrismaClientInitializationError ? err.errorCode : undefined) ??
    (err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined) ??
    (/Database `.+` does not exist/.test(message)
      ? 'P1003'
      : /Authentication failed/.test(message)
        ? 'P1000'
        : /Can't reach database server/.test(message)
          ? 'P1001'
          : undefined);
  const hint = code ? HINTS[code] : undefined;
  if (code === 'P1003') {
    console.log(`⚠️  ${hint}`);
  } else {
    console.error('❌ Không kết nối được MySQL.');
    console.error(hint ?? (message || err));
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
