2. File docs/problem-statement.md 
Markdown
# Báo Cáo Phân Tích Vấn Đề & Người Dùng Mục Tiêu (Problem Statement)

## 1. Bối cảnh & Vấn đề thực tế
Tại Đại học Kinh tế TP. Hồ Chí Minh (UEH), thời gian nghỉ giải lao giữa các ca học chỉ kéo dài từ 15 đến 25 phút. Việc di chuyển giữa các cơ sở trong điều kiện giao thông đông đúc khiến thời gian nghỉ ngơi của sinh viên bị cắt giảm nghiêm trọng.

Vào các khung giờ cao điểm (9h15–9h45, 11h00–11h45, 15h15–15h45), khu vực căn tin Cơ sở B và Cơ sở N luôn trong tình trạng quá tải. Sinh viên phải xếp hàng từ 10–15 phút chỉ để gọi món và thanh toán tiền mặt, dẫn đến việc ăn uống vội vã hoặc trễ giờ vào lớp. Nhân viên quầy căn tin chịu áp lực ghi nhận đơn dồn dập, dễ nhầm lẫn thực đơn và không thống kê kịp lượng hàng tồn.

## 2. Người dùng mục tiêu & Nỗi đau (Pain Points)
- **Sinh viên & Giảng viên UEH:** Mất thời gian chờ đợi, khó biết món nào còn hay hết, thời gian nghỉ ngơi bị rút ngắn.
- **Nhân viên & Quản lý căn tin:** Quá tải thao tác ghi chép thủ công, sót đơn giờ cao điểm, khó kiểm soát doanh thu và nguyên liệu.

## 3. Giải pháp QuickBite & Giá trị kỳ vọng
- Xem thực đơn trực tuyến cập nhật theo thời gian thực.
- Đặt món trước (Pre-order) và chọn khung giờ nhận món tại quầy.
- Quét mã VietQR chuyển khoản nhanh, không cần thối tiền lẻ.
- Quầy bếp nhận đơn qua màn hình tập trung, chuẩn bị món chính xác.
- **Kỳ vọng:** Giảm 70% thời gian chờ đợi, loại bỏ 95% sai sót nhầm món.

4. File docs/stakeholder-register.md 
Markdown
# Danh Sách & Phân Tích Các Bên Liên Quan (Stakeholder Register)

| Bên liên quan | Vai trò dự án | Kỳ vọng chính | Mức độ ảnh hưởng | Phương thức phối hợp |
|:---|:---|:---|:---:|:---|
| **TS. Nguyễn Mạnh Tuấn** | Giảng viên / Project Sponsor | Dự án giải quyết vấn đề thực tế, quy trình chuẩn mực, đúng tiến độ. | **Cao** | Báo cáo theo các mốc tuần (Milestone), xin định hướng phạm vi. |
| **Nhóm Kiểm soát (PCG)** | Đơn vị Quản trị / PMO | Nộp bài đúng hạn, họp Sprint đúng quy chuẩn (<= 30p), Jira cập nhật realtime. | **Cao** | Họp Sprint 18h45 Thứ 5, nộp plan trước 18h45 Thứ 4. |
| **Đại diện Quầy Căn tin** | Khách hàng nghiệp vụ | Giao diện dễ thao tác, không làm gián đoạn việc nấu nướng, đối soát tiền rõ ràng. | **Cao** | Phỏng vấn lấy yêu cầu, hướng dẫn dùng thử, lấy feedback định kỳ. |
| **Sinh viên UEH** | Người dùng cuối | Đặt món nhanh chóng, giao diện mượt trên điện thoại, nhận đồ ăn đúng giờ. | **Trung bình** | Khảo sát nhu cầu, thử nghiệm pre-order, tiếp nhận đánh giá chất lượng. |
| **Nhóm dự án (Nhóm 5)** | Đội ngũ phát triển | Phân công công bằng, đúng năng lực, hoàn thành sản phẩm MVP chất lượng. | **Cao** | Họp nội bộ hàng tuần, theo dõi task Jira, hỗ trợ kỹ thuật lẫn nhau. |
7. File src/README.md (Đặng Xuân Huy phụ trách)
Markdown
# Source Code Architecture & Development Guidelines

Thư mục chứa toàn bộ mã nguồn của dự án Web Application QuickBite (Sẽ bắt đầu triển khai từ Sprint 2).

## Cấu trúc mã nguồn dự kiến:
```text
src/
├── assets/         # Hình ảnh món ăn, logo thương hiệu, css, icons
├── components/     # Các thành phần giao diện tái sử dụng (Header, Footer, Menu Card)
├── config/         # Cấu hình kết nối CSDL MySQL và API VietQR
├── controllers/    # Xử lý logic nghiệp vụ đặt hàng và giỏ hàng
├── models/         # Định nghĩa cấu trúc dữ liệu (User, FoodItem, Order)
└── views/          # Giao diện người dùng (Trang chủ, Menu, Checkout, Admin quầy)


