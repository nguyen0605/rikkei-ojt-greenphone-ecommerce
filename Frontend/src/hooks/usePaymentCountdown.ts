import { useEffect, useState } from 'react';

/**
 * Live countdown (seconds) until a payment deadline.
 * Returns 0 when expired; stops ticking once 0 is reached.
 */
export function usePaymentCountdown(expiresAt: string | undefined): number {
  const compute = () => {
    if (!expiresAt) return 0;
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  };

  const [remaining, setRemaining] = useState<number>(compute);

  useEffect(() => {
    setRemaining(compute());
    if (!expiresAt) return;
    const timer = setInterval(() => {
      const next = compute();
      setRemaining(next);
      if (next <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  return remaining;
}

/** Format seconds as MM:SS (e.g. 9:05 → "09:05"). */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
