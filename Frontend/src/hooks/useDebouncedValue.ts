import { useEffect, useState } from 'react';

/**
 * Trả về giá trị debounce sau `delayMs` milliseconds.
 * Hữu ích cho search-as-you-type gọi API (tránh spam request).
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}