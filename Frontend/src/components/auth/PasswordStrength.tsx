import { useMemo } from 'react';
import { Progress } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { cn } from '@/utils';

export interface StrengthResult {
  score: number; // 0 - 4
  label: string;
  color: string;
  hasMinLength: boolean;
  hasLetterAndNumber: boolean;
  hasSpecialChar: boolean;
}

export function calculatePasswordStrength(pass: string): StrengthResult {
  if (!pass) {
    return {
      score: 0,
      label: 'Chưa nhập',
      color: '#d9d9d9',
      hasMinLength: false,
      hasLetterAndNumber: false,
      hasSpecialChar: false,
    };
  }

  const hasMinLength = pass.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(pass);
  const hasNumber = /\d/.test(pass);
  const hasLetterAndNumber = hasLetter && hasNumber;
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass);
  const isLonger = pass.length >= 8;

  let score = 0;
  if (hasMinLength) score += 1;
  if (isLonger) score += 1;
  if (hasLetterAndNumber) score += 1;
  if (hasSpecialChar) score += 1;

  switch (score) {
    case 1:
      return { score, label: 'Yếu', color: '#ff4d4f', hasMinLength, hasLetterAndNumber, hasSpecialChar };
    case 2:
      return { score, label: 'Trung bình', color: '#faad14', hasMinLength, hasLetterAndNumber, hasSpecialChar };
    case 3:
      return { score, label: 'Khá tốt', color: '#52c41a', hasMinLength, hasLetterAndNumber, hasSpecialChar };
    case 4:
      return { score, label: 'Rất mạnh', color: '#16a34a', hasMinLength, hasLetterAndNumber, hasSpecialChar };
    default:
      return { score: 0, label: 'Rất yếu', color: '#ff4d4f', hasMinLength, hasLetterAndNumber, hasSpecialChar };
  }
}

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export default function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  if (!password) return null;

  return (
    <div className={cn('mt-2.5 mb-1 rounded-xl bg-gray-50 p-3.5 border border-gray-100 text-left', className)}>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">Độ mạnh mật khẩu:</span>
        <span className="font-bold" style={{ color: strength.color }}>
          {strength.label}
        </span>
      </div>
      <Progress
        percent={(strength.score / 4) * 100}
        showInfo={false}
        strokeColor={strength.color}
        size="small"
        className="!mb-3"
      />

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          {strength.hasMinLength ? (
            <CheckCircleFilled className="text-green-600" />
          ) : (
            <CloseCircleFilled className="text-gray-300" />
          )}
          <span className={strength.hasMinLength ? 'text-gray-800' : 'text-gray-400'}>
            Tối thiểu 6 ký tự
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {strength.hasLetterAndNumber ? (
            <CheckCircleFilled className="text-green-600" />
          ) : (
            <CloseCircleFilled className="text-gray-300" />
          )}
          <span className={strength.hasLetterAndNumber ? 'text-gray-800' : 'text-gray-400'}>
            Bao gồm chữ và số
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {strength.hasSpecialChar ? (
            <CheckCircleFilled className="text-green-600" />
          ) : (
            <CloseCircleFilled className="text-gray-300" />
          )}
          <span className={strength.hasSpecialChar ? 'text-gray-800' : 'text-gray-400'}>
            Ký tự đặc biệt (tùy chọn)
          </span>
        </div>
      </div>
    </div>
  );
}
