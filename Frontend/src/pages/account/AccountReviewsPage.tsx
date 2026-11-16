import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Rate, Button, Modal, Form, Input, message, Spin, Tag, Tabs } from 'antd';
import type { UploadFile } from 'antd';
import { StarOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { reviewService } from '@/services';
import { ReviewImageUpload, ReviewImageLightbox } from '@/components/product/detail';
import type { OrderDTO, OrderDetailDTO } from '@/types/api';
import { formatDate } from '@/utils';

interface UploadCache {
  signature: string;
  urls: string[];
}

export default function AccountReviewsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ELIGIBLE' | 'MY_REVIEWS'>('ELIGIBLE');

  const { data: eligibleData, isLoading: isEligibleLoading } = useQuery({
    queryKey: ['reviews-eligible'],
    queryFn: () => reviewService.eligible(),
  });
  const orders = eligibleData?.content || [];

  const { data: myReviewsData, isLoading: isMyReviewsLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => reviewService.myReviews({ page: 0, size: 50 }),
  });
  const myReviews = myReviewsData?.content || [];
  const myReviewsCount = myReviewsData?.totalElements ?? myReviews.length;

  const eligibleItemCount = orders.reduce((sum, order) => {
    return sum + (order.orderDetails?.filter((d) => !d.reviewed).length || 0);
  }, 0);

  // Lightbox xem ảnh đánh giá của tôi
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handleOpenMyReviewLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  // Modal đánh giá
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<{ order: OrderDTO; detail: OrderDetailDTO } | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<'IDLE' | 'UPLOADING_IMAGES' | 'CREATING_REVIEW'>('IDLE');
  const [form] = Form.useForm();

  // F-01: Quản lý tập hợp các blob URL đang hoạt động bằng useRef để tránh thu hồi sớm khi re-render
  const activeBlobUrlsRef = useRef<Set<string>>(new Set());

  // F-02: Cache URLs của ảnh đã upload thành công để tái sử dụng khi retry
  const uploadCacheRef = useRef<UploadCache | null>(null);

  // Tính chữ ký danh sách file để xác định danh sách file có thay đổi hay không
  const getFileListSignature = useCallback((files: UploadFile[]): string => {
    return files
      .map((f) => `${f.uid}_${f.name}_${f.size}_${f.originFileObj?.lastModified || 0}`)
      .join('|');
  }, []);

  const registerBlobUrl = useCallback((url?: string) => {
    if (url && url.startsWith('blob:')) {
      activeBlobUrlsRef.current.add(url);
    }
  }, []);

  const revokeBlobUrl = useCallback((url?: string) => {
    if (url && url.startsWith('blob:') && activeBlobUrlsRef.current.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
      activeBlobUrlsRef.current.delete(url);
    }
  }, []);

  const cleanupAllBlobUrls = useCallback(() => {
    activeBlobUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    activeBlobUrlsRef.current.clear();
  }, []);

  // F-01: Chỉ dọn dẹp toàn bộ blob URL khi component unmount
  useEffect(() => {
    return () => {
      cleanupAllBlobUrls();
    };
  }, [cleanupAllBlobUrls]);

  // F-01 & F-02: Xử lý khi danh sách file thay đổi
  const handleFileListChange = (newFileList: UploadFile[]) => {
    // 1. Thu hồi các blob URL của những file bị xóa (không còn trong newFileList)
    const newUids = new Set(newFileList.map((f) => f.uid));
    fileList.forEach((oldFile) => {
      if (!newUids.has(oldFile.uid)) {
        revokeBlobUrl(oldFile.url);
        if (oldFile.thumbUrl && oldFile.thumbUrl !== oldFile.url) {
          revokeBlobUrl(oldFile.thumbUrl);
        }
      }
    });

    // 2. Đăng ký các blob URL của file mới vào ref
    newFileList.forEach((f) => {
      registerBlobUrl(f.url);
      registerBlobUrl(f.thumbUrl);
    });

    // 3. F-02: Vô hiệu hóa cache nếu danh sách file có sự thay đổi
    const newSig = getFileListSignature(newFileList);
    if (uploadCacheRef.current && uploadCacheRef.current.signature !== newSig) {
      uploadCacheRef.current = null;
    }

    setFileList(newFileList);
  };

  const openReview = (order: OrderDTO, detail: OrderDetailDTO) => {
    cleanupAllBlobUrls();
    uploadCacheRef.current = null;
    setFileList([]);
    setTarget({ order, detail });
    form.resetFields();
    setOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    cleanupAllBlobUrls();
    uploadCacheRef.current = null;
    setFileList([]);
    form.resetFields();
    setOpen(false);
  };

  const handleFinish = async (values: { rating: number; content: string }) => {
    if (!target) return;
    setIsSubmitting(true);

    try {
      let uploadedUrls: string[] = [];

      // 1. Tải ảnh nếu người dùng có chọn 1-5 ảnh
      if (fileList.length > 0) {
        const currentSig = getFileListSignature(fileList);

        // F-02: Kiểm tra cache xem danh sách file này đã được upload thành công trước đó chưa
        if (uploadCacheRef.current && uploadCacheRef.current.signature === currentSig) {
          uploadedUrls = uploadCacheRef.current.urls;
        } else {
          setSubmitPhase('UPLOADING_IMAGES');
          const formData = new FormData();
          fileList.forEach((fileItem) => {
            const originFile = fileItem.originFileObj || (fileItem as unknown as File);
            if (originFile) {
              formData.append('images', originFile);
            }
          });

          try {
            uploadedUrls = await reviewService.uploadImages(formData);
            if (!Array.isArray(uploadedUrls)) {
              throw new Error('Định dạng phản hồi ảnh không hợp lệ');
            }
            // Lưu vào cache
            uploadCacheRef.current = {
              signature: currentSig,
              urls: uploadedUrls,
            };
          } catch {
            message.error('Không thể tải hình ảnh lên. Vui lòng kiểm tra kết nối và thử lại.');
            setIsSubmitting(false);
            setSubmitPhase('IDLE');
            return; // Dừng lại, giữ nguyên nội dung form và fileList để thử lại
          }
        }
      }

      // 2. Gửi dữ liệu đánh giá sản phẩm
      setSubmitPhase('CREATING_REVIEW');
      await reviewService.create({
        orderDetailId: target.detail.id,
        rating: values.rating,
        content: values.content,
        images: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      });

      message.success('Đã gửi đánh giá');
      cleanupAllBlobUrls();
      uploadCacheRef.current = null;
      setFileList([]);
      form.resetFields();
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['reviews-eligible'] });
      qc.invalidateQueries({ queryKey: ['my-reviews'] });
      setActiveTab('MY_REVIEWS');
    } catch {
      message.error('Không thể gửi đánh giá. Vui lòng thử lại.');
      // Giữ nguyên form, fileList và uploadCacheRef để retry không phải upload lại
    } finally {
      setIsSubmitting(false);
      setSubmitPhase('IDLE');
    }
  };

  const okButtonText =
    submitPhase === 'UPLOADING_IMAGES'
      ? 'Đang tải hình ảnh...'
      : submitPhase === 'CREATING_REVIEW'
        ? 'Đang gửi đánh giá...'
        : 'Gửi đánh giá';

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Đánh giá sản phẩm</h2>
        <p className="mt-1 text-sm text-gray-500">Quản lý nhận xét và đánh giá sản phẩm của bạn</p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as 'ELIGIBLE' | 'MY_REVIEWS')}
        items={[
          {
            key: 'ELIGIBLE',
            label: (
              <span className="font-medium text-sm">
                Chờ đánh giá
                {eligibleItemCount > 0 && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {eligibleItemCount}
                  </span>
                )}
              </span>
            ),
            children: isEligibleLoading ? (
              <div className="py-12 text-center text-gray-400">
                <Spin /> <span className="ml-2">Đang tải...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="mt-4 flex flex-col items-center rounded-2xl border border-gray-100 bg-white py-12 text-center shadow-xs">
                <StarOutlined className="mb-4 text-gray-300" style={{ fontSize: 48 }} />
                <h3 className="text-lg font-semibold text-gray-700">Chưa có sản phẩm nào để đánh giá</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Sản phẩm được đánh giá sau khi đơn hàng đã giao thành công.
                </p>
                <Link
                  to="/san-pham"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                >
                  <ShoppingOutlined /> Mua sắm ngay
                </Link>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-gray-900">Đơn #{order.id}</span>
                        <Tag color="green" className="!rounded-full !m-0">
                          Đã giao
                        </Tag>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {order.orderDetails?.map((d) => (
                        <div key={d.id} className="flex items-center justify-between gap-4 px-5 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{d.productName}</p>
                            <p className="text-xs text-gray-500">
                              {d.ram}/{d.storage} &mdash; {d.color} &times;{d.quantity}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {d.reviewed ? (
                              <Tag color="success" className="!rounded-full !m-0">
                                Đã đánh giá ✓
                              </Tag>
                            ) : (
                              <Button
                                size="small"
                                className="!rounded-full"
                                onClick={() => openReview(order, d)}
                              >
                                Đánh giá
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: 'MY_REVIEWS',
            label: (
              <span className="font-medium text-sm">
                Đánh giá của tôi
                {myReviewsCount > 0 && (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    {myReviewsCount}
                  </span>
                )}
              </span>
            ),
            children: isMyReviewsLoading ? (
              <div className="py-12 text-center text-gray-400">
                <Spin /> <span className="ml-2">Đang tải...</span>
              </div>
            ) : myReviews.length === 0 ? (
              <div className="mt-4 flex flex-col items-center rounded-2xl border border-gray-100 bg-white py-12 text-center shadow-xs">
                <StarOutlined className="mb-4 text-gray-300" style={{ fontSize: 48 }} />
                <h3 className="text-lg font-semibold text-gray-700">Bạn chưa có bài đánh giá nào</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Các đánh giá về sản phẩm bạn đã mua sẽ hiển thị tại đây để bạn dễ dàng xem lại.
                </p>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {myReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition hover:border-gray-200"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-3">
                        {rev.phoneImage ? (
                          <img
                            src={rev.phoneImage}
                            alt={rev.phoneName || 'Sản phẩm'}
                            className="h-12 w-12 rounded-lg object-cover border border-gray-100 shrink-0"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50 text-gray-400 border border-gray-100 shrink-0">
                            📱
                          </div>
                        )}
                        <div>
                          <Link
                            to={`/san-pham/${rev.phoneId}`}
                            className="text-sm font-semibold text-gray-900 hover:text-green-600 transition"
                          >
                            {rev.phoneName || `Sản phẩm #${rev.phoneId}`}
                          </Link>
                          <div className="mt-1 flex items-center gap-2">
                            <Rate disabled value={rev.rating} className="text-xs text-amber-400" />
                            <span className="text-xs text-gray-400">&bull; {formatDate(rev.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <Tag color="green" className="!rounded-full !m-0">
                        {rev.status === 'SHOW' || rev.status === 'APPROVED' ? 'Đã duyệt' : rev.status}
                      </Tag>
                    </div>

                    {rev.content && (
                      <p className="mt-3 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                        {rev.content}
                      </p>
                    )}

                    {rev.images && rev.images.length > 0 && (
                      <div className="mt-3.5">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Hình ảnh đính kèm:</p>
                        <div className="flex flex-wrap gap-2">
                          {rev.images.map((imgUrl, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() => handleOpenMyReviewLightbox(rev.images || [], imgIdx)}
                              className="group relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 hover:border-green-500 transition"
                              aria-label={`Xem ảnh lớn ${imgIdx + 1}`}
                            >
                              <img
                                src={imgUrl}
                                alt={`Ảnh đánh giá ${imgIdx + 1}`}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                loading="lazy"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />

      {/* Modal đánh giá sản phẩm */}
      <Modal
        title={<span className="text-base font-bold text-gray-900">ĐÁNH GIÁ SẢN PHẨM</span>}
        open={open}
        onCancel={handleCloseModal}
        destroyOnHidden
        onOk={() => form.submit()}
        confirmLoading={isSubmitting}
        okText={okButtonText}
        cancelText="Hủy"
        okButtonProps={{
          disabled: isSubmitting,
          className: '!rounded-full !bg-green-600 hover:!bg-green-700',
        }}
        cancelButtonProps={{
          disabled: isSubmitting,
          className: '!rounded-full',
        }}
        width={520}
      >
        {target?.detail && (
          <div className="mb-4 mt-2 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-sm font-bold text-emerald-700">
              📱
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold text-gray-900">
                {target.detail.productName}
              </h4>
              <p className="mt-0.5 text-xs text-gray-500">
                Phân loại: {target.detail.ram}/{target.detail.storage} • Màu {target.detail.color}
              </p>
            </div>
          </div>
        )}

        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="rating"
            label={<span className="font-medium text-gray-700">Đánh giá của bạn</span>}
            rules={[{ required: true, message: 'Vui lòng chọn số sao đánh giá' }]}
            initialValue={5}
          >
            <Rate disabled={isSubmitting} />
          </Form.Item>

          <Form.Item
            name="content"
            label={<span className="font-medium text-gray-700">Nhận xét</span>}
            rules={[{ required: true, message: 'Vui lòng nhập nội dung đánh giá' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Chia sẻ cảm nhận chi tiết của bạn về sản phẩm..."
              maxLength={500}
              showCount
              disabled={isSubmitting}
            />
          </Form.Item>

          <Form.Item
            label={
              <span className="font-medium text-gray-700">
                Hình ảnh thực tế ({fileList.length}/5)
              </span>
            }
          >
            <ReviewImageUpload
              fileList={fileList}
              onChange={handleFileListChange}
              disabled={isSubmitting}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Lightbox xem ảnh đánh giá của tôi */}
      <ReviewImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        reviewerName="Bạn"
      />
    </div>
  );
}
