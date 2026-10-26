# Test case tìm kiếm và bộ lọc

## Phạm vi

Kiểm thử tìm kiếm món ăn trên trang chủ và trang khám phá món ăn (`/mon-an`), các bộ lọc danh mục, quầy, khoảng giá, tình trạng còn hàng, sắp xếp, xoá bộ lọc; đồng thời kiểm thử tìm kiếm quầy ăn trên trang `/quay-an`.

## Điều kiện tiên quyết và dữ liệu kiểm thử

- Backend, frontend và cơ sở dữ liệu kiểm thử đang hoạt động; có thể truy cập bằng tài khoản sinh viên.
- Danh mục hoạt động: `Bún – Phở` (`bun-pho`) và `Đồ uống` (`do-uong`).
- Quầy hoạt động: `Phở Cô Ba` (`pho-co-ba`), vị trí `Tòa A`.
- Các món thuộc dữ liệu mẫu:

| Tên món | Mô tả | Danh mục | Giá (đ) | Còn hàng |
|---|---|---|---:|---|
| Phở bò tái | Nước dùng thanh ngọt | Bún – Phở | 45.000 | Có |
| Bún chả | — | Bún – Phở | 40.000 | Có |
| Trà sữa trân châu | — | Đồ uống | 30.000 | Có |
| Cà phê sữa | — | Đồ uống | 25.000 | Không |

- Để kiểm tra ranh giới từng khoảng giá, bổ sung món còn hàng có giá lần lượt `30.001`, `50.000` và `50.001` đồng.
- Để kiểm tra tìm kiếm quầy theo tên, mô tả và vị trí, dữ liệu có ít nhất hai quầy hoạt động với tên, mô tả và vị trí khác nhau.
- Kết quả thực tế được ghi lại khi chạy kiểm thử; không đánh dấu Pass trước khi thực thi.

## Danh sách test case

| Test Case ID | Tên kịch bản kiểm thử | Mục tiêu & yêu cầu liên quan | Điều kiện tiên quyết | Dữ liệu đầu vào (Test Data) | Các bước thực hiện (Test Steps) | Kết quả kỳ vọng (Expected Result) | Mức ưu tiên | Kết quả thực tế |
|---|---|---|---|---|---|---|---|---|
| **TC-SF-01** | Tìm món từ trang chủ | Kiểm tra chuyển hướng tìm kiếm món ăn | Đang ở trang chủ | `phở` | 1. Nhập `phở` vào ô tìm món. 2. Bấm **Tìm**. | Điều hướng đến `/mon-an?q=ph%E1%BB%9F` (giá trị query được URL-encode); kết quả phù hợp được hiển thị. | Must | Chưa thực hiện |
| **TC-SF-02** | Tìm món không phân biệt hoa thường và dấu | Kiểm tra tìm kiếm tên món | Bộ dữ liệu món mẫu đã được tạo | `PHO` | 1. Mở `/mon-an`. 2. Nhập `PHO` vào ô tìm kiếm. 3. Chờ hệ thống ngừng debounce. | Kết quả có **Phở bò tái**; tìm kiếm không phân biệt hoa thường và dấu. | Must | Chưa thực hiện |
| **TC-SF-03** | Tìm món theo nội dung mô tả | Kiểm tra tìm kiếm cả tên lẫn mô tả | Món **Phở bò tái** có mô tả `Nước dùng thanh ngọt` | `thanh ngot` | 1. Nhập từ khoá vào ô tìm kiếm trên `/mon-an`. 2. Chờ kết quả tải. | Kết quả có **Phở bò tái**, dù từ khoá chỉ xuất hiện trong mô tả. | Must | Chưa thực hiện |
| **TC-SF-04** | Chuẩn hoá khoảng trắng khi tìm món | Kiểm tra cắt khoảng trắng đầu/cuối và debounce | Đang ở `/mon-an` | `  tra sua  ` | 1. Nhập từ khoá có khoảng trắng ở đầu và cuối. 2. Chờ ít nhất 400 ms sau lần gõ cuối. | Hệ thống tìm với từ khoá đã trim (`tra sua`), URL không chứa khoảng trắng thừa và kết quả phù hợp được cập nhật. | Should | Chưa thực hiện |
| **TC-SF-05** | Tìm món không có kết quả và xoá bộ lọc | Kiểm tra trạng thái rỗng | Đang ở `/mon-an` | `khongco123` | 1. Tìm từ khoá không khớp dữ liệu. 2. Bấm **Xoá bộ lọc** khi nút xuất hiện. | Hiển thị thông báo không tìm thấy món phù hợp; nút xoá đưa URL về `/mon-an` và tải lại danh sách không lọc. | Must | Chưa thực hiện |
| **TC-SF-06** | Lọc theo danh mục | Kiểm tra lọc món theo danh mục | Có món ở cả hai danh mục mẫu | `Đồ uống` | 1. Mở `/mon-an`. 2. Chọn danh mục **Đồ uống**. | URL có `category=do-uong`; chỉ hiển thị món thuộc danh mục này; lựa chọn được đánh dấu đang chọn và trang được đặt lại về trang 1. | Must | Chưa thực hiện |
| **TC-SF-07** | Lọc theo quầy ăn | Kiểm tra lọc món theo quầy | Có ít nhất hai quầy hoạt động có món | `Phở Cô Ba` | 1. Mở danh sách quầy lọc. 2. Chọn **Phở Cô Ba**. | URL có `stall=pho-co-ba`; mọi món hiển thị thuộc quầy đã chọn; trang được đặt lại về trang 1. | Must | Chưa thực hiện |
| **TC-SF-08** | Lọc khoảng giá dưới hoặc bằng 30.000đ | Kiểm tra cận trên của khoảng giá thấp | Có món giá 25.000đ và 30.000đ | `Từ 30.000đ trở xuống` | 1. Chọn khoảng giá **Từ 30.000đ trở xuống**. | Chỉ hiện món có giá `<= 30.000đ`; món giá 30.000đ được bao gồm, món giá 30.001đ không được bao gồm. | Must | Chưa thực hiện |
| **TC-SF-09** | Lọc khoảng giá trên 30.000đ đến 50.000đ | Kiểm tra hai cận của khoảng giá giữa | Có món giá 30.000đ, 30.001đ, 50.000đ và 50.001đ | `Trên 30.000đ – 50.000đ` | 1. Chọn khoảng giá giữa. | Chỉ hiện món có giá từ `30.001đ` đến `50.000đ` (bao gồm hai cận); loại món giá 30.000đ và 50.001đ. | Must | Chưa thực hiện |
| **TC-SF-10** | Lọc khoảng giá trên 50.000đ | Kiểm tra cận dưới của khoảng giá cao | Có món giá 50.000đ và 50.001đ | `Trên 50.000đ` | 1. Chọn khoảng giá **Trên 50.000đ**. | Chỉ hiện món có giá `>= 50.001đ`; món giá 50.000đ không được bao gồm. | Must | Chưa thực hiện |
| **TC-SF-11** | Chỉ hiện món còn hàng | Kiểm tra lọc tình trạng còn hàng | Có ít nhất một món còn hàng và một món hết hàng | Bật **Chỉ hiện món còn hàng** | 1. Bật checkbox **Chỉ hiện món còn hàng**. | URL có `available=true`; tất cả món hiển thị còn hàng và món **Cà phê sữa** bị loại khỏi kết quả. | Must | Chưa thực hiện |
| **TC-SF-12** | Kết hợp nhiều bộ lọc | Đảm bảo các điều kiện lọc được áp dụng đồng thời | Dữ liệu mẫu đầy đủ | Từ khoá `pho`, danh mục `bun-pho`, quầy `pho-co-ba`, giá `30.001–50.000đ`, còn hàng | 1. Áp dụng đồng thời các bộ lọc đã nêu. | Chỉ hiển thị món khớp tất cả điều kiện (với dữ liệu mẫu: **Phở bò tái**); URL giữ các bộ lọc và trang là 1. | Must | Chưa thực hiện |
| **TC-SF-13** | Sắp xếp kết quả theo giá tăng dần | Kiểm tra tuỳ chọn sắp xếp | Có nhiều món với giá khác nhau | `Giá thấp → cao` | 1. Chọn **Giá thấp → cao** trong danh sách sắp xếp. | Danh sách được sắp theo giá tăng dần; URL có `sort=price_asc`; các bộ lọc đang dùng vẫn được giữ nguyên. | Should | Chưa thực hiện |
| **TC-SF-14** | Đổi bộ lọc khi đang ở trang sau | Kiểm tra đặt lại phân trang sau khi lọc | Có ít nhất 13 món phù hợp; đang ở trang 2 | Chọn một danh mục khác | 1. Chuyển tới trang 2. 2. Chọn danh mục khác. | Kết quả lọc mới bắt đầu ở trang 1; tham số `page` bị xoá khỏi URL. | Should | Chưa thực hiện |
| **TC-SF-15** | Khôi phục bộ lọc từ URL và thao tác Back | Kiểm tra chia sẻ liên kết và lịch sử trình duyệt | Có thể mở URL trực tiếp | `/mon-an?q=pho&category=bun-pho&price=30-50&available=true&sort=price_asc&page=2` | 1. Mở URL trên. 2. Xác nhận trạng thái các bộ lọc. 3. Thay đổi danh mục rồi bấm Back trên trình duyệt. | Bộ lọc ban đầu được khôi phục theo URL; ô tìm kiếm và các điều khiển hiển thị đúng trạng thái tương ứng. | Should | Chưa thực hiện |
| **TC-SF-16** | Xoá toàn bộ bộ lọc đang áp dụng | Kiểm tra làm sạch trạng thái lọc | Có ít nhất hai bộ lọc đang được áp dụng | Bấm **Xoá tất cả bộ lọc** | 1. Áp dụng từ hai bộ lọc trở lên. 2. Bấm **Xoá tất cả bộ lọc** trong bảng lọc. | URL không còn tham số lọc; ô tìm kiếm, danh mục, quầy, khoảng giá và checkbox trở về mặc định; danh sách được tải lại. | Must | Chưa thực hiện |
| **TC-SF-17** | Tìm quầy theo tên, mô tả hoặc vị trí | Kiểm tra tìm kiếm quầy ăn | Có ít nhất hai quầy với tên, mô tả và vị trí khác nhau | Một từ khoá lần lượt khớp tên, mô tả và vị trí | 1. Mở `/quay-an`. 2. Nhập từ khoá khớp tên, đợi debounce. 3. Lặp lại với từ khoá khớp mô tả và vị trí. | Mỗi lần tìm chỉ trả các quầy khớp tên, mô tả hoặc vị trí; quầy không hoạt động không xuất hiện. | Should | Chưa thực hiện |
| **TC-SF-18** | Tìm quầy không có kết quả | Kiểm tra trạng thái rỗng của danh sách quầy | Đang ở `/quay-an` | `quaykhongton tai123` | 1. Nhập từ khoá không khớp quầy nào. 2. Chờ ít nhất 400 ms sau lần gõ cuối. | Hiển thị trạng thái **Không tìm thấy quầy nào**; không hiển thị thẻ quầy cũ như kết quả hiện tại. | Should | Chưa thực hiện |