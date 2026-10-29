import { Button, Tag } from 'antd';
import { Star, Truck, ShieldCheck, Gift, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '@/types';
import { formatVND, formatSold } from '@/utils';
import { QuantitySelector } from '@/components/common';
import { useAppDispatch } from '@/store/hooks';
import { addToCart } from '@/store/slices/cartSlice';
import { message } from 'antd';

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedStorage, setSelectedStorage] = useState(product.storage[0]);
  const [quantity, setQuantity] = useState(1);

  const finalPrice =
    product.price + (selectedStorage?.priceModifier || 0);

  const handleAddToCart = () => {
    dispatch(
      addToCart({
        product,
        quantity,
        color: selectedColor?.name,
        storage: selectedStorage?.capacity,
      }),
    );
    messageApi.success('Đã thêm sản phẩm vào giỏ hàng');
  };

  const handleBuyNow = () => {
    dispatch(
      addToCart({
        product,
        quantity,
        color: selectedColor?.name,
        storage: selectedStorage?.capacity,
      }),
    );
    navigate('/thanh-toan');
  };

  return (
    <div className="space-y-5">
      {contextHolder}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < Math.round(product.rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-200'
                }`}
              />
            ))}
            <span className="ml-1 font-medium text-gray-900">
              {product.rating}
            </span>
            <span className="text-gray-400">({product.reviewCount} đánh giá)</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <span>Đã bán {formatSold(product.sold)}</span>
        </div>
      </div>

      {/* Price */}
      <div className="rounded-xl bg-red-50 p-4">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-red-600">
            {formatVND(finalPrice)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              {formatVND(product.originalPrice)}
            </span>
          )}
          {product.discount && (
            <Tag color="red" className="!m-0">
              -{product.discount}%
            </Tag>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          (Đã bao gồm VAT nếu có)
        </p>
      </div>

      {/* Color */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Màu sắc: <span className="font-normal">{selectedColor?.name}</span>
        </h3>
        <div className="flex gap-2">
          {product.colors.map((color) => (
            <button
              key={color.id}
              onClick={() => setSelectedColor(color)}
              className={`h-10 w-10 rounded-full border-2 transition-all ${
                selectedColor?.id === color.id
                  ? 'scale-110 border-green-500'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color.hex }}
              aria-label={color.name}
            />
          ))}
        </div>
      </div>

      {/* Storage */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Dung lượng:{' '}
          <span className="font-normal">{selectedStorage?.capacity}</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {product.storage.map((storage) => (
            <button
              key={storage.id}
              onClick={() => setSelectedStorage(storage)}
              className={`min-w-24 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                selectedStorage?.id === storage.id
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {storage.capacity}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-semibold text-gray-900">Số lượng:</h3>
        <QuantitySelector value={quantity} onChange={setQuantity} max={20} />
        <span className="text-sm font-medium text-green-600">Còn hàng</span>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          size="large"
          block
          onClick={handleBuyNow}
          className="!h-12 !flex-1 !rounded-full !bg-green-600 !text-base hover:!bg-green-700"
          type="primary"
          icon={<ShoppingCart className="h-4 w-4" />}
        >
          Mua ngay
        </Button>
        <Button
          size="large"
          block
          onClick={handleAddToCart}
          className="!h-12 !flex-1 !rounded-full !border-green-600 !text-base !text-green-600 hover:!bg-green-50 hover:!text-green-700"
        >
          Thêm vào giỏ hàng
        </Button>
      </div>

      {/* Offers */}
      <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">
          Ưu đãi khi mua hàng
        </h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <Gift className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            <span>Giảm ngay 5% khi thanh toán online</span>
          </li>
          <li className="flex items-start gap-2">
            <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            <span>Trợ giá 0% khi quốc giao thẻ tín dụng</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            <span>Thu cũ đổi mới - Trợ giá lên đến 30%</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
