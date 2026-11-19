import { Modal, Button } from 'antd';
import { Compass, Lock, MapPin, RotateCw, Check } from 'lucide-react';

export interface LocationGuideModalProps {
  open: boolean;
  onClose: () => void;
  onRetryLocate?: () => void;
}

export default function LocationGuideModal({
  open,
  onClose,
  onRetryLocate,
}: LocationGuideModalProps) {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('gp_auto_locate_on_reload', 'true');
      sessionStorage.setItem('gp_auto_open_address_modal', 'true');
      window.location.reload();
    }
  };

  const handleRetry = () => {
    onClose();
    if (onRetryLocate) {
      onRetryLocate();
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={460}
      title={
        <div className="flex items-center gap-2 text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          <Compass className="w-5 h-5 text-green-600" />
          <span>Hướng dẫn bật quyền vị trí</span>
        </div>
      }
    >
      <div className="py-2 space-y-3.5">
        <p className="text-xs text-gray-600">
          Nếu trình duyệt đang chặn định vị GPS, bạn chỉ cần thực hiện 3 bước đơn giản dưới đây:
        </p>

        {/* Buoc 1 */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[11px] mt-0.5">
              1
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Bấm biểu tượng Ổ khóa trên thanh địa chỉ</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Nhấp chuột vào biểu tượng Ổ khóa ở góc trên bên trái thanh địa chỉ trình duyệt.
              </p>
            </div>
          </div>

          {/* Mini Browser Bar Mockup */}
          <div className="rounded-lg bg-gray-900 text-white p-2.5 text-xs font-mono shadow-inner border border-gray-800">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded bg-blue-600/30 px-2 py-0.5 text-blue-300 border border-blue-500/40 animate-pulse">
                <Lock className="w-3 h-3 text-blue-400" />
                <span className="font-semibold text-[10px]">Nhấp vào đây</span>
              </div>
              <span className="text-gray-300 text-[11px] truncate">greenphone.duckdns.org</span>
            </div>
          </div>
        </div>

        {/* Buoc 2 */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[11px] mt-0.5">
              2
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-green-600" />
                <span>Bật "Vị trí" hoặc bấm "Đặt lại quyền"</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Gạt mục Vị trí (Location) sang Bật hoặc bấm nút Đặt lại quyền.
              </p>
            </div>
          </div>

          {/* Mini Dropdown Settings Mockup */}
          <div className="rounded-lg bg-gray-900 text-white p-2.5 text-xs shadow-inner border border-gray-800 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-800">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-medium text-gray-200">Vị trí (Location)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-green-400 font-semibold bg-green-950 px-1.5 py-0.5 rounded border border-green-800">Gạt BẬT</span>
                <div className="w-7 h-3.5 bg-green-600 rounded-full flex items-center justify-end px-0.5">
                  <div className="w-2.5 h-2.5 bg-white rounded-full" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-0.5 text-[10px]">
              <span className="text-gray-400">Hoặc bấm nút khôi phục:</span>
              <span className="rounded-full border border-blue-500/50 bg-blue-600/20 px-2 py-0.5 text-blue-300 font-medium text-[10px]">
                Đặt lại quyền (Reset permission)
              </span>
            </div>
          </div>
        </div>

        {/* Buoc 3 */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[11px] mt-0.5">
              3
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span>Bấm "Cho phép" trên thông báo trình duyệt</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Khi trình duyệt hiển thị thông báo góc trên bên trái, chọn Cho phép.
              </p>
            </div>
          </div>

          {/* Mini Prompt Mockup */}
          <div className="rounded-lg bg-white p-2.5 text-xs border border-gray-200 shadow-xs space-y-1.5">
            <div className="text-[11px] text-gray-700">
              <strong className="text-gray-900">greenphone.duckdns.org</strong> muốn biết vị trí của bạn
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="rounded-md bg-green-600 text-white font-medium px-2 py-1 text-[10px] shadow-xs inline-flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> Cho phép mỗi khi truy cập
              </span>
              <span className="rounded-md bg-gray-100 text-gray-600 px-2 py-1 text-[10px] border border-gray-200">
                Cho phép lần này
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 italic text-center pt-0.5">
          Mẹo: Bạn cũng có thể click trực tiếp trên bản đồ để ghim cửa vào mà không cần bật GPS.
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
          <Button onClick={onClose} className="!rounded-xl text-xs">
            Đóng
          </Button>
          <Button
            icon={<RotateCw className="w-3.5 h-3.5" />}
            onClick={handleReload}
            className="!rounded-xl text-xs"
          >
            Tải lại trang (F5)
          </Button>
          <Button
            type="primary"
            onClick={handleRetry}
            className="!rounded-xl !bg-green-600 hover:!bg-green-700 text-xs font-semibold"
          >
            Tôi đã bật, định vị ngay
          </Button>
        </div>
      </div>
    </Modal>
  );
}
