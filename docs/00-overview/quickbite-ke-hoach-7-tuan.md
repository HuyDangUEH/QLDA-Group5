# QuickBite — Kế hoạch 7 tuần cho nhóm 5 người

Dự án Jira: **SCRUM** (hogiabaoworking) · Bắt đầu: **2026-10-19** · 7 Epic, 101 task

## Thành viên

| Vai trò | Phụ trách |
|---|---|
| PM | Quản lý dự án: kế hoạch, sprint, rủi ro, báo cáo, demo |
| BA | Phân tích nghiệp vụ: yêu cầu, user story, tiêu chí chấp nhận, UAT |
| Designer | Thiết kế UI/UX: user flow, wireframe, mockup, design QA |
| QA | Kiểm thử: test plan, test case, test tự động, hồi quy |
| Dev | Lập trình fullstack: backend Node.js + frontend React + MySQL |

## Cách chia việc

- **BA và Designer đi trước Dev 1 tuần.** Tuần N, BA viết user story và Designer làm mockup cho tính năng của tuần N+1. Nhờ vậy Dev luôn có yêu cầu và thiết kế sẵn khi bắt đầu.
- **QA kiểm thử ngay trong tuần.** QA viết test case từ tiêu chí chấp nhận của BA, rồi test tính năng Dev làm xong trong cùng tuần.
- **PM chạy nhịp Scrum.** Mỗi tuần có planning và review/demo, theo dõi rủi ro, báo cáo tiến độ, tổ chức UAT và demo cuối kỳ.
- **Dev là người duy nhất viết code**, nên task code được gom thành các khối lớn. Nếu Dev bị trễ, QA có thể nhận phần test tự động và Designer có thể nhận phần chỉnh giao diện.
- Mỗi task gắn nhãn vai trò (`PM`, `BA`, `Designer`, `QA`, `Dev`) và nhãn tuần (`tuan-1`…`tuan-7`). Khi có tài khoản Jira của từng người, lọc theo nhãn rồi dùng **Bulk change** để gán Assignee.

## Tuần 1 (2026-10-19 → 2026-10-23): Khởi động & phân tích

_Mục tiêu:_ Chốt phạm vi và quy trình, phân tích yêu cầu, dựng design system và khung dự án.

| # | Vai trò | Task | SP |
|---|---|---|---|
| 1 | PM | Lập kế hoạch dự án: phạm vi, mốc 7 tuần, tiêu chí hoàn thành | 3 |
| 2 | PM | Thiết lập Jira, board Scrum, quy trình làm việc và lịch họp | 2 |
| 3 | PM | Họp kick-off: giới thiệu dự án, phân vai, kênh liên lạc | 1 |
| 4 | BA | Thu thập yêu cầu: phỏng vấn sinh viên và chủ quầy | 3 |
| 5 | BA | Viết tài liệu yêu cầu (SRS) và mô tả các vai trò người dùng | 5 |
| 6 | BA | User story + tiêu chí chấp nhận cho Xác thực & phân quyền | 3 |
| 7 | Designer | Nghiên cứu người dùng: persona và user flow chính | 3 |
| 8 | Designer | Design system: màu, font Be Vietnam Pro, component cơ bản | 5 |
| 9 | Designer | Wireframe đăng ký, đăng nhập, hồ sơ cá nhân | 3 |
| 10 | QA | Viết kế hoạch kiểm thử (test plan) và chiến lược test | 3 |
| 11 | QA | Thiết lập Vitest + Supertest và database test riêng | 3 |
| 12 | Dev | Khởi tạo backend Express 5 + TypeScript + Prisma + MySQL | 5 |
| 13 | Dev | Khởi tạo frontend React 19 + Vite + Tailwind + Router + TanStack Query | 3 |
| 14 | Dev | Thiết kế schema CSDL, migration đầu tiên và seed dữ liệu mẫu | 5 |
| 15 | Dev | Middleware chung: xử lý lỗi, logger Pino, Helmet, CORS | 2 |

## Tuần 2 (2026-10-26 → 2026-10-30): Xác thực & phân quyền

_Mục tiêu:_ Đăng ký, đăng nhập, phiên an toàn và phân quyền theo vai trò.

| # | Vai trò | Task | SP |
|---|---|---|---|
| 1 | PM | Sprint planning tuần 2 và theo dõi tiến độ hằng ngày | 1 |
| 2 | PM | Lập danh sách rủi ro (risk register) và phương án xử lý | 2 |
| 3 | BA | User story + tiêu chí chấp nhận cho Khám phá món (tìm kiếm, lọc, quầy, chi tiết món) | 3 |
| 4 | BA | Ma trận phân quyền: sinh viên, chủ quầy, quản trị | 2 |
| 5 | Designer | Mockup hi-fi đăng ký, đăng nhập, hồ sơ | 3 |
| 6 | Designer | Wireframe trang chủ, tìm kiếm, trang quầy, chi tiết món | 5 |
| 7 | QA | Viết test case xác thực & phân quyền | 3 |
| 8 | QA | Viết test API tự động cho xác thực | 5 |
| 9 | QA | Kiểm thử thủ công luồng đăng ký/đăng nhập/đăng xuất | 2 |
| 10 | Dev | API đăng ký, đăng nhập, đăng xuất với JWT trong cookie httpOnly | 5 |
| 11 | Dev | Middleware phân quyền, tokenVersion, rate limit, chống CSRF | 5 |
| 12 | Dev | API hồ sơ cá nhân + đổi mật khẩu | 2 |
| 13 | Dev | Trang đăng ký, đăng nhập + chuyển hướng theo vai trò | 5 |
| 14 | Dev | ProtectedRoute, trang hồ sơ, trang 403/404 | 3 |

## Tuần 3 (2026-11-02 → 2026-11-06): Khám phá món ăn

_Mục tiêu:_ Trang chủ, tìm kiếm, bộ lọc, trang quầy và chi tiết món.

| # | Vai trò | Task | SP |
|---|---|---|---|
| 1 | PM | Sprint review/demo tuần 2 và planning tuần 3 | 1 |
| 2 | PM | Báo cáo tiến độ cho giảng viên/khách hàng | 1 |
| 3 | BA | User story + tiêu chí chấp nhận cho Giỏ hàng, checkout, đặt đơn | 5 |
| 4 | BA | Quy tắc nghiệp vụ đơn hàng: 1 quầy/đơn, giờ nhận, điều kiện huỷ | 3 |
| 5 | Designer | Mockup hi-fi trang chủ, tìm kiếm, trang quầy, chi tiết món | 5 |
| 6 | Designer | Chuẩn bị ảnh món & banner offline (.webp, tối ưu dung lượng) | 2 |
| 7 | Designer | Wireframe giỏ hàng, checkout, lịch sử đơn | 3 |
| 8 | QA | Viết test case tìm kiếm & bộ lọc | 2 |
| 9 | QA | Viết test API tự động cho tìm kiếm/lọc | 3 |
| 10 | QA | Kiểm tra responsive trên điện thoại các trang khám phá | 2 |
| 11 | Dev | API quầy, danh mục, điểm nhận | 3 |
| 12 | Dev | API danh sách món: tìm kiếm không dấu, lọc, phân trang, index | 5 |
| 13 | Dev | API chi tiết món + đánh giá | 2 |
| 14 | Dev | Trang chủ + thanh tìm kiếm | 5 |
| 15 | Dev | Trang danh sách món, trang quầy, trang chi tiết món | 8 |

## Tuần 4 (2026-11-09 → 2026-11-13): Giỏ hàng & đặt món

_Mục tiêu:_ Giỏ hàng lưu DB, checkout, tạo đơn bằng transaction, xác nhận và lịch sử đơn.

| # | Vai trò | Task | SP |
|---|---|---|---|
| 1 | PM | Sprint review/demo tuần 3 và planning tuần 4 | 1 |
| 2 | PM | Họp giữa kỳ: rà phạm vi, điều chỉnh kế hoạch nếu trễ | 2 |
| 3 | BA | User story + tiêu chí chấp nhận cho Chủ quầy (thực đơn, xử lý đơn, doanh thu, thông báo) | 5 |
| 4 | BA | Sơ đồ trạng thái đơn hàng (state machine) | 2 |
| 5 | Designer | Mockup hi-fi giỏ hàng, checkout, xác nhận, lịch sử đơn | 5 |
| 6 | Designer | Wireframe dashboard chủ quầy và màn hình xử lý đơn | 3 |
| 7 | QA | Viết test case giỏ hàng & đặt đơn | 3 |
| 8 | QA | Test tự động transaction tạo đơn và đặt đơn đồng thời | 5 |
| 9 | QA | Kiểm thử thủ công luồng đặt món từ đầu đến cuối | 2 |
| 10 | Dev | Schema Cart/Order/OrderItem + API giỏ hàng | 5 |
| 11 | Dev | API tạo đơn bằng transaction (giá phía server, khoá giỏ) + idempotency | 8 |
| 12 | Dev | API lịch sử, chi tiết và huỷ đơn | 3 |
| 13 | Dev | Trang giỏ hàng + mini cart | 5 |
| 14 | Dev | Trang checkout, xác nhận, lịch sử và chi tiết đơn | 8 |

## Tuần 5 (2026-11-16 → 2026-11-20): Chủ quầy & thông báo

_Mục tiêu:_ Dashboard chủ quầy, quản lý thực đơn, xử lý đơn theo trạng thái, doanh thu, thông báo.

| # | Vai trò | Task | SP |
|---|---|---|---|
| 1 | PM | Sprint review/demo tuần 4 và planning tuần 5 | 1 |
| 2 | PM | Cập nhật rủi ro và kế hoạch còn lại | 1 |
| 3 | BA | User story + tiêu chí chấp nhận cho Quản trị (người dùng, quầy, danh mục, kiểm duyệt, nhật ký) | 5 |
| 4 | BA | Định nghĩa chỉ số báo cáo doanh thu và thống kê | 2 |
| 5 | Designer | Mockup hi-fi dashboard chủ quầy, quản lý thực đơn, báo cáo | 5 |
| 6 | Designer | Wireframe dashboard quản trị | 3 |
| 7 | QA | Viết test case chủ quầy & chuyển trạng thái đơn | 3 |
| 8 | QA | Test API tự động cho chủ quầy + upload ảnh | 5 |
| 9 | QA | Kiểm thử thủ công luồng xử lý đơn của chủ quầy | 2 |
| 10 | Dev | State machine trạng thái đơn + API xử lý đơn cho chủ quầy | 5 |
| 11 | Dev | API quản lý thực đơn + upload ảnh (kiểm tra magic bytes) | 5 |
| 12 | Dev | API báo cáo doanh thu + hệ thống thông báo | 5 |
| 13 | Dev | Dashboard chủ quầy + màn hình xử lý đơn | 5 |
| 14 | Dev | Trang quản lý thực đơn, báo cáo doanh thu, thông báo | 8 |

## Tuần 6 (2026-11-23 → 2026-11-27): Quản trị hệ thống

_Mục tiêu:_ Thống kê, người dùng, quầy & nhân viên, danh mục, điểm nhận, đơn hàng, đánh giá, nhật ký.

| # | Vai trò | Task | SP |
|---|---|---|---|
| 1 | PM | Sprint review/demo tuần 5 và planning tuần 6 | 1 |
| 2 | PM | Lập kế hoạch UAT và bàn giao | 2 |
| 3 | BA | Viết kịch bản UAT cho từng vai trò | 3 |
| 4 | BA | Đối chiếu tính năng đã làm với yêu cầu (traceability) | 2 |
| 5 | Designer | Mockup hi-fi các trang quản trị | 5 |
| 6 | Designer | Design QA: so giao diện đã code với thiết kế, ghi lỗi UI | 3 |
| 7 | QA | Viết test case quản trị & nhật ký thao tác | 3 |
| 8 | QA | Test API tự động cho quản trị | 5 |
| 9 | QA | Kiểm thử bảo mật cơ bản: phân quyền, truy cập chéo dữ liệu, upload | 3 |
| 10 | Dev | API thống kê + quản lý người dùng | 5 |
| 11 | Dev | API quầy & nhân viên, danh mục, điểm nhận, kiểm duyệt đánh giá | 5 |
| 12 | Dev | API đơn hàng toàn hệ thống + audit log | 3 |
| 13 | Dev | Dashboard quản trị + trang quản lý người dùng | 5 |
| 14 | Dev | Trang quầy, danh mục, điểm nhận, đơn hàng, đánh giá, nhật ký | 8 |

## Tuần 7 (2026-11-30 → 2026-12-04): UAT, hoàn thiện & bàn giao

_Mục tiêu:_ Kiểm thử chấp nhận, sửa lỗi, tài liệu, bảo mật và demo cuối kỳ.

| # | Vai trò | Task | SP |
|---|---|---|---|
| 1 | PM | Tổ chức UAT với người dùng thử | 2 |
| 2 | PM | Chuẩn bị demo và slide báo cáo cuối kỳ | 3 |
| 3 | PM | Họp retrospective và tổng kết dự án | 1 |
| 4 | BA | Viết hướng dẫn sử dụng cho sinh viên, chủ quầy, quản trị | 3 |
| 5 | BA | Tổng hợp phản hồi UAT thành danh sách lỗi/cải tiến | 2 |
| 6 | Designer | Rà soát accessibility và câu chữ tiếng Việt | 2 |
| 7 | Designer | Hình ảnh/video minh hoạ cho slide demo | 2 |
| 8 | QA | Kiểm thử hồi quy toàn bộ + npm audit | 5 |
| 9 | QA | Cài đặt mới từ đầu theo README trên máy sạch | 2 |
| 10 | QA | Báo cáo kết quả kiểm thử | 2 |
| 11 | Dev | Tài liệu API Swagger/OpenAPI + rà soát bảo mật | 5 |
| 12 | Dev | Sao lưu/khôi phục DB + cấu hình production | 3 |
| 13 | Dev | Tối ưu hiệu năng: lazy-load trang, index, truy vấn N+1 | 3 |
| 14 | Dev | Sửa lỗi từ UAT và kiểm thử hồi quy | 5 |
| 15 | Dev | Hoàn thiện README và tài liệu kỹ thuật | 2 |

## Tải công việc (story point / tuần)

| Vai trò | Số task | T1 | T2 | T3 | T4 | T5 | T6 | T7 | Tổng SP |
|---|---|---|---|---|---|---|---|---|---|
| PM | 16 | 6 | 3 | 2 | 3 | 2 | 3 | 6 | 25 |
| BA | 15 | 11 | 5 | 8 | 7 | 7 | 5 | 5 | 48 |
| Designer | 16 | 11 | 8 | 10 | 8 | 8 | 8 | 4 | 57 |
| QA | 20 | 6 | 10 | 7 | 10 | 10 | 11 | 9 | 63 |
| Dev | 34 | 15 | 20 | 23 | 29 | 28 | 26 | 18 | 159 |

## Cách import CSV vào Jira

1. Mở https://hogiabaoworking.atlassian.net → dự án **SCRUM**.
2. Trong dự án: menu **…** → **Import issues** (hoặc ⚙️ → **System** → **External System Import** → **CSV**).
3. Chọn file `jira-import.csv`, encoding **UTF-8**, dấu phân cách `,`.
4. Định dạng ngày (Date format): `yyyy-MM-dd`.
5. Ghép cột (map fields):
   - Issue Id → **Issue Id**
   - Issue Type → **Issue Type**
   - Summary → **Summary**
   - Description → **Description**
   - Parent → **Parent** (task con thuộc Epic tương ứng)
   - Story Points → **Story point estimate** (hoặc *Story Points*)
   - Start date → **Start date**, Due date → **Due date**
   - Labels (2 cột) → **Labels**
6. Bấm **Begin Import**. Sau khi xong, ở Backlog tạo 7 sprint và kéo task theo nhãn `tuan-1` … `tuan-7`.
