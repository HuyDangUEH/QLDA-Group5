import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '../../../',
  test: {
    environment: 'node',
    include: ['src/quickbite/backend/tests/**/*.test.ts', 'tests/**/*.test.ts'],
    globalSetup: ['src/quickbite/backend/tests/global-setup.ts'],
    setupFiles: ['src/quickbite/backend/tests/setup-env.ts'],
    // Test tích hợp dùng chung một database test nên chạy tuần tự
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
