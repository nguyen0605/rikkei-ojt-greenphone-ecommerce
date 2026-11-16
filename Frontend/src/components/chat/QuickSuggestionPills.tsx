import React, { useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface QuickSuggestionPillsProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

const DEFAULT_SUGGESTIONS = [
  'Máy chụp ảnh đẹp dưới 15 triệu',
  'Điện thoại pin trâu chơi game tốt',
  'Tư vấn iPhone tầm giá 20 triệu',
  'Samsung mới nhất có khuyến mãi gì?',
  'Điện thoại giá rẻ dưới 5 triệu',
  'Máy Xiaomi cấu hình mạnh',
  'Chính sách bảo hành và đổi trả',
];

export const QuickSuggestionPills: React.FC<QuickSuggestionPillsProps> = ({ onSelect, disabled }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  // Xu ly keo chuot ngang (Drag to scroll)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    setIsMouseDown(true);
    setHasDragged(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftPos(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // toc do luot
    if (Math.abs(walk) > 5) {
      setHasDragged(true);
    }
    scrollRef.current.scrollLeft = scrollLeftPos - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsMouseDown(false);
  };

  return (
    <div className="py-2 px-3 bg-white border-t border-gray-100 flex-shrink-0 select-none">
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 py-0.5 ${
          isMouseDown ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold flex-shrink-0 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs pointer-events-none">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Gợi ý:</span>
        </div>
        {DEFAULT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            onClick={() => {
              // Chi kich hoat click khi khong phai thao tac keo re chuot
              if (!hasDragged) {
                onSelect(suggestion);
              }
            }}
            className="text-left text-xs whitespace-nowrap flex-shrink-0 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-gray-700 border border-gray-200 rounded-full px-3 py-1 transition-colors shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickSuggestionPills;
