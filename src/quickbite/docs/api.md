# Tài liệu API QuickBite

## Swagger UI (khuyên dùng)

Khi backend chạy ở chế độ phát triển:

- **Swagger UI:** http://localhost:4000/api/docs — xem và gọi thử mọi API ngay trên trình duyệt
- **Đặc tả OpenAPI 3.1 (JSON):** http://localhost:4000/api/v1/openapi.json — nhập vào Postman / Insomnia

Cách thử API cần đăng nhập trong Swagger UI:

1. Mở `POST /auth/login` → **Try it out** → nhập email & mật khẩu demo → **Execute**.
2. Server đặt cookie `qb_session`; các API khác trong cùng trang sẽ tự gửi cookie này.

> Body của request trong tài liệu được **sinh tự động từ schema Zod** dùng để kiểm tra dữ liệu
> (`backend/src/docs/openapi.ts`), nên luôn khớp với quy tắc validate thật.
> Test `backend/tests/openapi.test.ts` kiểm tra mọi đường dẫn trong tài liệu đều tồn tại trên server.
>
> Trang tài liệu **tắt mặc định khi production** (bật bằng `API_DOCS=true`).

## Quy ước chung

| | |
|---|---|
| Đường dẫn gốc | `/api/v1` |
| Xác thực | Cookie `qb_session` (JWT, httpOnly) đặt bởi `POST /auth/login` |
| Phản hồi thành công | `{ "success": true, "data": ..., "meta"?: { page, pageSize, total, totalPages } }` |
| Phản hồi lỗi | `{ "success": false, "error": { "code", "message", "details"? } }` |
| Tiền tệ | VND, chuỗi số nguyên (vd `"35000"`) |
| Thời gian | ISO 8601 (UTC). Tham số `from` / `to` dạng `YYYY-MM-DD` theo giờ Việt Nam |
| Phân trang | `?page=1&pageSize=20` |

### Mã lỗi thường gặp

| HTTP | `error.code` | Ý nghĩa |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Dữ liệu sai; `details` = danh sách `{ field, message }` |
| 401 | `UNAUTHORIZED` | Chưa đăng nhập / phiên hết hạn / tài khoản bị khoá giữa chừng |
| 403 | `FORBIDDEN` | Không đủ quyền |
| 404 | `NOT_FOUND` | Không tìm thấy (cũng dùng khi truy cập tài nguyên không thuộc quyền của mình) |
| 409 | `CONFLICT` / `CART_STALL_CONFLICT` | Trùng dữ liệu / giỏ đang có món của quầy khác |
| 422 | `BUSINESS_RULE_VIOLATION` / `ORDER_REJECTED` | Vi phạm quy tắc nghiệp vụ (đơn không huỷ được, món hết...) |
| 429 | `TOO_MANY_REQUESTS` | Vượt giới hạn tần suất |

## Danh sách endpoint

Tất cả API nằm dưới `/api/v1`. Phản hồi thống nhất:
`{ "success": true, "data": ..., "meta"?: {page, pageSize, total, totalPages} }` hoặc
`{ "success": false, "error": { "code", "message", "details"? } }`.

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/health` | Công khai | Kiểm tra API & MySQL |
| GET | `/home` | Công khai | Dữ liệu trang chủ: danh mục, quầy nổi bật, món bán chạy, món đề xuất, khuyến mãi |
| GET | `/categories` | Công khai | Danh mục đang hoạt động (kèm số món) |
| GET | `/stalls` | Công khai | Danh sách quầy: `?q=` (kèm điểm đánh giá, trạng thái mở cửa) |
| GET | `/stalls/:idOrSlug` | Công khai | Chi tiết quầy + thực đơn + đánh giá gần đây |
| GET | `/menu-items` | Công khai | Tìm & lọc món: `?q=&category=&stall=&categoryId=&stallId=&minPrice=&maxPrice=&available=true&featured=true&sort=popular\|price_asc\|price_desc\|newest\|name&page=&pageSize=` |
| GET | `/menu-items/:id` | Công khai | Chi tiết món + món gợi ý cùng quầy |
| GET | `/pickup-locations` | Công khai | Điểm nhận món đang hoạt động |
| GET | `/cart` | Sinh viên | Giỏ hàng: món, tạm tính, cảnh báo, khung giờ nhận |
| POST | `/cart/items` | Sinh viên | Thêm món `{ menuItemId, quantity, note?, replaceCart? }`; giỏ có món quầy khác → `409 CART_STALL_CONFLICT` |
| PATCH | `/cart/items/:id` | Sinh viên (giỏ của mình) | Sửa số lượng / ghi chú |
| DELETE | `/cart/items/:id` · `/cart` | Sinh viên | Xoá một món / xoá cả giỏ |
| POST | `/orders` | Sinh viên | Đặt đơn từ giỏ `{ pickupLocationId, pickupTime?, customerNote?, paymentMethod, idempotencyKey }` → `201` (mới) hoặc `200` (gửi lại cùng khoá) |
| GET | `/orders` | Sinh viên | Lịch sử đơn: `?group=active\|completed\|cancelled&page=` |
| GET | `/orders/:id` | Sinh viên (đơn của mình) | Chi tiết & lịch sử trạng thái |
| POST | `/orders/:id/cancel` | Sinh viên (đơn của mình) | Huỷ đơn khi còn `PENDING` `{ reason? }` |
| POST | `/auth/register` | Công khai | Đăng ký (luôn là **Sinh viên**) |
| POST | `/auth/login` | Công khai | Đăng nhập, đặt cookie phiên |
| POST | `/auth/logout` | Công khai | Xoá cookie phiên |
| GET | `/auth/me` | Đã đăng nhập | Người dùng hiện tại (kèm quầy được quản lý) |
| PATCH | `/users/me` | Đã đăng nhập | Cập nhật hồ sơ |
| PATCH | `/users/me/password` | Đã đăng nhập | Đổi mật khẩu (đăng xuất các thiết bị khác) |
| POST | `/orders/:id/review` | Sinh viên (đơn của mình, đã hoàn thành) | Đánh giá `{ rating: 1–5, comment? }` — mỗi đơn một lần |
| POST | `/reviews/:id/report` | Sinh viên, Chủ quầy | Báo cáo đánh giá `{ reason }` |
| GET | `/notifications` | Đã đăng nhập | Thông báo của mình `?unread=true&page=` |
| GET | `/notifications/unread-count` | Đã đăng nhập | Số thông báo chưa đọc |
| PATCH | `/notifications/:id/read` · POST `/notifications/read-all` | Đã đăng nhập | Đánh dấu đã đọc |
| GET | `/vendor/stalls` | Chủ quầy, Admin | Quầy mình quản lý |
| GET · PATCH | `/vendor/stalls/:stallId` | Nhân viên quầy (sửa: chỉ chủ quầy), Admin | Thông tin quầy, giờ mở cửa, ảnh bìa |
| PATCH | `/vendor/stalls/:stallId/accepting-orders` | Nhân viên quầy, Admin | Bật / tắt nhận đơn |
| GET | `/vendor/stalls/:stallId/dashboard` | Nhân viên quầy, Admin | Số liệu hôm nay, hàng đợi đơn, món bán chạy 7 ngày |
| GET | `/vendor/stalls/:stallId/orders` | Nhân viên quầy, Admin | `?tab=new\|in_progress\|ready\|completed\|cancelled&from=&to=&q=&page=` (kèm số lượng từng tab) |
| GET | `/vendor/stalls/:stallId/orders/:orderId` | Nhân viên quầy, Admin | Chi tiết đơn + `nextStatuses` hợp lệ |
| PATCH | `/vendor/stalls/:stallId/orders/:orderId/status` | Nhân viên quầy, Admin | `{ status, reason? }` (từ chối / huỷ bắt buộc lý do) |
| GET · POST | `/vendor/stalls/:stallId/menu-items` | Nhân viên quầy, Admin | Danh sách (`?status=active\|inactive\|all&q=&categoryId=`) / thêm món |
| PATCH · DELETE | `/vendor/stalls/:stallId/menu-items/:itemId` | Nhân viên quầy, Admin | Sửa / ngừng bán (xoá mềm) |
| POST | `/vendor/stalls/:stallId/uploads` | Nhân viên quầy, Admin | Tải ảnh (multipart, trường `image`, JPG/PNG/WEBP ≤ 2MB) |
| GET | `/vendor/stalls/:stallId/reports` | Nhân viên quầy, Admin | Báo cáo `?from=YYYY-MM-DD&to=YYYY-MM-DD` (mặc định 7 ngày) |
| GET | `/admin/dashboard` | Admin | Số liệu toàn hệ thống, chuỗi 14 ngày, top quầy, đánh giá bị báo cáo |
| GET · POST | `/admin/users` | Admin | Danh sách (`?search=&role=&status=&page=`) / tạo tài khoản |
| GET · PATCH | `/admin/users/:id` | Admin | Chi tiết / sửa (họ tên, vai trò, trạng thái) — không tự khoá mình, luôn còn ≥ 1 admin |
| POST | `/admin/users/:id/reset-password` | Admin | Đặt lại mật khẩu (đăng xuất mọi phiên) |
| GET · POST | `/admin/stalls` | Admin | Danh sách / tạo quầy (slug tự sinh từ tên tiếng Việt) |
| PATCH | `/admin/stalls/:id` | Admin | Sửa / bật tắt quầy |
| POST · PATCH · DELETE | `/admin/stalls/:id/members[/:userId]` | Admin | Gán / đổi vai trò / gỡ nhân sự quầy (`{ email, role: OWNER\|STAFF }`) |
| GET · POST · PATCH · DELETE | `/admin/categories[/:id]` | Admin | Danh mục (chỉ xoá được khi chưa có món) |
| GET · POST · PATCH | `/admin/pickup-locations[/:id]` | Admin | Điểm nhận món |
| GET | `/admin/orders` | Admin | Đơn toàn hệ thống `?status=&stallId=&q=&from=&to=&page=` |
| GET · PATCH | `/admin/orders/:id[/status]` | Admin | Chi tiết / đổi trạng thái theo máy trạng thái |
| GET · PATCH | `/admin/reviews[/:id]` | Admin | Kiểm duyệt đánh giá `?status=REPORTED\|VISIBLE\|HIDDEN` / `{ status: VISIBLE\|HIDDEN }` |
| GET | `/admin/audit-logs` | Admin | Nhật ký quản trị `?action=&entityType=&page=` |

> 💡 **Tìm kiếm không dấu:** database dùng collation `utf8mb4_unicode_ci` nên tìm `pho` hoặc `com chien` vẫn ra "Phở", "Cơm chiên".
>
> **Banner khuyến mãi** trên trang chủ cấu hình trong [`backend/src/config/promotions.ts`](backend/src/config/promotions.ts).
>
> **Giờ mở cửa** tính theo giờ Việt Nam (`Asia/Ho_Chi_Minh`). Một món chỉ đặt được (`canOrder`) khi món còn hàng **và** quầy đang hoạt động, đang bật nhận đơn, đang trong giờ mở cửa.

