import { apiDocsEnabled, env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './lib/prisma.js';
import { createApp } from './app.js';

async function main() {
  try {
    await prisma.$connect();
    logger.info('✅ Đã kết nối MySQL');
  } catch (err) {
    logger.error({ err }, '❌ Không kết nối được MySQL. Kiểm tra DATABASE_URL trong file .env');
    process.exit(1);
  }

  const server = createApp().listen(env.PORT, () => {
    logger.info(`🚀 QuickBite API đang chạy tại http://localhost:${env.PORT}/api/v1`);
    if (apiDocsEnabled) logger.info(`📖 Tài liệu API: http://localhost:${env.PORT}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Nhận tín hiệu ${signal}, đang tắt server...`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
