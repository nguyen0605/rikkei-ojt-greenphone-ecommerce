import React from 'react';
import type { PhoneDTO } from '@/types/api';
import ChatProductCard from './ChatProductCard';
import { Bot, User } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  suggestedPhones?: PhoneDTO[];
  timestamp: number;
}

interface ChatMessageItemProps {
  message: ChatMessage;
  onProductSelect?: () => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, onProductSelect }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} my-1`}>
      <div className={`flex items-start gap-2.5 max-w-[92%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs shadow-xs ${
            isUser ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}
        >
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xs ${
            isUser
              ? 'bg-emerald-600 text-white rounded-tr-none'
              : 'bg-white text-gray-800 border border-gray-200/90 rounded-tl-none ring-1 ring-black/5'
          }`}
        >
          {isUser && message.imageUrl && (
            <div className="mb-2 overflow-hidden rounded-xl border border-white/20 max-w-[220px]">
              <img
                src={message.imageUrl}
                alt="Ảnh gửi kèm"
                className="w-full h-auto max-h-[160px] object-cover"
              />
            </div>
          )}
          <div className="whitespace-pre-wrap break-words">{message.text}</div>
        </div>
      </div>

      {!isUser && message.suggestedPhones && message.suggestedPhones.length > 0 && (
        <div className="w-full mt-2.5 pl-10">
          <div className="text-xs font-semibold text-gray-600 mb-1.5">
            Sản phẩm đề xuất cho bạn ({message.suggestedPhones.length}):
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 scrollbar-thin">
            {message.suggestedPhones.map((phone) => (
              <ChatProductCard key={phone.id} phone={phone} onSelect={onProductSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessageItem;
