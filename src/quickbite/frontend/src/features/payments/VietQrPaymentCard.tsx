import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, Loader2, QrCode, Timer, TimerOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { useNow } from '@/hooks/use-now';
import { cn, formatCurrency } from '@/lib/utils';
import type { VietQrInfo } from '@/types/models';
import { formatCountdown, isRunningOut } from './countdown';

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
export function VietQrPaymentCard({
  info,
  orderNumber,
  startedAt,
  onExpired,
}: {
  info: VietQrInfo;
  orderNumber: string;
  /** Thời điểm đặt đơn — để vẽ thanh thời gian còn lại */
  startedAt?: string;
  onExpired?: () => void;
}) {
  const now = useNow(1000);
  const qrSrc = useQrImage(info.qrPayload);
  const expiresAt = info.expiresAt ? new Date(info.expiresAt).getTime() : null;
  const remaining = expiresAt !== null ? expiresAt - now : null;
  const expired = remaining !== null && remaining <= 0;
  const totalMs = expiresAt !== null && startedAt ? expiresAt - new Date(startedAt).getTime() : null;
  const percent = remaining !== null && totalMs ? Math.min(100, Math.max(0, (remaining / totalMs) * 100)) : null;
  const warn = remaining !== null && isRunningOut(remaining);

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
      </div>

      {/* Đồng hồ đếm ngược: hết giờ chưa nhận tiền thì đơn tự huỷ */}
      {remaining !== null && (
        <div className={cn('border-b px-6 py-4', expired ? 'border-red-100 bg-red-50' : warn ? 'border-amber-100 bg-amber-50' : 'border-brand-100 bg-brand-50')}>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p className={cn('flex items-center gap-2 text-sm font-semibold', expired ? 'text-red-700' : warn ? 'text-amber-800' : 'text-navy-700')}>
              <Timer className="size-5" aria-hidden />
              {expired ? 'Đã hết thời gian thanh toán' : 'Thời gian còn lại để chuyển khoản'}
            </p>
            <p
              role="timer"
              aria-live="off"
              aria-label={expired ? 'Đã hết thời gian thanh toán' : `Còn ${formatCountdown(remaining)} để thanh toán`}
              className={cn('font-mono text-3xl font-extrabold tabular-nums', expired ? 'text-red-600' : warn ? 'text-amber-700' : 'text-brand-600')}
            >
              {expired ? '00:00' : formatCountdown(remaining)}
            </p>
          </div>
          {percent !== null && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" aria-hidden>
              <div
                className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', expired ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-brand-500')}
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
          {!expired && <p className="mt-1.5 text-xs text-navy-500">Hết giờ mà chưa nhận được tiền, đơn sẽ tự huỷ.</p>}
        </div>
      )}

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
