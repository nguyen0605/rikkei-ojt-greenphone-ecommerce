import React, { useState, useEffect, useRef } from 'react';
import FloatingChatBubble from './FloatingChatBubble';
import ChatMessageItem, { type ChatMessage } from './ChatMessageItem';
import QuickSuggestionPills from './QuickSuggestionPills';
import { aiService, type AiChatMessage } from '@/services/aiService';
import { Bot, Minus, X, Send, RotateCcw, Loader2, Plus, Image as ImageIcon } from 'lucide-react';

export type ChatWidgetState = 'CLOSED' | 'MINIMIZED' | 'EXPANDED';

const STORAGE_KEY = 'greenphone_ai_chat_history';

const INITIAL_BOT_MESSAGE: ChatMessage = {
  id: 'welcome-msg',
  role: 'model',
  text: 'Dạ GreenPhone xin chào bạn! Mình là Trợ lý AI tư vấn sản phẩm thông minh của GreenPhone. Bạn có thể gửi câu hỏi hoặc nhấn nút (+) để tải ảnh điện thoại cần nhận diện, mình sẽ tư vấn ngay nhé!',
  timestamp: Date.now(),
};

interface SelectedImageState {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export const AiChatWidget: React.FC = () => {
  const [widgetState, setWidgetState] = useState<ChatWidgetState>('MINIMIZED');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [INITIAL_BOT_MESSAGE];
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<SelectedImageState | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dong bo lich su tro chuyen vao sessionStorage de bao toan 100% khi thu nho/mo lai
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore
    }
  }, [messages]);

  // Tu dong cuon xuong duoi cung khi co tin nhan moi
  useEffect(() => {
    if (widgetState === 'EXPANDED') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages, widgetState]);

  // Focus input khi mo khung chat
  useEffect(() => {
    if (widgetState === 'EXPANDED') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [widgetState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiem tra dung luong anh < 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước ảnh không được vượt quá 10MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Tach base64 va mimeType
      const mimeType = file.type || 'image/jpeg';
      setSelectedImage({
        file,
        previewUrl,
        base64: result,
        mimeType,
      });
    };
    reader.readAsDataURL(file);

    // Reset value de cho phep chon lai cung 1 file neu can
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage(null);
  };

  // Ho tro dan anh truc tiep (Ctrl + V) tu clipboard khi copy tren mang hoac chup man hinh
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        if (file.size > 10 * 1024 * 1024) {
          alert('Kích thước ảnh không được vượt quá 10MB.');
          return;
        }

        const previewUrl = URL.createObjectURL(file);
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          setSelectedImage({
            file,
            previewUrl,
            base64: result,
            mimeType: file.type || 'image/jpeg',
          });
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = (textToSend || inputText).trim();
    // Neu co anh ma khong co chu thi tu dong tao cau hoi mac dinh
    const text = rawText || (selectedImage ? 'Nhờ shop nhận diện và tư vấn dòng điện thoại trong ảnh này giúp mình nhé!' : '');
    if (!text || isLoading) return;

    const currentImage = selectedImage;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      imageUrl: currentImage?.previewUrl || currentImage?.base64,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Chuan bi lich su hoi thoai de gui sang API
      const historyPayload: AiChatMessage[] = messages
        .filter((m) => m.id !== 'welcome-msg')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const res = await aiService.sendMessage(
        text,
        historyPayload,
        currentImage?.base64,
        currentImage?.mimeType
      );

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: res.reply,
        suggestedPhones: res.suggestedPhones,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMessage]);

      if (widgetState === 'MINIMIZED') {
        setUnreadCount((c) => c + 1);
      }
    } catch {
      const errorMessage: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'model',
        text: 'Dạ xin lỗi bạn, hiện tại kết nối đến trợ lý AI đang bị gián đoạn. Bạn vui lòng thử lại sau giây lát hoặc truy cập trang /san-pham để xem toàn bộ danh mục sản phẩm của GreenPhone nhé!',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    handleRemoveImage();
    const reset = [INITIAL_BOT_MESSAGE];
    setMessages(reset);
    setUnreadCount(0);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
    } catch {
      // Ignore
    }
  };

  if (widgetState === 'CLOSED') {
    return (
      <FloatingChatBubble
        onClick={() => setWidgetState('EXPANDED')}
        unreadCount={unreadCount}
      />
    );
  }

  if (widgetState === 'MINIMIZED') {
    return (
      <FloatingChatBubble
        onClick={() => {
          setWidgetState('EXPANDED');
          setUnreadCount(0);
        }}
        unreadCount={unreadCount}
      />
    );
  }

  return (
    <div
      className="fixed bottom-20 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[440px] md:w-[460px] h-[580px] sm:h-[640px] max-h-[88vh] z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200/90 overflow-hidden transition-all duration-300 ring-1 ring-black/5"
      role="dialog"
      aria-label="Khung chat trợ lý AI GreenPhone"
    >
      {/* Header */}
      <div className="bg-emerald-600 text-white px-4 py-3.5 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-300 border-2 border-emerald-600 rounded-full" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">Trợ Lý AI GreenPhone</h3>
            <p className="text-[11px] text-emerald-100 flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
              Trực tuyến sẵn sàng hỗ trợ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleResetChat}
            title="Làm mới đoạn hội thoại"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setWidgetState('MINIMIZED')}
            title="Thu nhỏ thành quả bóng tròn"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setWidgetState('CLOSED')}
            title="Đóng khung chat"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages List - Chiếm không gian chính */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/70 space-y-3">
        {messages.map((message) => (
          <ChatMessageItem key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-500 py-2 pl-2">
            <Bot className="w-4 h-4 text-emerald-600 animate-bounce" />
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            <span>Trợ lý AI đang quan sát và soạn câu trả lời...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions pills - Gọn gàng 1 hàng ngang cuộn */}
      <QuickSuggestionPills onSelect={handleSendMessage} disabled={isLoading} />

      {/* Thumbnail Preview khi nguoi dung chon anh */}
      {selectedImage && (
        <div className="px-3 pt-2 pb-1 bg-white border-t border-gray-100 flex items-center gap-2">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-emerald-400 shadow-sm flex-shrink-0">
            <img
              src={selectedImage.previewUrl}
              alt="Ảnh đính kèm"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              title="Xóa ảnh"
              className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 text-xs text-gray-500 truncate">
            <p className="font-medium text-gray-700 truncate">{selectedImage.file.name}</p>
            <p className="text-[11px] text-emerald-600">Sẵn sàng gửi để AI nhận diện</p>
          </div>
        </div>
      )}

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-white border-t border-gray-200 flex items-center gap-2 flex-shrink-0"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Nut (+) chon anh giong het mau anh tham chieu */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          title="Tải ảnh điện thoại để AI nhận diện"
          aria-label="Tải ảnh lên"
          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 hover:text-emerald-700 flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onPaste={handlePaste}
          placeholder={selectedImage ? "Nhập thêm ghi chú hoặc nhấn gửi ngay..." : "Hỏi về tầm giá, pin, camera..."}
          disabled={isLoading}
          className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 bg-gray-100 rounded-xl border border-gray-200 focus:outline-none focus:bg-white focus:border-emerald-500 transition-colors disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={(!inputText.trim() && !selectedImage) || isLoading}
          aria-label="Gửi tin nhắn"
          className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors flex-shrink-0 shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default AiChatWidget;
