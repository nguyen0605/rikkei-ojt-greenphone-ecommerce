import '@testing-library/jest-dom/vitest';

class MockResizeObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
}

window.ResizeObserver = window.ResizeObserver || (MockResizeObserver as unknown as typeof ResizeObserver);

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
