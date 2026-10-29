import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import rootReducer from './rootReducer';

// Build a web storage adapter using localStorage directly — avoids CJS/ESM
// interop issues with redux-persist/lib/storage in Vite.
const createLocalStorage = () => {
  const isBrowser =
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

  if (!isBrowser) {
    return {
      getItem: (_key: string) => Promise.resolve(null as string | null),
      setItem: (_key: string, value: string) => Promise.resolve(value),
      removeItem: (_key: string) => Promise.resolve(),
    };
  }

  return {
    getItem: (key: string) =>
      new Promise<string | null>((resolve) => {
        try {
          resolve(window.localStorage.getItem(key));
        } catch {
          resolve(null);
        }
      }),
    setItem: (key: string, value: string) =>
      new Promise<void>((resolve) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          /* ignore quota / serialization errors */
        }
        resolve();
      }),
    removeItem: (key: string) =>
      new Promise<void>((resolve) => {
        try {
          window.localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
        resolve();
      }),
  };
};

const storage = createLocalStorage();

const persistConfig = {
  key: 'greenphone-root',
  version: 1,
  storage,
  whitelist: ['cart', 'wishlist', 'checkout'], // persist cart, wishlist, và checkout (shipping info)
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
export type { RootState } from './rootReducer';
