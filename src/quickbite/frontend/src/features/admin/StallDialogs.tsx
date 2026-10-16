import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';
import { inputClass } from '@/components/ui/styles';
import { applyServerErrors } from '@/lib/form-errors';
import { toApiError } from '@/lib/api-client';
import { adminKeys, adminService } from '@/services/admin.service';
import type { AdminStall } from '@/types/admin';
import { cn } from '@/lib/utils';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ không hợp lệ');
const schema = z.object({
  name: z.string().trim().min(2, 'Tên quầy phải có ít nhất 2 ký tự').max(120),
  slug: z.string().trim().refine((v) => v === '' || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), 'Chỉ gồm chữ thường không dấu, số và dấu gạch ngang'),
  location: z.string().trim().min(2, 'Vui lòng nhập vị trí'),
  description: z.string().max(1000),
  phone: z.string().trim().refine((v) => v === '' || /^(0|\+84)\d{9,10}$/.test(v), 'Số điện thoại không hợp lệ'),
  openTime: time,
  closeTime: time,
  imageUrl: z
    .string()
    .trim()
    .refine((v) => v === '' || v.startsWith('/uploads/') || v.startsWith('/images/') || /^https:\/\//.test(v), 'Ảnh phải là /images/..., /uploads/... hoặc https://'),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

const invalidateStalls = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: adminKeys.stalls });
  qc.invalidateQueries({ queryKey: adminKeys.dashboard });
  qc.invalidateQueries({ queryKey: ['catalog'] });
};

/** Thêm / sửa quầy (stall = 'new' để thêm mới) */
export function StallFormDialog({ stall, onClose }: { stall: AdminStall | 'new' | null; onClose: () => void }) {
  return (
    <Dialog open={stall !== null} onClose={onClose} title={stall === 'new' ? 'Thêm quầy ăn' : 'Sửa quầy ăn'} className="max-w-2xl">
      {stall !== null && <StallForm key={stall === 'new' ? 'new' : stall.id} stall={stall === 'new' ? null : stall} onDone={onClose} />}
    </Dialog>
  );
}

function StallForm({ stall, onDone }: { stall: AdminStall | null; onDone: () => void }) {
  const qc = useQueryClient();
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: stall?.name ?? '',
      slug: stall?.slug ?? '',
      location: stall?.location ?? '',
      description: stall?.description ?? '',
      phone: stall?.phone ?? '',
      openTime: stall?.openTime ?? '07:00',
      closeTime: stall?.closeTime ?? '20:00',
      imageUrl: stall?.imageUrl ?? '',
      isActive: stall?.isActive ?? true,
    },
  });

  const save = useMutation({
    mutationFn: (v: Values) => {
      const input = { ...v, slug: v.slug || undefined, description: v.description.trim() || null, phone: v.phone || null, imageUrl: v.imageUrl || null };
      return stall ? adminService.updateStall(stall.id, input) : adminService.createStall(input);
    },
    onSuccess: (saved) => {
      invalidateStalls(qc);
      toast.success(stall ? `Đã lưu "${saved.name}"` : `Đã tạo quầy "${saved.name}". Hãy gán chủ quầy để bắt đầu bán.`);
      onDone();
    },
    onError: (e) => applyServerErrors(e, setError, ['name', 'slug', 'location', 'description', 'phone', 'openTime', 'closeTime', 'imageUrl']),
  });

  return (
    <form noValidate className="grid gap-4 p-6 pt-4 sm:grid-cols-2" onSubmit={handleSubmit((v) => save.mutate(v))}>
      <FormField label="Tên quầy" required error={errors.name?.message} {...register('name')} />
      <FormField label="Slug (đường dẫn)" placeholder="Tự tạo từ tên nếu để trống" error={errors.slug?.message} {...register('slug')} />
      <FormField className="sm:col-span-2" label="Vị trí" required placeholder="Vd: Căn tin tòa A, quầy số 2" error={errors.location?.message} {...register('location')} />
      <div className="sm:col-span-2">
        <label htmlFor="stall-desc" className="mb-1.5 block text-sm font-medium text-navy-800">
          Giới thiệu
        </label>
        <textarea id="stall-desc" rows={3} {...register('description')} className={cn(inputClass(), 'h-auto resize-none py-2.5')} />
      </div>
      <FormField label="Số điện thoại" type="tel" error={errors.phone?.message} {...register('phone')} />
      <FormField label="Ảnh bìa (URL)" placeholder="https://..." error={errors.imageUrl?.message} {...register('imageUrl')} />
      <FormField label="Giờ mở cửa" type="time" required error={errors.openTime?.message} {...register('openTime')} />
      <FormField label="Giờ đóng cửa" type="time" required error={errors.closeTime?.message} {...register('closeTime')} />
      <div className="sm:col-span-2">
        <Controller control={control} name="isActive" render={({ field }) => <Switch label="Quầy đang hoạt động (hiển thị cho sinh viên)" checked={field.value} onChange={field.onChange} />} />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="outline" onClick={onDone}>
          Huỷ
        </Button>
        <Button type="submit" loading={save.isPending}>
          {stall ? 'Lưu thay đổi' : 'Tạo quầy'}
        </Button>
      </div>
    </form>
  );
}

/** Quản lý nhân sự của một quầy: thêm bằng email, đổi vai trò, gỡ */
export function StallMembersDialog({ stall, onClose }: { stall: AdminStall | null; onClose: () => void }) {
  return (
    <Dialog open={stall !== null} onClose={onClose} title={stall ? `Nhân sự: ${stall.name}` : 'Nhân sự quầy'} className="max-w-xl">
      {stall && <StallMembers key={stall.id} stall={stall} />}
    </Dialog>
  );
}

function StallMembers({ stall: initial }: { stall: AdminStall }) {
  const qc = useQueryClient();
  const [stall, setStall] = useState(initial);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'OWNER' | 'STAFF'>('STAFF');
  const [emailError, setEmailError] = useState('');
  const [removing, setRemoving] = useState<AdminStall['memberships'][number] | null>(null);

  const onUpdated = (updated: AdminStall) => {
    setStall(updated);
    invalidateStalls(qc);
    qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  };
  const onError = (e: unknown) => toast.error(toApiError(e).message);

  const add = useMutation({
    mutationFn: () => adminService.addMember(stall.id, email.trim(), role),
    onSuccess: (updated) => {
      onUpdated(updated);
      setEmail('');
      toast.success('Đã thêm nhân sự vào quầy');
    },
    onError: (e) => setEmailError(toApiError(e).message),
  });
  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'OWNER' | 'STAFF' }) => adminService.updateMember(stall.id, userId, role),
    onSuccess: onUpdated,
    onError,
  });
  const remove = useMutation({
    mutationFn: (userId: number) => adminService.removeMember(stall.id, userId),
    onSuccess: (updated) => {
      onUpdated(updated);
      setRemoving(null);
      toast.success('Đã gỡ nhân sự khỏi quầy');
    },
    onError,
  });

  return (
    <div className="space-y-5 p-6 pt-4">
      {stall.memberships.length === 0 ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Quầy chưa có chủ quầy. Hãy thêm ít nhất một chủ quầy.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {stall.memberships.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.user.fullName}</p>
                <p className="truncate text-xs text-navy-500">{m.user.email}</p>
              </div>
              <label htmlFor={`member-role-${m.id}`} className="sr-only">
                Vai trò của {m.user.fullName}
              </label>
              <select
                id={`member-role-${m.id}`}
                value={m.role}
                disabled={changeRole.isPending}
                onChange={(e) => changeRole.mutate({ userId: m.user.id, role: e.target.value as 'OWNER' | 'STAFF' })}
                className={cn(inputClass(), 'h-9 w-32')}
              >
                <option value="OWNER">Chủ quầy</option>
                <option value="STAFF">Nhân viên</option>
              </select>
              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setRemoving(m)} aria-label={`Gỡ ${m.user.fullName} khỏi quầy`}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        noValidate
        className="rounded-xl bg-gray-50 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setEmailError('Vui lòng nhập email hợp lệ');
          setEmailError('');
          add.mutate();
        }}
      >
        <p className="mb-3 text-sm font-semibold">Thêm nhân sự</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="member-email" className="sr-only">
              Email người dùng
            </label>
            <input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              placeholder="Email tài khoản (vai trò Chủ quầy)"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'member-email-error' : 'member-email-hint'}
              className={inputClass(!!emailError)}
            />
          </div>
          <label htmlFor="member-new-role" className="sr-only">
            Vai trò tại quầy
          </label>
          <select id="member-new-role" value={role} onChange={(e) => setRole(e.target.value as 'OWNER' | 'STAFF')} className={cn(inputClass(), 'sm:w-36')}>
            <option value="STAFF">Nhân viên</option>
            <option value="OWNER">Chủ quầy</option>
          </select>
          <Button type="submit" loading={add.isPending}>
            <UserPlus className="size-4" aria-hidden /> Thêm
          </Button>
        </div>
        {emailError ? (
          <p id="member-email-error" role="alert" className="mt-2 text-sm text-red-600">
            {emailError}
          </p>
        ) : (
          <p id="member-email-hint" className="mt-2 text-xs text-navy-500">
            Người dùng phải có vai trò "Chủ quầy". Đổi vai trò ở trang Người dùng nếu cần.
          </p>
        )}
      </form>

      <ConfirmDialog
        open={removing !== null}
        title={`Gỡ ${removing?.user.fullName} khỏi quầy?`}
        description="Người này sẽ không còn truy cập được khu vực quản lý của quầy."
        confirmLabel="Gỡ khỏi quầy"
        tone="danger"
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.user.id)}
      />
    </div>
  );
}
