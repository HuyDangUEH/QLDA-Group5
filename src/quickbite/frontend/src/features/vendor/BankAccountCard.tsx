import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { SelectField } from '@/components/ui/SelectField';
import { ErrorState, Spinner } from '@/components/ui/States';
import { applyServerErrors } from '@/lib/form-errors';
import { orderKeys, ordersService } from '@/services/orders.service';
import { vendorKeys, vendorService } from '@/services/vendor.service';
import type { VendorStall } from '@/types/vendor';

/** Bỏ dấu tiếng Việt, viết HOA — giống tên trên app ngân hàng (server cũng chuẩn hoá lại) */
const toAccountName = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase();

const schema = z.object({
  bankBin: z.string().min(1, 'Vui lòng chọn ngân hàng'),
  accountNo: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6,19}$/, 'Số tài khoản gồm 6–19 chữ số, không có khoảng trắng'),
  accountName: z.string().trim().min(2, 'Vui lòng nhập tên chủ tài khoản').max(50, 'Tên chủ tài khoản tối đa 50 ký tự'),
  /** Giá trị của ô chọn (chuỗi), đổi sang số khi gửi */
  paymentTimeoutMinutes: z.string(),
});
type Values = z.infer<typeof schema>;

/** Các lựa chọn số phút chờ chuyển khoản (server cho phép 5–60) */
const TIMEOUT_OPTIONS = [5, 10, 15, 20, 30, 45, 60].map((m) => ({ value: String(m), label: `${m} phút` }));

/** Chủ quầy cài tài khoản nhận chuyển khoản VietQR. Nhân viên chỉ xem. */
export function BankAccountCard({ stall, canEdit }: { stall: VendorStall; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const banks = useQuery({ queryKey: orderKeys.banks, queryFn: ordersService.banks, staleTime: Infinity });
  const [disableOpen, setDisableOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      bankBin: stall.bankBin ?? '',
      accountNo: stall.bankAccountNo ?? '',
      accountName: stall.bankAccountName ?? '',
      paymentTimeoutMinutes: String(stall.paymentTimeoutMinutes),
    },
  });

  const save = useMutation({
    mutationFn: (values: Values | null) =>
      vendorService.updateStall(
        stall.id,
        values
          ? {
              bankAccount: { bankBin: values.bankBin, accountNo: values.accountNo, accountName: values.accountName },
              paymentTimeoutMinutes: Number(values.paymentTimeoutMinutes),
            }
          : { bankAccount: null },
      ),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.stall(stall.id) });
      queryClient.invalidateQueries({ queryKey: vendorKeys.stalls });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      setDisableOpen(false);
      toast.success(updated.acceptsVietQr ? 'Đã lưu tài khoản nhận chuyển khoản' : 'Đã tắt thanh toán chuyển khoản');
    },
    onError: (e) => {
      setDisableOpen(false);
      applyServerErrors(e, setError, ['bankBin', 'accountNo', 'accountName', 'paymentTimeoutMinutes']);
    },
  });

  // Chờ có danh sách ngân hàng rồi mới dựng ô chọn, để ô chọn hiện đúng ngân hàng đã lưu
  if (banks.isPending || banks.error) {
    return (
      <Card className="p-6">
        {banks.error ? <ErrorState message={banks.error.message} onRetry={() => banks.refetch()} /> : <Spinner label="Đang tải danh sách ngân hàng..." />}
      </Card>
    );
  }

  const bankOptions = [{ value: '', label: '— Chọn ngân hàng —' }, ...banks.data.map((b) => ({ value: b.bin, label: `${b.shortName} — ${b.name}` }))];
  const accountName = register('accountName');

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 font-bold">
        <Landmark className="size-4.5 text-brand-500" aria-hidden /> Nhận chuyển khoản VietQR
      </h2>
      <p className="mt-1 text-sm text-navy-500">
        {stall.acceptsVietQr
          ? 'Sinh viên có thể quét mã QR để chuyển tiền thẳng vào tài khoản này khi đặt món.'
          : 'Chưa bật. Nhập tài khoản ngân hàng để sinh viên thanh toán bằng mã QR.'}
      </p>

      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="mt-4">
        <fieldset disabled={!canEdit} className="space-y-4">
          <SelectField label="Ngân hàng" required options={bankOptions} error={errors.bankBin?.message} {...register('bankBin')} />
          <FormField label="Số tài khoản" required inputMode="numeric" autoComplete="off" error={errors.accountNo?.message} {...register('accountNo')} />
          <FormField
            label="Tên chủ tài khoản"
            required
            autoComplete="off"
            hint="Viết HOA không dấu, đúng như trên app ngân hàng"
            error={errors.accountName?.message}
            {...accountName}
            onBlur={(e) => {
              setValue('accountName', toAccountName(e.target.value).trim(), { shouldDirty: true });
              return accountName.onBlur(e);
            }}
          />
          <SelectField
            label="Thời gian chờ chuyển khoản"
            options={
              TIMEOUT_OPTIONS.some((o) => o.value === String(stall.paymentTimeoutMinutes))
                ? TIMEOUT_OPTIONS
                : [...TIMEOUT_OPTIONS, { value: String(stall.paymentTimeoutMinutes), label: `${stall.paymentTimeoutMinutes} phút` }]
            }
            error={errors.paymentTimeoutMinutes?.message}
            {...register('paymentTimeoutMinutes')}
          />
          <p className="-mt-2 text-xs text-navy-400">Hết thời gian này mà chưa nhận được tiền, đơn và mã QR tự huỷ.</p>
        </fieldset>

        {canEdit ? (
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {stall.acceptsVietQr && (
              <Button type="button" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => setDisableOpen(true)}>
                Tắt chuyển khoản
              </Button>
            )}
            <Button type="submit" loading={save.isPending && save.variables !== null} disabled={!isDirty}>
              Lưu tài khoản
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-navy-400">Chỉ chủ quầy được thay đổi tài khoản nhận tiền.</p>
        )}
      </form>

      <ConfirmDialog
        open={disableOpen}
        title="Tắt thanh toán chuyển khoản?"
        description="Sinh viên sẽ chỉ còn trả tiền mặt khi nhận món. Đơn chuyển khoản đang chờ vẫn dùng tài khoản cũ."
        confirmLabel="Tắt chuyển khoản"
        cancelLabel="Quay lại"
        tone="danger"
        loading={save.isPending}
        onCancel={() => setDisableOpen(false)}
        onConfirm={() => save.mutate(null)}
      />
    </Card>
  );
}
