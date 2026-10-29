import { useState } from 'react';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { maskEmail, maskPhone, maskAddress } from '@/utils';

type MaskType = 'email' | 'phone' | 'address';

const maskByType: Record<MaskType, (v: string) => string> = {
  email: maskEmail,
  phone: maskPhone,
  address: maskAddress,
};

/* Hiển thị giá trị PII bị che (masked) — click mắt để xem giá trị thật. */

interface MaskedValueProps {
  value?: string | null;
  type?: MaskType;
  /** Mặc định hiện masked; truyền false để mặc định hiện thật */
  defaultRevealed?: boolean;
}

export default function MaskedValue({ value, type = 'email', defaultRevealed = false }: MaskedValueProps) {
  const [revealed, setRevealed] = useState(defaultRevealed);
  const v = value || '—';
  const masked = maskByType[type](v);

  if (!value) return <span className="text-gray-400">—</span>;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={revealed ? '' : 'tracking-wide text-gray-500'}>{revealed ? v : masked}</span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="text-gray-400 transition hover:text-green-600"
        aria-label={revealed ? 'Ẩn thông tin' : 'Hiện thông tin'}
        title={revealed ? 'Ẩn' : 'Hiện'}
      >
        {revealed ? <EyeInvisibleOutlined className="text-xs" /> : <EyeOutlined className="text-xs" />}
      </button>
    </span>
  );
}
