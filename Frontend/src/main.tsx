import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import vi_VN from 'antd/locale/vi_VN';

import './index.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import App from './App';
import { store, persistor } from './store';
import { antdTheme } from './lib/antdTheme';
import { queryClient } from './lib/queryClient';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <ConfigProvider theme={antdTheme} locale={vi_VN}>
            <AntApp>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </AntApp>
          </ConfigProvider>
        </QueryClientProvider>
      </PersistGate>
    </ReduxProvider>
  </StrictMode>,
);
