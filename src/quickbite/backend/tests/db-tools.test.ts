import { describe, expect, it } from 'vitest';
import {
  backupFileName,
  compareRowCounts,
  connectionArgs,
  manifestPathOf,
  parseArgs,
  parseDatabaseUrl,
  selectExpiredBackups,
} from '../scripts/db-tools.js';

describe('parseDatabaseUrl (sao lưu / khôi phục)', () => {
  it('đọc thông tin kết nối, giải mã mật khẩu có ký tự đặc biệt; máy local không bật SSL', () => {
    const db = parseDatabaseUrl('mysql://root:p%40ss%3Aw0rd@localhost:3307/quickbite', undefined);
    expect(db).toEqual({ host: 'localhost', port: '3307', user: 'root', password: 'p@ss:w0rd', database: 'quickbite', ssl: false });
  });

  it('database trên cloud (Aiven) hoặc URL có tham số SSL → bật SSL', () => {
    expect(parseDatabaseUrl('mysql://avnadmin:x@mysql-abc.aivencloud.com:28169/defaultdb', undefined).ssl).toBe(true);
    expect(parseDatabaseUrl('mysql://u:x@127.0.0.1/quickbite?sslaccept=strict', undefined).ssl).toBe(true);
    expect(parseDatabaseUrl('mysql://u:x@db.example.com/quickbite', 'false').ssl).toBe(false); // ép tắt
    expect(parseDatabaseUrl('mysql://u:x@localhost/quickbite', 'true').ssl).toBe(true); // ép bật
  });

  it('báo lỗi khi thiếu URL, sai giao thức hoặc tên database lạ (chống chèn lệnh SQL)', () => {
    expect(() => parseDatabaseUrl('', undefined)).toThrow('Thiếu DATABASE_URL');
    expect(() => parseDatabaseUrl('postgres://u:x@localhost/quickbite', undefined)).toThrow('mysql://');
    expect(() => parseDatabaseUrl('mysql://u:x@localhost/qb`;DROP', undefined)).toThrow('không hợp lệ');
  });

  it('tham số dòng lệnh có --ssl-mode=REQUIRED khi cần và KHÔNG chứa mật khẩu', () => {
    const args = connectionArgs(parseDatabaseUrl('mysql://avnadmin:BiMat123@mysql-abc.aivencloud.com:28169/quickbite', undefined));
    expect(args).toContain('--ssl-mode=REQUIRED');
    expect(args).toContain('--port=28169');
    expect(args.join(' ')).not.toContain('BiMat123');
  });
});

describe('tên file và xoá bản sao lưu cũ', () => {
  it('tên file có thời gian đến giây, nhãn được chuẩn hoá; file kiểm tra cùng tên đuôi .json', () => {
    const when = new Date(2026, 10, 20, 2, 5, 9);
    expect(backupFileName('quickbite', when)).toBe('quickbite_backup_2026-11-20_020509.sql.gz');
    expect(backupFileName('quickbite', when, 'Trước Đợt Khôi Phục!')).toBe('quickbite_backup_2026-11-20_020509_truoc-dot-khoi-phuc.sql.gz');
    expect(backupFileName('quickbite', when, 'truoc-khoi-phuc')).toBe('quickbite_backup_2026-11-20_020509_truoc-khoi-phuc.sql.gz');
    expect(manifestPathOf('/b/quickbite_backup_2026-11-20_020509.sql.gz')).toBe('/b/quickbite_backup_2026-11-20_020509.json');
    expect(manifestPathOf('/b/old.sql')).toBe('/b/old.json');
  });

  it('chỉ giữ N bản định kỳ mới nhất; không xoá bản có nhãn, file .json hay database khác', () => {
    const files = [
      'quickbite_backup_2026-11-17_020000.sql.gz',
      'quickbite_backup_2026-11-18_020000.sql.gz',
      'quickbite_backup_2026-11-19_020000.sql.gz',
      'quickbite_backup_2026-11-20_020000.sql.gz',
      'quickbite_backup_2026-10-16_1548.sql', // bản cũ (định dạng tuần 1)
      'quickbite_backup_2026-11-01_090000_truoc-khoi-phuc.sql.gz',
      'quickbite_backup_2026-11-20_020000.json',
      'khac_backup_2026-11-01_020000.sql.gz',
    ];
    expect(selectExpiredBackups(files, 'quickbite', 2)).toEqual([
      'quickbite_backup_2026-11-18_020000.sql.gz',
      'quickbite_backup_2026-11-17_020000.sql.gz',
      'quickbite_backup_2026-10-16_1548.sql',
    ]);
    expect(selectExpiredBackups(files, 'quickbite', 0)).toEqual([]); // 0 = không xoá
    expect(selectExpiredBackups(files, 'quickbite', 10)).toEqual([]);
  });
});

describe('kiểm tra sau khôi phục', () => {
  it('so số dòng từng bảng: chỉ trả về bảng lệch hoặc thiếu', () => {
    expect(compareRowCounts({ users: 10, orders: 5 }, { users: 10, orders: 5 })).toEqual([]);
    expect(compareRowCounts({ users: 10, orders: 5, reviews: 2 }, { users: 10, orders: 4, extra: 1 })).toEqual([
      { table: 'extra', expected: null, actual: 1 },
      { table: 'orders', expected: 5, actual: 4 },
      { table: 'reviews', expected: 2, actual: null },
    ]);
  });

  it('đọc tham số dòng lệnh', () => {
    const { flags, positional } = parseArgs(['a.sql.gz', '--yes', '--database=qb_test', '--confirm=quickbite']);
    expect(positional).toEqual(['a.sql.gz']);
    expect(flags.get('yes')).toBe(true);
    expect(flags.get('database')).toBe('qb_test');
    expect(flags.get('confirm')).toBe('quickbite');
  });
});
