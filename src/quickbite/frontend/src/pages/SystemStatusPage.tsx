import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Database, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { systemService } from '@/services/system.service';

/**
 * Trang kiểm tra kết nối Frontend → API → MySQL (Phase 1).
 * Trang chủ thật sẽ thay thế route "/" ở Phase 3; trang này vẫn giữ ở /trang-thai.
 */
export function SystemStatusPage() {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['system', 'health'],
    queryFn: systemService.health,
  });

  return (
    <section className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold">Trạng thái hệ thống</h1>
      <p className="mt-2 text-navy-500">Kiểm tra kết nối giữa giao diện, API Node.js và cơ sở dữ liệu MySQL.</p>

      <div className="mt-8 rounded-(--radius-card) bg-white p-6 shadow-(--shadow-card)" aria-live="polite">
        <div className="flex items-center gap-3">
          <Database className="size-6 text-navy-400" aria-hidden />
          <span className="font-semibold">API & MySQL</span>
          <span className="ml-auto">
            {isPending ? (
              <span className="inline-flex items-center gap-1.5 text-navy-400">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Đang kiểm tra...
              </span>
            ) : error ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-red-600">
                <XCircle className="size-5" aria-hidden /> Lỗi kết nối
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-green-600">
                <CheckCircle2 className="size-5" aria-hidden /> Đã kết nối ({data.latencyMs} ms)
              </span>
            )}
          </span>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          <RefreshCw className={isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
          Kiểm tra lại
        </button>
      </div>
    </section>
  );
}
