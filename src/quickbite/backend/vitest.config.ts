import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup-env.ts'],
    // Test tích hợp dùng chung một database test nên chạy tuần tự
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
