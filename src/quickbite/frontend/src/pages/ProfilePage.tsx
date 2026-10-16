import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField, PasswordField } from '@/components/ui/FormField';
import { inputClass } from '@/components/ui/styles';
import { useChangePassword, useCurrentUser, useUpdateProfile } from '@/features/auth/hooks';
import { changePasswordSchema, profileSchema, type ChangePasswordValues, type ProfileValues } from '@/features/auth/schemas';
import { ROLE_LABELS, type User } from '@/features/auth/types';
import { applyServerErrors } from '@/lib/form-errors';
import { formatDate } from '@/lib/utils';

export function ProfilePage() {
  const { data: user } = useCurrentUser();
  if (!user) return null; // ProtectedRoute đảm bảo đã đăng nhập

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold">Tài khoản của tôi</h1>
      <p className="mt-1 text-navy-500">
        {ROLE_LABELS[user.role]} · Tham gia từ {formatDate(user.createdAt)}
      </p>
      <div className="mt-8 space-y-6">
        <ProfileForm user={user} />
        <ChangePasswordForm />
      </div>
    </section>
  );
}

function SectionTitle({ icon: Icon, title, description }: { icon: typeof UserRound; title: string; description: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-navy-500">{description}</p>
      </div>
    </div>
  );
}

function ProfileForm({ user }: { user: User }) {
  const update = useUpdateProfile();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName, phone: user.phone ?? '', studentCode: user.studentCode ?? '' },
  });

  const onSubmit = handleSubmit((values) =>
    update.mutate(values, {
      onSuccess: (updated) => {
        toast.success('Đã lưu thông tin cá nhân');
        reset({ fullName: updated.fullName, phone: updated.phone ?? '', studentCode: updated.studentCode ?? '' });
      },
      onError: (error) => applyServerErrors(error, setError, ['fullName', 'phone', 'studentCode']),
    }),
  );

  return (
    <Card className="p-6">
      <SectionTitle icon={UserRound} title="Thông tin cá nhân" description="Cập nhật họ tên và thông tin liên hệ." />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="profile-email" className="mb-1.5 block text-sm font-medium text-navy-800">
            Email
          </label>
          <input id="profile-email" className={inputClass()} value={user.email} disabled readOnly />
          <p className="mt-1.5 text-xs text-gray-500">Email dùng để đăng nhập, không thể thay đổi.</p>
        </div>
        <FormField label="Họ và tên" required autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mã sinh viên" error={errors.studentCode?.message} {...register('studentCode')} />
          <FormField label="Số điện thoại" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ChangePasswordForm() {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(({ currentPassword, newPassword }) =>
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          reset();
        },
        onError: (error) => applyServerErrors(error, setError, ['currentPassword', 'newPassword']),
      },
    ),
  );

  return (
    <Card className="p-6">
      <SectionTitle
        icon={KeyRound}
        title="Đổi mật khẩu"
        description="Sau khi đổi, các thiết bị khác đang đăng nhập sẽ bị đăng xuất."
      />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <PasswordField
          label="Mật khẩu hiện tại"
          autoComplete="current-password"
          required
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            label="Mật khẩu mới"
            autoComplete="new-password"
            required
            hint="Ít nhất 8 ký tự, gồm cả chữ và số"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordField
            label="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={change.isPending}>
            Đổi mật khẩu
          </Button>
        </div>
      </form>
    </Card>
  );
}
