/**
 * Tạo chuỗi dữ liệu mã VietQR (chuẩn EMVCo QR của NAPAS) — chạy hoàn toàn offline,
 * không gọi dịch vụ ngoài. Frontend chỉ cần vẽ chuỗi này thành ảnh QR.
 *
 * Cấu trúc mỗi trường: ID (2 số) + độ dài (2 số) + giá trị.
 *   00 Phiên bản           "01"
 *   01 Kiểu QR             "12" = QR động (có số tiền, dùng 1 lần)
 *   38 Thông tin người nhận: 00 GUID "A000000727" | 01 (00 BIN ngân hàng, 01 số tài khoản) | 02 "QRIBFTTA" (chuyển tới tài khoản)
 *   53 Tiền tệ             "704" (VND)
 *   54 Số tiền
 *   58 Quốc gia            "VN"
 *   62 Dữ liệu bổ sung: 08 nội dung chuyển khoản
 *   63 CRC16-CCITT (4 ký tự hex)
 */

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** CRC-16/CCITT-FALSE (đa thức 0x1021, giá trị đầu 0xFFFF) theo yêu cầu của EMVCo */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(input, 'utf8')) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface VietQrInput {
  bankBin: string;
  accountNo: string;
  /** Số tiền VND (số nguyên dương) */
  amount: number;
  /** Nội dung chuyển khoản: chỉ chữ & số, tối đa 25 ký tự */
  content: string;
}

export function buildVietQrPayload({ bankBin, accountNo, amount, content }: VietQrInput): string {
  if (!/^\d{6}$/.test(bankBin)) throw new Error('Mã BIN ngân hàng không hợp lệ');
  if (!/^[A-Za-z0-9]{1,19}$/.test(accountNo)) throw new Error('Số tài khoản không hợp lệ');
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Số tiền không hợp lệ');
  if (!/^[A-Za-z0-9 ]{1,25}$/.test(content)) throw new Error('Nội dung chuyển khoản không hợp lệ');

  const beneficiary = field('00', bankBin) + field('01', accountNo);
  const merchantInfo = field('00', 'A000000727') + field('01', beneficiary) + field('02', 'QRIBFTTA');
  const body =
    field('00', '01') +
    field('01', '12') +
    field('38', merchantInfo) +
    field('53', '704') +
    field('54', String(amount)) +
    field('58', 'VN') +
    field('62', field('08', content));
  // CRC tính trên toàn bộ chuỗi, gồm cả "6304"
  return `${body}6304${crc16(`${body}6304`)}`;
}

/** Nội dung chuyển khoản từ mã đơn: QB-261016-4F7K → QB2610164F7K (ngân hàng hay bỏ dấu "-") */
export const transferContentFor = (orderNumber: string) => orderNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

/**
 * Tìm mã đơn trong nội dung giao dịch ngân hàng gửi về. App ngân hàng thường thêm/bớt khoảng trắng,
 * dấu gạch, hoặc chèn thêm chữ (vd: "MBVCB.123.QB 261016-4F7K.CT tu ...") nên chuẩn hoá trước khi so.
 */
export function extractTransferContent(raw: string): string | null {
  const normalized = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalized.match(/QB\d{6}[2-9A-HJ-NP-Z]{4}/)?.[0] ?? null;
}

/** Chuẩn hoá tên chủ tài khoản: bỏ dấu tiếng Việt, viết HOA, gộp khoảng trắng */
export function normalizeAccountName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
