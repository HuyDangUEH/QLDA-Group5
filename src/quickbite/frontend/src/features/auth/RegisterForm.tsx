import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { FormField, PasswordField } from '@/components/ui/FormField';
import { applyServerErrors } from '@/lib/form-errors';
import { useRegister } from './hooks';
import { registerSchema, type RegisterValues } from './schemas';
import type { User } from './types';

export function RegisterForm({ onSuccess }: { onSuccess: (user: User) => void }) {
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', phone: '', studentCode: '' },
  });

  const onSubmit = handleSubmit(({ confirmPassword: _confirm, ...values }) =>
    registerMutation.mutate(values, {
      onSuccess,
      onError: (error) => applyServerErrors(error, setError, ['fullName', 'email', 'password', 'phone', 'studentCode']),
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField label="Họ và tên" autoComplete="name" required error={errors.fullName?.message} {...register('fullName')} />
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="ban@truong.edu.vn"
        required
        error={errors.email?.message}
        {...register('email')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Mã sinh viên" error={errors.studentCode?.message} {...register('studentCode')} />
        <FormField label="Số điện thoại" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
      </div>
      <PasswordField
        label="Mật khẩu"
        autoComplete="new-password"
        required
        hint="Ít nhất 8 ký tự, gồm cả chữ và số"
        error={errors.password?.message}
        {...register('password')}
      />
      <PasswordField
        label="Nhập lại mật khẩu"
        autoComplete="new-password"
        required
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <Button type="submit" size="lg" className="w-full" loading={registerMutation.isPending}>
        Tạo tài khoản
      </Button>
    </form>
  );
}
