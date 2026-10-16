# QuickBite — Công nghệ sử dụng

Nền tảng đặt món ăn trong trường đại học: **React** (giao diện) + **Node.js/Express** (API) + **MySQL** (cơ sở dữ liệu).

## Nền tảng & môi trường

| Công nghệ | Phiên bản | Dùng để |
|---|---|---|
| Node.js | 24.18 | Chạy backend và công cụ build |
| MySQL Server | 26.7 | Cơ sở dữ liệu, collation `utf8mb4_unicode_ci` (tìm kiếm không phân biệt dấu) |
| TypeScript | 6.0 | Ngôn ngữ cho cả backend và frontend |
| Windows + PowerShell | — | Môi trường phát triển local |

## Backend (`backend/`)

| Công nghệ | Phiên bản | Dùng để |
|---|---|---|
| Express | 5 | Web framework, REST API |
| Prisma | 6.19 | ORM: schema, migration, seed, truy vấn MySQL, transaction |
| Zod | 4 | Kiểm tra dữ liệu đầu vào và sinh JSON Schema cho tài liệu API |
| jsonwebtoken | 9 | Tạo và xác minh JWT (HS256) |
| cookie-parser | 1.4 | Đọc cookie phiên `qb_session` (httpOnly, SameSite=Lax) |
| bcrypt | 6 | Hash mật khẩu |
| Helmet | 8 | Header bảo mật HTTP |
| cors | 2.8 | Cấu hình CORS |
| express-rate-limit | 8 | Giới hạn số lần gọi API, chống dò mật khẩu |
| multer | 2 | Upload ảnh (có kiểm tra magic bytes) |
| Pino + pino-http | 10 / 11 | Ghi log (pino-pretty khi dev) |
| swagger-ui-express | 5 | Trang tài liệu API tại `/api/docs` |
| dotenv | — | Đọc biến môi trường từ `.env` |
| tsx | 4 | Chạy TypeScript trực tiếp khi dev, tự reload |

## Frontend (`frontend/`)

| Công nghệ | Phiên bản | Dùng để |
|---|---|---|
| React | 19 | Thư viện giao diện |
| Vite | 8 | Dev server và build |
| Tailwind CSS | 4 | Style bằng utility class (`@tailwindcss/vite`) |
| React Router | 8 | Điều hướng trang, lazy-load từng trang |
| TanStack Query | 5 | Gọi API, cache, tự làm mới dữ liệu |
| Axios | 1 | HTTP client |
| React Hook Form + Zod | 7 / 4 | Quản lý form và validate (`@hookform/resolvers`) |
| Recharts | 3 | Biểu đồ doanh thu, thống kê |
| Sonner | 2 | Toast thông báo |
| Lucide React | — | Bộ icon |
| @fontsource/be-vietnam-pro | 5 | Font Be Vietnam Pro chạy offline |
| clsx + tailwind-merge | — | Ghép class CSS có điều kiện |

## Kiểm thử & chất lượng code

| Công nghệ | Dùng để |
|---|---|
| Vitest 5 | Chạy test backend (189 test) và frontend (61 test) |
| Supertest | Test API backend trên database `*_test` riêng |
| React Testing Library + jest-dom + user-event | Test component giao diện |
| jsdom | Giả lập trình duyệt cho test frontend |
| ESLint 10 + typescript-eslint | Lint backend |
| Oxlint | Lint frontend |
| Prettier | Định dạng code |

## Kỹ thuật & kiến trúc đã áp dụng

- **Xác thực:**
  - JWT trong cookie httpOnly.
  - Mỗi request kiểm tra lại `tokenVersion` và trạng thái tài khoản, nên khi đổi mật khẩu hoặc khoá tài khoản thì các phiên cũ bị thu hồi.
- **Phân quyền** theo 3 vai trò: sinh viên, chủ quầy, quản trị.
- **Bảo mật:**
  - Chống CSRF bằng cách chỉ chấp nhận request cùng nguồn (same-origin).
  - Rate limit và Helmet.
  - Kiểm tra file upload bằng magic bytes.
  - Ở production, ứng dụng không chạy nếu `JWT_SECRET` là giá trị mẫu hoặc quá yếu.
- **Đặt đơn bằng transaction:**
  - Giá tính ở server, lưu snapshot món vào đơn.
  - Khoá giỏ hàng bằng `SELECT … FOR UPDATE`.
  - Idempotency key chống tạo đơn trùng.
- **Trạng thái đơn (state machine):**
  - Đơn đi theo thứ tự: Chờ xác nhận → Đã nhận → Đang làm → Sẵn sàng → Hoàn tất.
  - Đơn có thể kết thúc ở trạng thái Huỷ hoặc Từ chối.
  - `updateMany WHERE status` chặn việc hai người cập nhật cùng một đơn cùng lúc.
- **Nhật ký thao tác (audit log)** cho các thao tác quản trị.
- **Tài liệu API OpenAPI** sinh từ Zod, có test đảm bảo tài liệu khớp với các route thật.
- **Chạy offline hoàn toàn:** ảnh món (.webp) nằm trong `frontend/public/images` và font được đóng gói sẵn.
- **Sao lưu/khôi phục database** bằng `npm run db:backup` / `npm run db:restore` (dùng mysqldump/mysql).

## Tài liệu liên quan

- `README.md`: hướng dẫn cài đặt và chạy.
- `docs/api.md`, `docs/database.md`, `docs/business-rules.md`, `docs/security.md`, `docs/deployment.md`
- `docs/jira/`: kế hoạch 7 tuần và file CSV import Jira.
