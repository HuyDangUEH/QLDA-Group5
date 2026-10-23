# Project Charter: QuickBite

## Thông tin dự án

| Hạng mục | Nội dung |
|---|---|
| Tên dự án | QuickBite - Hệ thống web đặt món và quản lý đơn hàng căn tin UEH |
| Môn học | Quản lý dự án Công nghệ thông tin (26C1INF50901603) |
| Giảng viên hướng dẫn / Sponsor | TS. Nguyễn Mạnh Tuấn |
| Nhóm thực hiện | Nhóm 5 |
| Quản lý kiểm soát | PCG (Nguyễn Đinh Thảo Nhi) |
| Thời gian dự kiến | 19/10/2026-04/12/2026 (7 tuần) |
| Chu kỳ Sprint | 1 tuần |

## Bối cảnh và vấn đề

Sinh viên UEH có khoảng nghỉ ngắn giữa các ca học, trong khi căn tin thường đông vào giờ cao điểm. Việc xếp hàng, gọi món và thanh toán thủ công làm tăng thời gian chờ; nhân viên quầy cũng khó kiểm soát đơn hàng và tình trạng món.

QuickBite hướng tới số hóa việc xem thực đơn, đặt món trước và tiếp nhận đơn tại quầy để hỗ trợ sinh viên nhận món thuận tiện hơn và giúp quầy xử lý đơn chính xác hơn.

## Mục tiêu

- Xây dựng MVP web responsive cho sinh viên, nhân viên/chủ quầy và quản trị viên.
- Hỗ trợ xem thực đơn, đặt món trước, chọn điểm/khung giờ nhận và theo dõi trạng thái đơn.
- Hỗ trợ quy trình thanh toán trực tuyến bằng VietQR và quản lý đơn tập trung.
- Mục tiêu nghiệp vụ kỳ vọng: giảm thời gian chờ từ khoảng 10-15 phút xuống dưới 3 phút; kết quả cần được đánh giá qua thử nghiệm người dùng.

## Phạm vi

**Trong phạm vi:**
- Tài khoản, đăng nhập, hồ sơ và phân quyền theo vai trò.
- Khám phá quầy, danh mục, món ăn và điểm nhận.
- Giỏ hàng, tạo đơn, theo dõi/cập nhật trạng thái và lịch sử đơn.
- Công cụ quản lý thực đơn, đơn hàng và báo cáo cơ bản cho quầy/quản trị.
- Tích hợp quy trình VietQR; kiểm thử, tài liệu và bàn giao MVP.

**Ngoài phạm vi:**
- Ứng dụng di động native.
- Giao hàng ngoài khuôn viên hoặc điều phối shipper.
- Tích hợp xử lý/đối soát tự động trực tiếp với ngân hàng nếu không có quyền truy cập dịch vụ phù hợp.
- Triển khai vận hành thương mại quy mô lớn ngoài phạm vi đồ án.

## Mốc thời gian

| Mốc | Thời gian |
|---|---|
| Khởi động và phân tích | 19/10-23/10/2026 |
| Xác thực và phân quyền | 26/10-30/10/2026 |
| Khám phá món ăn | 02/11-06/11/2026 |
| Giỏ hàng và đặt món | 09/11-13/11/2026 |
| Chủ quầy và thông báo | 16/11-20/11/2026 |
| Quản trị hệ thống | 23/11-27/11/2026 |
| UAT, hoàn thiện và bàn giao | 30/11-04/12/2026 |

## Công nghệ và công cụ

- Frontend: React 19, TypeScript, Vite 8, Tailwind CSS 4.
- Backend: Node.js, Express 5, TypeScript, Prisma 6.
- Cơ sở dữ liệu: MySQL.
- Kiểm thử: Vitest 5, Supertest; backend integration test sử dụng database riêng có tên kết thúc bằng `_test`.
- Quản lý dự án và mã nguồn: Jira Software, GitHub; trao đổi nhóm qua Zalo và Google Meet.

## Tiêu chí thành công

- MVP hoàn thành các luồng chính theo backlog và được kiểm thử theo tiêu chí chấp nhận.
- Không còn lỗi nghiêm trọng ảnh hưởng đến đăng nhập, đặt món, xử lý đơn hoặc phân quyền khi bàn giao.
- Hoàn tất UAT/demo và tài liệu hướng dẫn trong mốc tuần thứ 7.
