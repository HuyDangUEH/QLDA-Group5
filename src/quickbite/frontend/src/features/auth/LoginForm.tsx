import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { FormField, PasswordField } from '@/components/ui/FormField';
import { applyServerErrors } from '@/lib/form-errors';
import { useLogin } from './hooks';
import { loginSchema, type LoginValues } from './schemas';
import type { User } from './types';

export function LoginForm({ onSuccess }: { onSuccess: (user: User) => void }) {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess,
      onError: (error) => applyServerErrors(error, setError, ['email', 'password']),
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="ban@truong.edu.vn"
        required
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordField
        label="Mật khẩu"
        autoComplete="current-password"
        required
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
        Đăng nhập
      </Button>
    </form>
  );
}
