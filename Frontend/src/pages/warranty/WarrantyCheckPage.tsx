import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Empty, Input } from 'antd';
import {
  CheckCircle2,
  HelpCircle,
  Search,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import WarrantyCard from '@/components/warranty/WarrantyCard';
import {
  warrantyService,
  type WarrantyLookupItem,
} from '@/services/warrantyService';

const MIN_QUERY_LENGTH = 10;

export default function WarrantyCheckPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = searchParams.get('imei') || searchParams.get('query') || '';

  const [query, setQuery] = useState(initialParam);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<WarrantyLookupItem[]>([]);
  const lastQueryRef = useRef<string | null>(null);

  const performLookup = useCallback(async (rawInput: string) => {
    const trimmed = rawInput.trim();
    setQuery(trimmed);

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setValidationError(
        `Vui lòng nhập mã IMEI (15 chữ số) hoặc số điện thoại (tối thiểu ${MIN_QUERY_LENGTH} ký tự).`,
      );
      setApiError(null);
      return;
    }

    lastQueryRef.current = trimmed;
    setValidationError(null);
    setApiError(null);
    setIsLoading(true);

    try {
      const data = await warrantyService.check(trimmed);
      setResults(Array.isArray(data) ? data : []);
      setHasSearched(true);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Không thể tra cứu thông tin bảo hành lúc này. Vui lòng thử lại sau.';
      setApiError(message);
      setResults([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-lookup when navigated with ?imei=... or ?query=... (e.g. from notification link)
  useEffect(() => {
    const urlQuery = (searchParams.get('imei') || searchParams.get('query') || '').trim();
    if (urlQuery.length >= MIN_QUERY_LENGTH && urlQuery !== lastQueryRef.current) {
      setQuery(urlQuery);
      void performLookup(urlQuery);
    }
  }, [searchParams, performLookup]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length >= MIN_QUERY_LENGTH) {
      setSearchParams({ query: trimmed }, { replace: true });
    }
    void performLookup(query);
  };

  return (
    <div className="min-h-[70vh] bg-gray-50 pb-16">
      {/* GreenPhone Care Brand Banner */}
      <section className="bg-gradient-to-br from-green-700 via-green-600 to-emerald-600 px-4 py-10 text-white sm:py-14">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold tracking-wide uppercase backdrop-blur-sm sm:text-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>GreenPhone Care</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
            Tra Cứu Bảo Hành Điện Tử Chính Hãng
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-green-50 sm:text-base">
            Kiểm tra nhanh thông tin kích hoạt, thời hạn bảo hành còn lại của thiết bị
            bằng mã IMEI hoặc số điện thoại mua hàng — hoàn toàn miễn phí, không cần
            đăng nhập.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-green-50 sm:gap-6 sm:text-sm">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-200" />
              Bảo hành điện tử 12 tháng
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-200" />
              Minh bạch theo IMEI từng máy
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-200" />
              Tra cứu tức thì 24/7
            </span>
          </div>
        </div>
      </section>

      {/* Search Card */}
      <section className="mx-auto -mt-7 max-w-3xl px-4 sm:px-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg sm:p-7">
          <form onSubmit={handleSubmit} noValidate>
            <label
              htmlFor="warranty-lookup-input"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Nhập mã IMEI (15 chữ số) hoặc Số điện thoại mua hàng
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="warranty-lookup-input"
                size="large"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onBlur={() => setQuery((prev) => prev.trim())}
                placeholder="Ví dụ: 861234567890123 hoặc 0901234567"
                prefix={<Search className="h-4 w-4 text-gray-400" />}
                allowClear
                disabled={isLoading}
                className="flex-1 rounded-xl text-base"
                aria-label="Mã IMEI hoặc số điện thoại"
              />
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={isLoading}
                disabled={isLoading}
                className="!h-11 !rounded-xl !bg-green-600 !px-6 !font-semibold hover:!bg-green-700"
              >
                Tra Cứu Bảo Hành
              </Button>
            </div>

            {validationError && (
              <p
                role="alert"
                className="mt-2.5 text-sm font-medium text-red-600"
              >
                {validationError}
              </p>
            )}
          </form>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 px-3.5 py-2.5 text-xs text-gray-600">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>
              Mẹo: Bấm <strong className="font-mono text-gray-800">*#06#</strong> trên
              bàn phím gọi điện để xem nhanh mã IMEI 15 chữ số, hoặc kiểm tra tem IMEI
              trên vỏ hộp sản phẩm.
            </span>
          </div>
        </div>
      </section>

      {/* Results Area */}
      <section className="mx-auto mt-8 max-w-4xl px-4 sm:px-6">
        {apiError && (
          <Alert
            type="error"
            showIcon
            title="Lỗi tra cứu"
            description={apiError}
            className="mb-6 rounded-xl"
          />
        )}

        {hasSearched && !isLoading && !apiError && results.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="space-y-2">
                  <p className="text-base font-semibold text-gray-800">
                    Không tìm thấy thông tin bảo hành phù hợp
                  </p>
                  <p className="mx-auto max-w-md text-sm text-gray-500">
                    Vui lòng kiểm tra lại số IMEI (15 chữ số in trên vỏ hộp, thân máy
                    hoặc bấm *#06#) hoặc nhập đúng số điện thoại bạn đã sử dụng khi đặt
                    hàng tại GreenPhone.
                  </p>
                </div>
              }
            />
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg">
                <Smartphone className="h-5 w-5 text-green-600" />
                <span>Kết quả tra cứu ({results.length} thiết bị)</span>
              </h2>
            </div>

            <div className="space-y-4">
              {results.map((item) => (
                <WarrantyCard key={item.id ?? item.imeiNumber} warranty={item} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

