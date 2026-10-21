import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, Loader2, QrCode, TimerOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { useNow } from '@/hooks/use-now';
import { cn, formatCurrency } from '@/lib/utils';
import type { VietQrInfo } from '@/types/models';

/** Thời gian còn lại dạng mm:ss */
function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Vẽ chuỗi VietQR thành ảnh (chạy trong trình duyệt, không gọi dịch vụ ngoài) */
function useQrImage(payload: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!payload) return;
    let active = true;
    QRCode.toDataURL(payload, { width: 560, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#141b31', light: '#ffffff' } })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(null));
    return () => {
      active = false;
    };
  }, [payload]);
  return payload ? src : null;
}

function CopyRow({ label, value, display, emphasize }: { label: string; value: string; display?: string; emphasize?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Đã sao chép ${label.toLowerCase()}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Không sao chép được, vui lòng chép tay');
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-sm text-navy-500">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        <span className={cn('truncate text-right font-semibold', emphasize && 'font-mono text-base text-brand-600')}>{display ?? value}</span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg p-1.5 text-navy-400 transition hover:bg-gray-100 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none"
          aria-label={`Sao chép ${label.toLowerCase()}`}
        >
          {copied ? <Check className="size-4 text-green-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
      </dd>
    </div>
  );
}

/**
 * Khung thanh toán chuyển khoản cho sinh viên: mã QR, thông tin tài khoản quầy (có nút sao chép),
 * nội dung chuyển khoản bắt buộc và thời gian còn lại. Trang cha tự tải lại để biết khi nào tiền về.
 */
export function VietQrPaymentCard({ info, orderNumber, onExpired }: { info: VietQrInfo; orderNumber: string; onExpired?: () => void }) {
  const now = useNow(1000);
  const qrSrc = useQrImage(info.qrPayload);
  const remaining = info.expiresAt ? new Date(info.expiresAt).getTime() - now : null;
  const expired = remaining !== null && remaining <= 0;

  // Hết giờ: báo trang cha tải lại một lần (server huỷ đơn ngay khi được hỏi)
  const notified = useRef(false);
  useEffect(() => {
    if (expired && !notified.current) {
      notified.current = true;
      onExpired?.();
    }
  }, [expired, onExpired]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 bg-navy-900 px-6 py-4 text-white">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <QrCode className="size-5 text-brand-300" aria-hidden /> Quét mã để thanh toán
        </h2>
        {remaining !== null && (
          <span
            className={cn('rounded-full px-3 py-1 font-mono text-sm font-bold', expired ? 'bg-red-500/20 text-red-200' : remaining < 3 * 60_000 ? 'bg-amber-400/20 text-amber-200' : 'bg-white/10')}
            aria-label={expired ? 'Đã hết thời gian thanh toán' : `Còn ${formatCountdown(remaining)} để thanh toán`}
          >
            {expired ? 'Hết hạn' : formatCountdown(remaining)}
          </span>
        )}
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className={cn('relative flex aspect-square w-full max-w-[220px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-2', expired && 'opacity-30')}>
            {qrSrc ? (
              <img src={qrSrc} alt={`Mã VietQR chuyển ${formatCurrency(info.amount)} cho ${info.bankShortName} ${info.accountNo}`} className="size-full" />
            ) : (
              <Loader2 className="size-8 animate-spin text-navy-300" aria-label="Đang tạo mã QR" />
            )}
            {expired && <TimerOff className="absolute size-12 text-red-600" aria-hidden />}
          </div>
          {qrSrc && !expired && (
            <a href={qrSrc} download={`VietQR-${orderNumber}.png`} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
              <Download className="size-4" aria-hidden /> Lưu ảnh mã QR
            </a>
          )}
        </div>

        <div>
          <dl className="divide-y divide-gray-100">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-navy-500">Ngân hàng</dt>
              <dd className="text-right font-semibold" title={info.bankName ?? undefined}>
                {info.bankShortName}
              </dd>
            </div>
            <CopyRow label="Số tài khoản" value={info.accountNo} />
            {info.accountName && (
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-sm text-navy-500">Chủ tài khoản</dt>
                <dd className="text-right font-semibold">{info.accountName}</dd>
              </div>
            )}
            <CopyRow label="Số tiền" value={info.amount} display={formatCurrency(info.amount)} emphasize />
            <CopyRow label="Nội dung" value={info.content} emphasize />
          </dl>

          {expired ? (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              Đã hết thời gian thanh toán, giao dịch này bị huỷ. Nếu bạn đã lỡ chuyển khoản, hãy liên hệ quầy để được hoàn tiền.
            </p>
          ) : (
            <>
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Giữ nguyên <strong>số tiền</strong> và <strong>nội dung {info.content}</strong> để hệ thống nhận ra đơn của bạn. Hết thời gian đếm ngược mà
                chưa nhận được tiền thì <strong>đơn tự huỷ</strong>.
              </p>
              <p role="status" className="mt-3 flex items-center gap-2 text-sm text-navy-500">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Đang chờ xác nhận thanh toán… Trang tự cập nhật khi tiền về.
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
