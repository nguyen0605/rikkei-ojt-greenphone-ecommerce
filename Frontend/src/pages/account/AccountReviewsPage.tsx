import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Rate, Button, Modal, Form, Input, message, Spin, Tag } from 'antd';
import { StarOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { reviewService } from '@/services';
import type { OrderDTO, OrderDetailDTO } from '@/types/api';
import { formatVND, formatDate } from '@/utils';

export default function AccountReviewsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['reviews-eligible'], queryFn: () => reviewService.eligible() });
  const orders = data?.content || [];

  // Modal đánh giá
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<{ order: OrderDTO; detail: OrderDetailDTO } | null>(null);
  const [form] = Form.useForm();

  const createMut = useMutation({
    mutationFn: (v: { orderDetailId: number; rating: number; content: string }) => reviewService.create(v),
    onSuccess: () => {
      message.success('Đã gửi đánh giá');
      setOpen(false);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['reviews-eligible'] });
      qc.invalidateQueries({ queryKey: ['my-reviews'] });
    },
    onError: () => message.error('Không thể gửi đánh giá'),
  });

  const openReview = (order: OrderDTO, detail: OrderDetailDTO) => {
    setTarget({ order, detail });
    form.resetFields();
    setOpen(true);
  };

  if (isLoading) return <div className="py-12 text-center text-gray-400"><Spin /> <span className="ml-2">Đang tải...</span></div>;

  if (orders.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900">Đánh giá sản phẩm</h2>
        <div className="mt-8 flex flex-col items-center py-12 text-center">
          <StarOutlined className="mb-4 text-gray-300" style={{ fontSize: 48 }} />
          <h3 className="text-lg font-semibold text-gray-700">Chưa có sản phẩm nào để đánh giá</h3>
          <p className="mt-1 text-sm text-gray-500">Sản phẩm được đánh giá sau khi đơn hàng đã giao thành công.</p>
          <Link to="/san-pham" className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
            <ShoppingOutlined /> Mua sắm ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Đánh giá sản phẩm</h2>
        <p className="mt-1 text-sm text-gray-500">Chia sẻ cảm nhận về sản phẩm đã nhận</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-gray-900">Đơn #{order.id}</span>
                <Tag color="green" className="!rounded-full !m-0">Đã giao</Tag>
              </div>
              <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
            </div>
            <div className="divide-y">
              {order.orderDetails?.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{d.productName}</p>
                    <p className="text-xs text-gray-500">{d.ram}/{d.storage} &mdash; {d.color} &times;{d.quantity}</p>
                  </div>
                  <div className="shrink-0">
                    {d.reviewed ? (
                      <Tag color="success" className="!rounded-full !m-0">Đã đánh giá ✓</Tag>
                    ) : (
                      <Button size="small" className="!rounded-full" onClick={() => openReview(order, d)}>Đánh giá</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal đánh giá */}
      <Modal
        title={<span className="text-base font-bold text-gray-900">Đánh giá: {target?.detail?.productName ?? ''}</span>}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending}
        okButtonProps={{ className: '!rounded-full !bg-green-600 hover:!bg-green-700' }}
        cancelButtonProps={{ className: '!rounded-full' }}
        width={480}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => {
            if (!target) return;
            createMut.mutate({ orderDetailId: target.detail.id, rating: v.rating, content: v.content });
          }}
        >
          <Form.Item name="rating" label="Số sao" rules={[{ required: true, message: 'Chọn số sao' }]} initialValue={5}>
            <Rate />
          </Form.Item>
          <Form.Item name="content" label="Nội dung đánh giá" rules={[{ required: true, message: 'Nhập nội dung' }]}>
            <Input.TextArea rows={4} placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..." maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}