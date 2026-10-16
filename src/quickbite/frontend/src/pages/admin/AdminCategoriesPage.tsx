import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/FormField';
import { SelectField } from '@/components/ui/SelectField';
import { ErrorState } from '@/components/ui/States';
import { Switch } from '@/components/ui/Switch';
import { PageHeader } from '@/features/admin/PageHeader';
import { categoryIcon } from '@/features/food-discovery/category-icons';
import { applyServerErrors } from '@/lib/form-errors';
import { toApiError } from '@/lib/api-client';
import { adminKeys, adminService } from '@/services/admin.service';
import type { AdminCategory } from '@/types/admin';

const ICON_OPTIONS = [
  { value: 'utensils', label: 'Dao nĩa (món chính)' },
  { value: 'soup', label: 'Tô (bún, phở, mì)' },
  { value: 'sandwich', label: 'Bánh mì / ăn nhanh' },
  { value: 'cup-soda', label: 'Ly nước (đồ uống)' },
  { value: 'cookie', label: 'Bánh (ăn vặt)' },
  { value: 'salad', label: 'Salad (healthy)' },
];

const schema = z.object({
  name: z.string().trim().min(2, 'Tên danh mục phải có ít nhất 2 ký tự').max(80),
  description: z.string().max(255),
  icon: z.string(),
  sortOrder: z.string().refine((v) => /^\d{1,3}$/.test(v), 'Thứ tự là số từ 0 đến 999'),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const { data, isPending, error, refetch } = useQuery({ queryKey: adminKeys.categories, queryFn: adminService.categories });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: adminKeys.categories });
    qc.invalidateQueries({ queryKey: ['catalog'] });
  };
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => adminService.updateCategory(id, { isActive }),
    onSuccess: (c) => {
      invalidate();
      toast.success(c.isActive ? `Đã bật danh mục "${c.name}"` : `Đã ẩn danh mục "${c.name}" và các món trong đó`);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  const remove = useMutation({
    mutationFn: (id: number) => adminService.deleteCategory(id),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast.success('Đã xoá danh mục');
    },
    onError: (e) => {
      setDeleting(null);
      toast.error(toApiError(e).message);
    },
  });

  const columns: Column<AdminCategory>[] = [
    {
      key: 'name',
      header: 'Danh mục',
      cell: (c) => {
        const Icon = categoryIcon(c.icon);
        return (
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
              <Icon className="size-4.5" aria-hidden />
            </span>
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-navy-500">/{c.slug}</p>
            </div>
          </div>
        );
      },
    },
    { key: 'desc', header: 'Mô tả', cell: (c) => <span className="text-navy-600">{c.description ?? '—'}</span> },
    { key: 'items', header: 'Số món', align: 'right', cell: (c) => c.itemCount },
    { key: 'order', header: 'Thứ tự', align: 'right', cell: (c) => c.sortOrder },
    {
      key: 'active',
      header: 'Hiển thị',
      cell: (c) => <Switch size="sm" hideLabel label={`Hiển thị danh mục ${c.name}`} checked={c.isActive} disabled={toggle.isPending} onChange={(v) => toggle.mutate({ id: c.id, isActive: v })} />,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Thao tác</span>,
      align: 'right',
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(c)} aria-label={`Sửa ${c.name}`}>
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            disabled={c.itemCount > 0}
            title={c.itemCount > 0 ? 'Danh mục còn món, hãy ẩn thay vì xoá' : undefined}
            onClick={() => setDeleting(c)}
            aria-label={`Xoá ${c.name}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Danh mục món ăn"
        description="Danh mục hiển thị trên trang chủ và bộ lọc. Danh mục còn món chỉ có thể ẩn, không xoá."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden /> Thêm danh mục
          </Button>
        }
      />
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : (
        <DataTable caption="Danh mục món ăn" columns={columns} rows={data} rowKey={(c) => c.id} loading={isPending} />
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Thêm danh mục' : 'Sửa danh mục'} className="max-w-lg">
        {editing !== null && <CategoryForm key={editing === 'new' ? 'new' : editing.id} category={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        title={`Xoá danh mục "${deleting?.name}"?`}
        description="Danh mục chưa có món nào nên có thể xoá vĩnh viễn."
        confirmLabel="Xoá"
        tone="danger"
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}

function CategoryForm({ category, onDone }: { category: AdminCategory | null; onDone: () => void }) {
  const qc = useQueryClient();
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? '',
      description: category?.description ?? '',
      icon: category?.icon ?? 'utensils',
      sortOrder: String(category?.sortOrder ?? 0),
      isActive: category?.isActive ?? true,
    },
  });
  const save = useMutation({
    mutationFn: (v: Values) => {
      const input = { name: v.name, description: v.description.trim() || null, icon: v.icon, sortOrder: Number(v.sortOrder), isActive: v.isActive };
      return category ? adminService.updateCategory(category.id, input) : adminService.createCategory(input);
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: adminKeys.categories });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      toast.success(category ? `Đã lưu "${c.name}"` : `Đã thêm danh mục "${c.name}"`);
      onDone();
    },
    onError: (e) => applyServerErrors(e, setError, ['name', 'description', 'icon', 'sortOrder']),
  });

  return (
    <form noValidate className="space-y-4 p-6 pt-4" onSubmit={handleSubmit((v) => save.mutate(v))}>
      <FormField label="Tên danh mục" required error={errors.name?.message} {...register('name')} />
      <FormField label="Mô tả ngắn" error={errors.description?.message} {...register('description')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Biểu tượng" options={ICON_OPTIONS} {...register('icon')} />
        <FormField label="Thứ tự hiển thị" inputMode="numeric" hint="Số nhỏ hiển thị trước" error={errors.sortOrder?.message} {...register('sortOrder')} />
      </div>
      <Controller control={control} name="isActive" render={({ field }) => <Switch label="Hiển thị cho sinh viên" checked={field.value} onChange={field.onChange} />} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>
          Huỷ
        </Button>
        <Button type="submit" loading={save.isPending}>
          {category ? 'Lưu' : 'Thêm'}
        </Button>
      </div>
    </form>
  );
}
