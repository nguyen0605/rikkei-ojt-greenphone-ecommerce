import { Input } from 'antd';
import { Search } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
  className?: string;
}

export default function SearchBar({
  placeholder = 'Bạn đang tìm điện thoại gì?',
  onSearch,
  className,
}: SearchBarProps) {
  return (
    <Input.Search
      size="large"
      placeholder={placeholder}
      prefix={<Search className="h-4 w-4 text-gray-400" />}
      allowClear
      enterButton
      onSearch={(value) => {
        // Input.Search fires onSearch on clear too; guard empty value
        if (!value.trim()) return;
        onSearch?.(value.trim());
      }}
      className={className}
    />
  );
}