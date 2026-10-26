import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';
import { inputClass } from '@/components/ui/styles';
import { applyServerErrors } from '@/lib/form-errors';
import { catalogKeys, catalogService } from '@/services/catalog.service';
import { vendorKeys, vendorService } from '@/services/vendor.service';
import type { VendorMenuItem } from '@/types/vendor';
import { cn } from '@/lib/utils';
import { ImageUploader } from './ImageUploader';

const schema = z.object({
  name: z.string().trim().min(2, 'Tên món phải có ít nhất 2 ký tự').max(150, 'Tên món tối đa 150 ký tự'),
  description: z.string().max(2000, 'Mô tả tối đa 2000 ký tự'),
  portion: z.string().trim().max(60, 'Định lượng tối đa 60 ký tự'),
  price: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập giá')
    .refine((v) => /^\d+$/.test(v.replace(/[.,\s]/g, '')), 'Giá chỉ gồm chữ số (VND)')
    .refine((v) => {
      const n = Number(v.replace(/[.,\s]/g, ''));
      return n >= 1000 && n <= 10_000_000;
    }, 'Giá từ 1.000đ đến 10.000.000đ'),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  imageUrl: z.string().nullable(),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
});
type Values = z.infer<typeof schema>;

interface MenuItemFormDialogProps {
  stallId: number;
  /** null = đóng; 'new' = thêm món; object = sửa món */
  item: VendorMenuItem | 'new' | null;
  onClose: () => void;
}

export function MenuItemFormDialog({ stallId, item, onClose }: MenuItemFormDialogProps) {
  const open = item !== null;
  return (
    <Dialog open={open} onClose={onClose} title={item === 'new' ? 'Thêm món mới' : 'Sửa món'} className="max-w-3xl">
      {open && <MenuItemForm key={item === 'new' ? 'new' : item.id} stallId={stallId} item={item === 'new' ? null : item} onDone={onClose} />}
    </Dialog>
  );
}

function MenuItemForm({ stallId, item, onDone }: { stallId: number; item: VendorMenuItem | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: catalogKeys.categories, queryFn: catalogService.categories, staleTime: 5 * 60_000 });

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? '',
      description: item?.description ?? '',
      portion: item?.portion ?? '',
      price: item ? String(Number(item.price)) : '',
      categoryId: item ? String(item.categoryId) : '',
      imageUrl: item?.imageUrl ?? null,
      isAvailable: item?.isAvailable ?? true,
      isFeatured: item?.isFeatured ?? false,
    },
  });

  const save = useMutation({
    mutationFn: (values: Values) => {
      const input = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        portion: values.portion.trim() || null,
        price: Number(values.price.replace(/[.,\s]/g, '')),
        categoryId: Number(values.categoryId),
        imageUrl: values.imageUrl,
        isAvailable: values.isAvailable,
        isFeatured: values.isFeatured,
      };
      return item ? vendorService.updateMenuItem(stallId, item.id, input) : vendorService.createMenuItem(stallId, input);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.menu(stallId) });
      // Thực đơn công khai cũng thay đổi
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      toast.success(item ? `Đã lưu "${saved.name}"` : `Đã thêm "${saved.name}" vào thực đơn`);
      onDone();
    },
    onError: (e) => applyServerErrors(e, setError, ['name', 'description', 'portion', 'price', 'categoryId', 'imageUrl']),
  });

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-6 p-6 pt-4 md:grid-cols-[1fr_240px]">
      <div className="space-y-4">
        <FormField label="Tên món" required error={errors.name?.message} {...register('name')} />
        <FormField
          label="Định lượng"
          placeholder="Vd: 1 tô · 450g, 6 viên, Ly 500ml"
          hint="Không bắt buộc — giúp sinh viên biết phần ăn lớn hay nhỏ"
          maxLength={60}
          error={errors.portion?.message}
          {...register('portion')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Giá (VND)" required inputMode="numeric" placeholder="35000" error={errors.price?.message} {...register('price')} />
          <div>
            <label htmlFor="categoryId" className="mb-1.5 block text-sm font-medium text-navy-800">
              Danh mục <span className="text-brand-600" aria-hidden>*</span>
            </label>
            <select id="categoryId" {...register('categoryId')} aria-invalid={errors.categoryId ? true : undefined} className={inputClass(!!errors.categoryId)}>
              <option value="">— Chọn danh mục —</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p role="alert" className="mt-1.5 text-sm text-red-600">
                {errors.categoryId.message}
              </p>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-navy-800">
            Mô tả
          </label>
          <textarea
            id="description"
            rows={4}
            {...register('description')}
            placeholder="Nguyên liệu, khẩu phần, hương vị..."
            className={cn(inputClass(!!errors.description), 'h-auto resize-none py-2.5')}
          />
          {errors.description && <p className="mt-1.5 text-sm text-red-600">{errors.description.message}</p>}
        </div>
        <div className="flex flex-wrap gap-6">
          <Controller control={control} name="isAvailable" render={({ field }) => <Switch label="Còn món" checked={field.value} onChange={field.onChange} />} />
          <Controller
            control={control}
            name="isFeatured"
            render={({ field }) => <Switch label="Món đề xuất (hiện ở trang chủ)" checked={field.value} onChange={field.onChange} />}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Controller control={control} name="imageUrl" render={({ field }) => <ImageUploader stallId={stallId} value={field.value} onChange={field.onChange} label="Ảnh món" />} />
        {errors.imageUrl && <p className="text-sm text-red-600">{errors.imageUrl.message}</p>}
      </div>

      <div className="flex justify-end gap-2 md:col-span-2">
        <Button variant="outline" onClick={onDone} disabled={save.isPending}>
          Huỷ
        </Button>
        <Button type="submit" loading={save.isPending}>
          {item ? 'Lưu thay đổi' : 'Thêm món'}
        </Button>
      </div>
    </form>
  );
}
