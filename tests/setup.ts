import { beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Chạy migration hoặc reset DB test tại đây nếu cần
  console.log('Khởi tạo Database Test...');
});

afterEach(async () => {
  // Xóa sạch dữ liệu các bảng sau mỗi test case để môi trường luôn sạch
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});