import { InputNumber } from 'antd';
import { Plus, Minus } from 'lucide-react';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled,
}: QuantitySelectorProps) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-300">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="flex h-10 w-10 items-center justify-center bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Giảm"
      >
        <Minus className="h-4 w-4" />
      </button>
      <InputNumber
        value={value}
        onChange={(v) => onChange(typeof v === 'number' ? v : min)}
        min={min}
        max={max}
        disabled={disabled}
        controls={false}
        className="!w-14 !text-center"
        style={{ border: 'none', boxShadow: 'none' }}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="flex h-10 w-10 items-center justify-center bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Tăng"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
