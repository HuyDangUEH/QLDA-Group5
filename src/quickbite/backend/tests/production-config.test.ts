import { describe, expect, it } from 'vitest';
import { checkProductionEnv, hoursSinceLatestBackup, pendingMigrations } from '../scripts/production-config.js';

const GOOD = {
  NODE_ENV: 'production',
  JWT_SECRET: 'f3a9c1d27b4e86a0' .repeat(5),
  DATABASE_URL: 'mysql://quickbite:S3cret%40pw@mysql-abc.aivencloud.com:28169/quickbite?sslaccept=strict',
  CORS_ORIGINS: 'https://quickbite.vercel.app',
  TRUST_PROXY: '1',
  LOG_LEVEL: 'info',
  UPLOAD_DIR: '/var/lib/quickbite/uploads',
  BACKUP_DIR: '/var/backups/quickbite',
};
const levelOf = (env: Record<string, string | undefined>, key: string) => checkProductionEnv(env).find((r) => r.key === key)?.level;

describe('checkProductionEnv (kiểm tra cấu hình production)', () => {
  it('cấu hình chuẩn → tất cả đạt, không lộ mật khẩu trong thông báo', () => {
    const results = checkProductionEnv(GOOD);
    expect(results.filter((r) => r.level !== 'ok')).toEqual([]);
    expect(JSON.stringify(results)).not.toContain('S3cret');
    expect(JSON.stringify(results)).not.toContain(GOOD.JWT_SECRET);
  });

  it('NODE_ENV khác production → lỗi', () => {
    expect(levelOf({ ...GOOD, NODE_ENV: 'development' }, 'NODE_ENV')).toBe('error');
  });

  it('JWT_SECRET mẫu / yếu → lỗi; ngắn hơn 64 ký tự → cảnh báo', () => {
    expect(levelOf({ ...GOOD, JWT_SECRET: 'change_me_to_a_long_random_string_at_least_32_chars' }, 'JWT_SECRET')).toBe('error');
    expect(levelOf({ ...GOOD, JWT_SECRET: 'a'.repeat(80) }, 'JWT_SECRET')).toBe('error');
    expect(levelOf({ ...GOOD, JWT_SECRET: 'f3a9c1d27b4e86a0f3a9c1d27b4e86a0x' }, 'JWT_SECRET')).toBe('warn');
  });

  it('DATABASE_URL: dùng root → cảnh báo; cloud thiếu SSL → cảnh báo; thiếu mật khẩu / sai định dạng → lỗi', () => {
    expect(levelOf({ ...GOOD, DATABASE_URL: 'mysql://root:x@localhost:3306/quickbite' }, 'DATABASE_URL')).toBe('warn');
    expect(levelOf({ ...GOOD, DATABASE_URL: 'mysql://quickbite:x@mysql-abc.aivencloud.com:28169/quickbite' }, 'DATABASE_URL')).toBe('warn');
    expect(levelOf({ ...GOOD, DATABASE_URL: 'mysql://quickbite@localhost/quickbite' }, 'DATABASE_URL')).toBe('error');
    expect(levelOf({ ...GOOD, DATABASE_URL: 'khong-phai-url' }, 'DATABASE_URL')).toBe('error');
    expect(levelOf({ ...GOOD, DATABASE_URL: 'mysql://quickbite:x@localhost:3306/quickbite' }, 'DATABASE_URL')).toBe('ok');
  });

  it('CORS: http:// → lỗi; còn localhost → cảnh báo; trống → lỗi', () => {
    expect(levelOf({ ...GOOD, CORS_ORIGINS: 'http://quickbite.vn' }, 'CORS_ORIGINS')).toBe('error');
    expect(levelOf({ ...GOOD, CORS_ORIGINS: 'https://quickbite.vn,http://localhost:5173' }, 'CORS_ORIGINS')).toBe('warn');
    expect(levelOf({ ...GOOD, CORS_ORIGINS: '' }, 'CORS_ORIGINS')).toBe('error');
  });

  it('Vercel: TRUST_PROXY=0 và lưu ảnh trên ổ đĩa → cảnh báo', () => {
    const env = { ...GOOD, VERCEL: '1', TRUST_PROXY: '0' };
    expect(levelOf(env, 'TRUST_PROXY')).toBe('warn');
    expect(levelOf(env, 'UPLOAD_DIR')).toBe('warn');
  });

  it('bật /api/docs, log debug, UPLOAD_DIR tương đối, chưa đặt BACKUP_DIR → cảnh báo; SePay key ngắn → lỗi', () => {
    const env = { ...GOOD, API_DOCS: 'true', LOG_LEVEL: 'debug', UPLOAD_DIR: 'uploads', BACKUP_DIR: undefined, SEPAY_WEBHOOK_API_KEY: 'ngan' };
    expect(levelOf(env, 'API_DOCS')).toBe('warn');
    expect(levelOf(env, 'LOG_LEVEL')).toBe('warn');
    expect(levelOf(env, 'UPLOAD_DIR')).toBe('warn');
    expect(levelOf(env, 'BACKUP_DIR')).toBe('warn');
    expect(levelOf(env, 'SEPAY_WEBHOOK_API_KEY')).toBe('error');
  });
});

describe('kiểm tra database production', () => {
  it('tính số giờ từ bản sao lưu mới nhất của đúng database', () => {
    const now = Date.UTC(2026, 10, 20, 12);
    const files = [
      { name: 'quickbite_backup_2026-11-19_020000.sql.gz', mtimeMs: now - 34 * 3_600_000 },
      { name: 'quickbite_backup_2026-11-20_020000.sql.gz', mtimeMs: now - 10 * 3_600_000 },
      { name: 'quickbite_backup_2026-11-20_020000.json', mtimeMs: now - 60_000 },
      { name: 'khac_backup_2026-11-20_110000.sql.gz', mtimeMs: now - 60_000 },
    ];
    expect(hoursSinceLatestBackup(files, 'quickbite', now)).toBe(10);
    expect(hoursSinceLatestBackup([], 'quickbite', now)).toBeNull();
  });

  it('liệt kê migration chưa áp dụng', () => {
    expect(pendingMigrations(['20261016_init', '20261026_portion', '20261120_new'], ['20261016_init', '20261026_portion'])).toEqual(['20261120_new']);
    expect(pendingMigrations(['a'], ['a'])).toEqual([]);
  });
});
