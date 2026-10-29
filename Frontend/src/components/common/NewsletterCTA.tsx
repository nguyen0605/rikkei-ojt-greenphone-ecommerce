import { Input } from 'antd';
import { Send } from 'lucide-react';
import { Button } from 'antd';

export default function NewsletterCTA() {
  return (
    <section className="bg-gradient-to-r from-green-50 to-green-100 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md">
            <span className="text-3xl">📱</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Không tìm thấy điện thoại bạn cần?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Hãy để lại thông tin, chúng tôi sẽ thông báo khi có hàng!
            </p>
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Input
            placeholder="Nhập email của bạn"
            size="large"
            className="!w-72"
          />
          <Button
            type="primary"
            size="large"
            icon={<Send className="h-4 w-4" />}
            className="!bg-green-600 hover:!bg-green-700"
          >
            Thông báo cho tôi
          </Button>
        </div>
      </div>
    </section>
  );
}
