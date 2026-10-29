import { Steps } from 'antd';

interface CheckoutStepsProps { current: number; }

const items = [
  { title: 'Thông tin & Thanh toán' },
  { title: 'Xác nhận đơn hàng' },
  { title: 'Hoàn tất' },
];

export default function CheckoutSteps({ current }: CheckoutStepsProps) {
  return (
    <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6">
      <Steps current={current - 1} items={items} size="small" />
    </div>
  );
}
