import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Font Be Vietnam Pro đóng gói cùng ứng dụng (không tải từ Google Fonts → chạy được khi không có mạng)
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/be-vietnam-pro/800.css';
import './index.css';
import { App } from '@/app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
