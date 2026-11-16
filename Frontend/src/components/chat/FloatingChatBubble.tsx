import React from 'react';
import { Bot } from 'lucide-react';

interface FloatingChatBubbleProps {
  onClick: () => void;
  unreadCount?: number;
}

export const FloatingChatBubble: React.FC<FloatingChatBubbleProps> = ({ onClick, unreadCount = 0 }) => {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Mở khung trợ lý AI GreenPhone"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-[52px] h-[52px] rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xl cursor-pointer flex items-center justify-center transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
    >
      <Bot className="w-6 h-6 transition-transform group-hover:scale-110" />

      {/* Cham xanh bao truc tuyen */}
      <span
        title="Trực tuyến"
        className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full shadow-sm"
      />

      {/* Cham do bao tin nhan moi chua doc */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -left-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] font-bold rounded-full border-2 border-white flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
};

export default FloatingChatBubble;
