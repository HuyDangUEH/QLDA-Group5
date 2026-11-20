/**
 * Xuất tài liệu Swagger / OpenAPI ra file tĩnh:   npm run docs:openapi
 *
 * Ghi ra ../docs/openapi.json để xem được tài liệu API mà không cần chạy server
 * (vd dán vào https://editor.swagger.io, hoặc khi production tắt /api/docs bằng API_DOCS=false).
 * Test `tests/openapi-coverage.test.ts` báo lỗi nếu file này cũ hơn đặc tả trong code → nhớ chạy lại khi sửa API.
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { openApiSpec } from '../src/docs/openapi.js';

export const OPENAPI_FILE = path.resolve(import.meta.dirname, '../../docs/openapi.json');
export const serializeSpec = () => `${JSON.stringify(openApiSpec, null, 2)}\n`;

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  writeFileSync(OPENAPI_FILE, serializeSpec());
  const ops = Object.values(openApiSpec.paths).reduce((n, item) => n + Object.keys(item).length, 0);
  console.log(`✅ Đã xuất ${OPENAPI_FILE}`);
  console.log(`   OpenAPI ${openApiSpec.openapi} · phiên bản ${openApiSpec.info.version} · ${Object.keys(openApiSpec.paths).length} đường dẫn · ${ops} thao tác · ${Object.keys(openApiSpec.components.schemas).length} schema`);
  process.exit(0);
}
