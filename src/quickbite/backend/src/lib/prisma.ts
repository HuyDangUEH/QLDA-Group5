import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env.js';

// Giữ một PrismaClient duy nhất khi chạy `tsx watch` để tránh mở quá nhiều kết nối
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Lỗi truy vấn đã được xử lý và ghi log ở error-handler, chỉ để Prisma in cảnh báo
    log: isProduction ? [] : ['warn'],
  });

if (!isProduction) globalForPrisma.prisma = prisma;
