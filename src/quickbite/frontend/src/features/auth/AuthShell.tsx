import type { ReactNode } from 'react';
import { Clock, MapPin, UtensilsCrossed } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const HIGHLIGHTS = [
  { icon: UtensilsCrossed, text: 'Hàng chục món ngon từ các quầy trong trường' },
  { icon: Clock, text: 'Đặt trước, khỏi xếp hàng giờ cao điểm' },
  { icon: MapPin, text: 'Nhận món tại điểm hẹn gần lớp học' },
];

/** Khung chung cho trang đăng nhập / đăng ký */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
      <div className="hidden lg:block">
        <p className="text-sm font-semibold tracking-wider text-brand-600 uppercase">QuickBite</p>
        <h2 className="mt-3 text-4xl leading-tight font-extrabold text-balance">
          Đói bụng giữa giờ học? <span className="text-brand-500">Đặt món chỉ trong 1 phút.</span>
        </h2>
        <ul className="mt-8 space-y-4">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-navy-600">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                <Icon className="size-5" aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="mt-1.5 text-sm text-navy-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </Card>
    </section>
  );
}
