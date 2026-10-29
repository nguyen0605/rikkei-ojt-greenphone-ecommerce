import { useAppSelector } from '@/store/hooks';
import { Breadcrumb } from '@/components/common';
import { FileText, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

/* Hiển thị Điều khoản / Chính sách bảo mật — nội dung HTML lưu trong SETTINGS (DB). */

interface TermsPageProps {
  type: 'terms' | 'privacy';
}

const META: Record<TermsPageProps['type'], { title: string; subtitle: string; icon: ReactNode }> = {
  terms: {
    title: 'Điều khoản sử dụng',
    subtitle: 'Các điều khoản áp dụng khi bạn truy cập và mua sắm tại GreenPhone',
    icon: <FileText className="h-5 w-5" />,
  },
  privacy: {
    title: 'Chính sách bảo mật',
    subtitle: 'Cam kết bảo vệ thông tin cá nhân của khách hàng',
    icon: <ShieldCheck className="h-5 w-5" />,
  },
};

export default function TermsPage({ type }: TermsPageProps) {
  const html = useAppSelector((s) =>
    type === 'terms' ? s.settings.values.TERMS_CONDITIONS : s.settings.values.PRIVACY_POLICY,
  );
  const meta = META[type];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[{ label: 'Trang chủ', href: '/' }, { label: meta.title }]}
        className="mb-6"
      />

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600">
          {meta.icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{meta.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{meta.subtitle}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        {html ? (
          /* Nội dung từ DB (HTML do admin soạn bằng Tiptap) */
          <div
            className="prose-greenphone"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-center text-sm text-gray-400">Nội dung đang được cập nhật...</p>
        )}
      </div>
    </div>
  );
}
