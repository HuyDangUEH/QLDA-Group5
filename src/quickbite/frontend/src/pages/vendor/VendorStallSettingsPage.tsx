import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';
import { ErrorState, Spinner } from '@/components/ui/States';
import { inputClass } from '@/components/ui/styles';
import { ImageUploader } from '@/features/vendor/ImageUploader';
import { useCurrentStallId } from '@/features/vendor/vendor-stall-context';
import { applyServerErrors } from '@/lib/form-errors';
import { vendorKeys, vendorService } from '@/services/vendor.service';
import type { VendorStallDetail } from '@/types/vendor';
import { cn } from '@/lib/utils';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ không hợp lệ');
const schema = z
  .object({
    description: z.string().max(1000, 'Mô tả tối đa 1000 ký tự'),
    phone: z.string().trim().refine((v) => v === '' || /^(0|\+84)\d{9,10}$/.test(v), 'Số điện thoại không hợp lệ'),
    openTime: time,
    closeTime: time,
    imageUrl: z.string().nullable(),
    isAcceptingOrders: z.boolean(),
  })
  .refine((d) => d.openTime !== d.closeTime || d.openTime === '00:00', {
    path: ['closeTime'],
    message: 'Giờ đóng cửa phải khác giờ mở cửa (đặt 00:00 – 00:00 nếu mở cả ngày)',
  });
type Values = z.infer<typeof schema>;

export function VendorStallSettingsPage() {
  const stallId = useCurrentStallId();
  const { data, isPending, error, refetch } = useQuery({ queryKey: vendorKeys.stall(stallId), queryFn: () => vendorService.stall(stallId) });

  if (isPending) return <Spinner />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  return <SettingsForm key={data.stall.id + data.stall.updatedAt} detail={data} />;
}

function SettingsForm({ detail }: { detail: VendorStallDetail }) {
  const { stall, myRole } = detail;
  const canEdit = myRole !== 'STAFF';
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: stall.description ?? '',
      phone: stall.phone ?? '',
      openTime: stall.openTime,
      closeTime: stall.closeTime,
      imageUrl: stall.imageUrl,
      isAcceptingOrders: stall.isAcceptingOrders,
    },
  });

  const save = useMutation({
    mutationFn: (v: Values) => vendorService.updateStall(stall.id, { ...v, description: v.description.trim() || null, phone: v.phone.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.stall(stall.id) });
      queryClient.invalidateQueries({ queryKey: vendorKeys.stalls });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      toast.success('Đã lưu thông tin quầy');
    },
    onError: (e) => applyServerErrors(e, setError, ['description', 'phone', 'openTime', 'closeTime', 'imageUrl']),
  });

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Thông tin quầy</h1>
      {!canEdit && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-gray-100 p-3 text-sm text-navy-600">
          <Lock className="size-4" aria-hidden /> Bạn là nhân viên quầy nên chỉ xem được thông tin. Liên hệ chủ quầy để thay đổi.
        </p>
      )}

      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="space-y-5 p-6">
          <div>
            <p className="text-sm font-medium text-navy-500">Tên quầy</p>
            <p className="text-xl font-bold">{stall.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-navy-500">
              <MapPin className="size-4" aria-hidden /> {stall.location}
            </p>
            <p className="mt-1 text-xs text-navy-400">Tên và vị trí quầy do quản trị viên quản lý.</p>
          </div>

          <fieldset disabled={!canEdit} className="space-y-5">
            <div>
              <label htmlFor="stall-description" className="mb-1.5 block text-sm font-medium text-navy-800">
                Giới thiệu quầy
              </label>
              <textarea id="stall-description" rows={4} {...register('description')} className={cn(inputClass(!!errors.description), 'h-auto resize-none py-2.5')} />
              {errors.description && <p className="mt-1.5 text-sm text-red-600">{errors.description.message}</p>}
            </div>
            <FormField label="Số điện thoại" type="tel" error={errors.phone?.message} {...register('phone')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Giờ mở cửa" type="time" required error={errors.openTime?.message} {...register('openTime')} />
              <FormField label="Giờ đóng cửa" type="time" required error={errors.closeTime?.message} hint="00:00 – 00:00 = mở cả ngày" {...register('closeTime')} />
            </div>
            <Controller
              control={control}
              name="isAcceptingOrders"
              render={({ field }) => <Switch label="Đang nhận đơn mới" checked={field.value} onChange={field.onChange} disabled={!canEdit} />}
            />
          </fieldset>

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" loading={save.isPending} disabled={!isDirty}>
                Lưu thay đổi
              </Button>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            {canEdit ? (
              <Controller
                control={control}
                name="imageUrl"
                render={({ field }) => <ImageUploader stallId={stall.id} type="stall" value={field.value} onChange={field.onChange} label="Ảnh bìa quầy" aspect="aspect-video" />}
              />
            ) : (
              <p className="text-sm text-navy-500">Ảnh bìa do chủ quầy quản lý.</p>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-bold">
              <Users className="size-4.5 text-brand-500" aria-hidden /> Nhân sự quầy
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {stall.memberships.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{m.user.fullName}</span>
                    <span className="block truncate text-xs text-navy-500">{m.user.email}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold">{m.role === 'OWNER' ? 'Chủ quầy' : 'Nhân viên'}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-navy-400">Thêm / bớt nhân viên do quản trị viên thực hiện.</p>
          </Card>
        </div>
      </form>
    </div>
  );
}
