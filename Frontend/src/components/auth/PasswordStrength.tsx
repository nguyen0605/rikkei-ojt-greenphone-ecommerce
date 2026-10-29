import { cn } from '@/utils';

interface PasswordStrengthProps {
  password: string;
}

function getStrength(
  password: string,
): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: 'bg-gray-200' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const labelMap = ['Yếu', 'Yếu', 'Trung bình', 'Mạnh'];
  const colorMap = ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500'];
  return {
    score: score as 0 | 1 | 2 | 3,
    label: labelMap[score],
    color: colorMap[score],
  };
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < score ? color : 'bg-gray-200',
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          'font-medium',
          score <= 1
            ? 'text-red-500'
            : score === 2
              ? 'text-yellow-600'
              : 'text-green-600',
        )}
      >
        {label}
      </span>
    </div>
  );
}
