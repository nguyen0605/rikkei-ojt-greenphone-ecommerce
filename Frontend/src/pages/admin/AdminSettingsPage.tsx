import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, InputNumber, Button, Spin, message, Divider } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { settingsService } from '@/services';
import { useAppDispatch } from '@/store/hooks';
import { setSettings } from '@/store/slices/settingsSlice';
import { formatVND } from '@/utils';
import { useEffect, useState } from 'react';
import type { SettingsDTO } from '@/types/api';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';
import TiptapRichEditor from '@/components/admin/TiptapRichEditor';

interface SettingsForm {
  SHIPPING_FEE: number;
  FREE_SHIPPING_THRESHOLD: number;
}

const parseNumber = (s: string | undefined) => Number((s ?? '').replace(/[^\d]/g, ''));

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const [form] = Form.useForm<SettingsForm>();

  // Nội dung HTML (Tiptap) — quản lý riêng ngoài Form vì editor là state riêng
  const [termsHtml, setTermsHtml] = useState('');
  const [privacyHtml, setPrivacyHtml] = useState('');

  const { data, isLoading } = useQuery<SettingsDTO[]>({
    queryKey: ['admin-settings'],
    queryFn: settingsService.adminList,
  });

  useEffect(() => {
    if (data && data.length > 0) {
      const map: Record<string, string> = {};
      data.forEach((r) => { map[r.settingKey] = r.settingValue; });
      form.setFieldsValue({
        SHIPPING_FEE: Number(map.SHIPPING_FEE ?? 29000),
        FREE_SHIPPING_THRESHOLD: Number(map.FREE_SHIPPING_THRESHOLD ?? 5000000),
      });
      setTermsHtml(map.TERMS_CONDITIONS ?? '');
      setPrivacyHtml(map.PRIVACY_POLICY ?? '');
    }
  }, [data, form]);

  const mut = useMutation({
    mutationFn: (v: SettingsForm) =>
      settingsService.adminUpdate({
        SHIPPING_FEE: String(v.SHIPPING_FEE),
        FREE_SHIPPING_THRESHOLD: String(v.FREE_SHIPPING_THRESHOLD),
        TERMS_CONDITIONS: termsHtml,
        PRIVACY_POLICY: privacyHtml,
      }),
    onSuccess: (result) => {
      dispatch(setSettings(result));
      qc.invalidateQueries({ queryKey: ['settings', 'public'] });
      message.success('Đã lưu cài đặt');
    },
    onError: () => message.error('Lưu thất bại'),
  });

  if (isLoading) return <div className="py-16 text-center"><Spin /></div>;

  return (
    <div className="max-w-3xl">
      <AdminPageHeader title="Cài đặt shop" subtitle="Phí giao hàng, điều khoản và chính sách bảo mật" />

      {/* Phí giao hàng */}
      <AdminCard>
        <Form<SettingsForm>
          form={form}
          layout="vertical"
          onFinish={(v) => mut.mutate(v)}
          className="space-y-4"
        >
          <Form.Item
            name="SHIPPING_FEE"
            label="Phí giao hàng (VND)"
            tooltip="Áp dụng khi đơn dưới ngưỡng miễn phí. Đặt 0 để miễn phí hoàn toàn."
            rules={[{ required: true, message: 'Nhập phí giao hàng' }]}
          >
            <InputNumber min={0} step={1000} className="!w-full" formatter={(v) => formatVND(Number(v) || 0)} parser={parseNumber} />
          </Form.Item>
          <Form.Item
            name="FREE_SHIPPING_THRESHOLD"
            label="Ngưỡng miễn phí giao hàng (VND)"
            tooltip="Đơn hàng từ mức này trở lên được miễn phí giao hàng. Đặt 0 để luôn thu phí."
            rules={[{ required: true, message: 'Nhập ngưỡng miễn phí' }]}
          >
            <InputNumber min={0} step={100000} className="!w-full" formatter={(v) => formatVND(Number(v) || 0)} parser={parseNumber} />
          </Form.Item>
        </Form>
      </AdminCard>

      {/* Điều khoản */}
      <div className="mt-6">
        <AdminCard>
          <div className="mb-3 text-sm font-semibold text-gray-900">Điều khoản sử dụng</div>
          <p className="mb-3 text-xs text-gray-500">
            Hiển thị tại trang <code className="rounded bg-gray-100 px-1">/dieu-khoan</code> (đăng ký & footer link)
          </p>
          <TiptapRichEditor value={termsHtml} onChange={setTermsHtml} placeholder="Soạn nội dung điều khoản..." />
        </AdminCard>
      </div>

      {/* Chính sách bảo mật */}
      <div className="mt-6">
        <AdminCard>
          <div className="mb-3 text-sm font-semibold text-gray-900">Chính sách bảo mật</div>
          <p className="mb-3 text-xs text-gray-500">
            Hiển thị tại trang <code className="rounded bg-gray-100 px-1">/chinh-sach-bao-mat</code> (đăng ký & footer link)
          </p>
          <TiptapRichEditor value={privacyHtml} onChange={setPrivacyHtml} placeholder="Soạn nội dung chính sách..." />
        </AdminCard>
      </div>

      {/* Lưu */}
      <div className="mt-6">
        <Button
          type="primary"
          onClick={() => form.submit()}
          icon={<SaveOutlined />}
          loading={mut.isPending}
          className="!rounded-full !bg-green-600 hover:!bg-green-700"
        >
          Lưu cài đặt
        </Button>
      </div>
    </div>
  );
}
