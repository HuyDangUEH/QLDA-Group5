# Bảo mật QuickBite

Tài liệu này mô tả các biện pháp bảo mật đã áp dụng, kết quả rà soát bảo mật và các giới hạn còn lại.

## 1. Xác thực & phiên đăng nhập

| Biện pháp | Chi tiết | Mã nguồn |
|---|---|---|
| Băm mật khẩu | bcrypt 12 vòng; mật khẩu 8–72 ký tự, có chữ & số | `src/lib/password.ts` |
| Phiên | JWT HS256 (cố định thuật toán & issuer) trong cookie `qb_session`: `httpOnly`, `SameSite=Lax`, `Secure` khi production. **Không** lưu token trong localStorage | `src/lib/jwt.ts`, `src/utils/session-cookie.ts` |
| Thu hồi phiên | Mỗi request tải lại người dùng, kiểm tra `status` & `tokenVersion`. Đổi mật khẩu, admin đặt lại mật khẩu, đổi vai trò, khoá tài khoản → tăng `tokenVersion` → mọi phiên cũ mất hiệu lực ngay | `src/middlewares/auth.ts` |
| Chống dò mật khẩu | 10 lần thử sai / 15 phút / IP cho đăng nhập, đăng ký, đổi mật khẩu; so sánh với hash giả khi email không tồn tại để thời gian phản hồi như nhau | `src/middlewares/rate-limit.ts`, `src/modules/auth/auth.service.ts` |
| Khoá bí mật | Bắt buộc ≥ 32 ký tự; **production từ chối khởi động** nếu `JWT_SECRET` là giá trị mẫu hoặc quá yếu | `src/config/env.ts` |

## 2. Phân quyền

- **Kiểm tra ở server cho mọi request**; route bảo vệ ở giao diện chỉ để trải nghiệm.
- `requireRole` cho từng nhóm API (sinh viên / chủ quầy / admin).
- **Quyền theo quầy:** mọi route `/vendor/stalls/:stallId/...` đi qua `requireStallAccess` (bảng `vendor_memberships`). Quầy không thuộc mình trả `404` (không lộ quầy nào tồn tại). `STAFF` xử lý đơn & thực đơn; chỉ `OWNER` sửa thông tin quầy.
- **Quyền sở hữu dữ liệu:** đơn hàng, giỏ hàng, thông báo luôn lọc theo `studentId` / `userId` của người đang đăng nhập.
- Đăng ký công khai luôn tạo `STUDENT`; client không thể tự đặt vai trò.
- Admin không thể tự khoá / tự hạ quyền; hệ thống luôn còn ≥ 1 admin (kiểm tra có khoá dòng `FOR UPDATE` để tránh hai admin hạ quyền nhau cùng lúc).

## 3. Dữ liệu đầu vào

- Mọi body, query, param đều qua **Zod** (loại bỏ trường lạ) trước khi tới Prisma → không thể gán `price`, `total`, `status`, `paymentStatus`, `role`... từ client.
- Truy vấn qua Prisma (tham số hoá). Các truy vấn SQL thô dùng template có tham số (`$queryRaw\`...\``); không dùng `$queryRawUnsafe` với dữ liệu người dùng.
- Giới hạn body JSON 100 KB.

## 4. Đơn hàng & thanh toán

- Giá, tạm tính, tổng tiền **tính lại ở server** từ DB trong một transaction; món được snapshot tên & giá.
- Chống đặt trùng: `idempotencyKey` + ràng buộc `UNIQUE(studentId, idempotencyKey)` + **khoá giỏ hàng (`FOR UPDATE`)** nên hai lần checkout đồng thời (kể cả khác khoá) chỉ tạo một đơn.
- Chuyển trạng thái theo máy trạng thái, cập nhật có điều kiện (`WHERE status = cũ`) chống bấm đồng thời.
- Không bao giờ đánh dấu `PAID` dựa trên dữ liệu client gửi; tiền mặt chỉ chuyển `PAID` khi quầy xác nhận hoàn thành đơn.

## 5. Tải ảnh & nội dung

- Ảnh: chỉ JPG/PNG/WEBP, kiểm tra **magic bytes** (không tin đuôi file / mimetype), tối đa `MAX_UPLOAD_MB`, tên file ngẫu nhiên, thư mục cố định (không path traversal), giới hạn **30 ảnh / 10 phút / người dùng**.
- URL ảnh món / quầy chỉ nhận ảnh có sẵn (`/images/...`), ảnh tự tải lên (`/uploads/menu|stalls/...`) hoặc `https` từ tên miền trong `IMAGE_HOSTS` (chặn "pixel theo dõi" từ máy chủ lạ và `javascript:`).
- React tự escape nội dung; không dùng `dangerouslySetInnerHTML`. Chuyển hướng sau đăng nhập chỉ nhận đường dẫn nội bộ (`safeRedirect`).
- **Báo cáo đánh giá không tự ẩn đánh giá**: đánh giá vẫn hiển thị cho tới khi admin kiểm duyệt; chủ quầy không báo cáo được đánh giá về quầy mình.

## 6. HTTP & cấu hình

- **Helmet** (CSP, nosniff, HSTS khi HTTPS...), tắt `x-powered-by`.
- **CORS** chỉ cho các origin khai báo trong `CORS_ORIGINS`, kèm cookie.
- **CSRF:** cookie `SameSite=Lax` + kiểm tra header `Origin` với mọi request thay đổi dữ liệu (chỉ chấp nhận origin trong `CORS_ORIGINS` hoặc chính origin của API, vd Swagger UI).
- `TRUST_PROXY` cấu hình theo đúng số reverse proxy (mặc định 0) để không thể giả IP qua `X-Forwarded-For`.
- Lỗi không lường trước trả thông báo chung (500), không lộ stack trace; log (Pino) che `password`, `passwordHash`, `token`, cookie.
- Trang tài liệu API tắt mặc định khi production.
- Seed dữ liệu mẫu bị chặn khi `NODE_ENV=production`.
- **Nhật ký quản trị** (`audit_logs`): thao tác quan trọng của admin được ghi trong cùng transaction.

## 7. Kết quả rà soát bảo mật (Phase 7)

Một lượt rà soát độc lập toàn bộ mã backend & frontend (đọc mã, không chỉ checklist). Không phát hiện lỗi mức **Cao**.

| # | Mức | Phát hiện | Trạng thái |
|---|---|---|---|
| 1 | Trung bình | Báo cáo đánh giá ẩn ngay đánh giá → có thể bị lạm dụng để "dọn" đánh giá xấu / tấn công quầy đối thủ | ✅ Đã sửa: đánh giá bị báo cáo vẫn hiển thị tới khi admin quyết định; chủ quầy không báo cáo được quầy mình; không ghi đè lý do báo cáo đang chờ |
| 2 | Trung bình | `JWT_SECRET` mẫu trong `.env.example` vẫn hợp lệ khi production | ✅ Đã sửa: production từ chối khởi động |
| 3 | Thấp | `trust proxy` cố định = 1 → giả IP vượt giới hạn đăng nhập nếu không có proxy | ✅ Đã sửa: biến `TRUST_PROXY` (mặc định 0) |
| 4 | Thấp | Đăng xuất chỉ xoá cookie phía trình duyệt; token bị sao chép vẫn dùng được tới khi hết hạn | ⚠️ Chấp nhận (xem mục 8) |
| 5 | Thấp | Kiểm tra "còn ≥ 1 admin" có thể bị race khi hai admin hạ quyền nhau | ✅ Đã sửa: khoá `FOR UPDATE` + test đồng thời |
| 6 | Thấp | Hai lần checkout đồng thời với khác `idempotencyKey` có thể tạo hai đơn | ✅ Đã sửa: khoá giỏ hàng + test đồng thời |
| 7 | Thấp | Không giới hạn tải ảnh, file không dùng không được dọn | ✅ Đã giới hạn tần suất; ⚠️ dọn file thừa: chưa có (mục 8) |
| 8 | Thấp | URL ảnh https bất kỳ → pixel theo dõi | ✅ Đã sửa: chỉ ảnh tự tải lên hoặc tên miền trong `IMAGE_HOSTS` |
| 9 | Thông tin | Nhân viên quầy (`STAFF`) sửa được giá / ngừng bán món | Có chủ đích: nhân viên vận hành thực đơn hằng ngày (xem `business-rules.md`) |
| 10 | Thông tin | Đăng ký email đã tồn tại báo "đã được đăng ký" | Chấp nhận để thân thiện người dùng; có giới hạn tần suất |

`npm audit`: **0 lỗ hổng** ở cả backend và frontend (đã ép `deepmerge-ts@8` cho `@prisma/config` qua `overrides`).

## 8. Giới hạn đã biết & hướng cải thiện

- **Đăng xuất một thiết bị** không thu hồi token phía server (token sống tối đa `JWT_EXPIRES_IN`, mặc định 7 ngày). Có thể giảm `JWT_EXPIRES_IN`, hoặc bổ sung bảng phiên / danh sách thu hồi. Đổi mật khẩu luôn đăng xuất mọi thiết bị.
- **Bộ đếm giới hạn tần suất lưu trong bộ nhớ** → mất khi khởi động lại, không chia sẻ khi chạy nhiều tiến trình. Khi mở rộng nên dùng Redis store cho `express-rate-limit`.
- **Ảnh không còn dùng** không tự xoá; cần job dọn định kỳ nếu dung lượng là vấn đề.
- Mỗi người dùng có thể báo cáo một đánh giá nhiều lần (không có bảng lưu người báo cáo); việc này chỉ làm thêm việc cho admin, không ẩn được đánh giá.
- Thanh toán online **chưa tích hợp**; khi tích hợp phải xác thực webhook từ nhà cung cấp trước khi đánh dấu `PAID`.
