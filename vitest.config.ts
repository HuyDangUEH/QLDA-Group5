import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    globals: true, // Cho phép dùng describe, it, expect mà không cần import
    poolOptions: {
      threads: {
        singleThread: true, // Tránh xung đột DB khi test chạy song song
      },
    },
  },
});