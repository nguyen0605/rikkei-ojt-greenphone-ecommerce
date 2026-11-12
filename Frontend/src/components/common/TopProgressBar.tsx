import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/utils';

export interface TopProgressBarProps {
  /**
   * Height of the progress bar in pixels (default: 3px)
   */
  height?: number;
  /**
   * Optional custom class for styling
   */
  className?: string;
}

// Global event bus for programmatic control
const PROGRESS_START_EVENT = 'greenphone:top-progress-start';
const PROGRESS_DONE_EVENT = 'greenphone:top-progress-done';

export const startTopProgressBar = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROGRESS_START_EVENT));
  }
};

export const completeTopProgressBar = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROGRESS_DONE_EVENT));
  }
};

/**
 * TopProgressBar
 * High-performance 3px emerald progress bar fixed at the top of the viewport.
 * Reacts instantly (<50ms) to route navigation and link clicks, completing with
 * a 200-300ms smooth fade-out.
 */
export const TopProgressBar: React.FC<TopProgressBarProps> = ({
  height = 3,
  className,
}) => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const trickleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathRef = useRef<string>(location.pathname + location.search);

  const clearAllTimers = () => {
    if (trickleTimerRef.current) clearInterval(trickleTimerRef.current);
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const startProgress = () => {
    clearAllTimers();
    setVisible(true);
    setProgress((prev) => (prev > 0 && prev < 90 ? prev : 25));

    // Trickle progress smoothly up to 90%
    trickleTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        // Slower increment as it approaches 90%
        const delta = Math.max(1, (90 - prev) * 0.15);
        return Math.min(90, prev + delta);
      });
    }, 120);
  };

  const finishProgress = () => {
    if (trickleTimerRef.current) clearInterval(trickleTimerRef.current);

    // Jump to 100%
    setProgress(100);

    // After brief dwell, start fade-out (250ms duration)
    completeTimerRef.current = setTimeout(() => {
      setVisible(false);

      // Once fade-out finishes, reset progress to 0
      hideTimerRef.current = setTimeout(() => {
        setProgress(0);
      }, 300);
    }, 150);
  };

  // Listen to route location changes
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    if (currentPath !== prevPathRef.current) {
      prevPathRef.current = currentPath;
      startProgress();
      // Schedule completion on next animation frame after route rendered
      const frame = requestAnimationFrame(() => {
        finishProgress();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [location.pathname, location.search]);

  // Micro-interaction: Catch internal anchor clicks for sub-50ms instant feedback
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');
      // If external or opens in new tab or hash-only, ignore
      if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || targetAttr === '_blank') {
        return;
      }

      // Ignore if modifier keys are pressed (Ctrl, Meta, Shift)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Instant activation (< 50ms)
      startProgress();
    };

    const handleStartEvent = () => startProgress();
    const handleDoneEvent = () => finishProgress();

    document.addEventListener('click', handleClick, { capture: true });
    window.addEventListener(PROGRESS_START_EVENT, handleStartEvent);
    window.addEventListener(PROGRESS_DONE_EVENT, handleDoneEvent);

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener(PROGRESS_START_EVENT, handleStartEvent);
      window.removeEventListener(PROGRESS_DONE_EVENT, handleDoneEvent);
      clearAllTimers();
    };
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'fixed top-0 left-0 right-0 z-[9999] pointer-events-none transition-opacity duration-300 ease-out',
        visible ? 'opacity-100' : 'opacity-0',
        className,
      )}
      style={{ height: `${height}px` }}
    >
      <div
        data-testid="top-progress-bar"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-full bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
        style={{
          width: `${progress}%`,
          transition:
            progress === 100
              ? 'width 150ms ease-out'
              : progress === 0
                ? 'none'
                : 'width 200ms ease-out',
        }}
      >
        {/* Glow trailing edge effect */}
        <div className="absolute right-0 top-0 h-full w-24 translate-x-2 shadow-[0_0_12px_#10b981,0_0_6px_#059669]" />
      </div>
    </div>
  );
};

export default TopProgressBar;
