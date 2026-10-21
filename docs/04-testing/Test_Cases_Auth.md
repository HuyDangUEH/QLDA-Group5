

| Mã TC | Tên kịch bản kiểm thử | Dữ liệu đầu vào (Test Data) | Kết quả kỳ vọng (Expected Result) |
| :---- | :---- | :---- | :---- |
| **TC-AUTH-01** | Đăng ký thành công với email UEH | email: "bao.31@st.ueh.edu.vn", pass: "Pass@123" | Hệ thống tạo tài khoản, trả mã HTTP 201 Created. |
| **TC-AUTH-02** | Chặn đăng ký với email ngoài (gmail) | email: "user@gmail.com", pass: "Pass@123" | Báo lỗi "Email phải có đuôi @st.ueh.edu.vn" (HTTP 400). |
| **TC-AUTH-03** | Chặn đăng ký khi trùng email | email đã tồn tại trong CSDL | Báo lỗi "Email đã được sử dụng" (HTTP 409). |
| **TC-AUTH-04** | Đăng nhập thành công (Sinh viên) | Nhập đúng email và pass | Lưu cookie JWT httpOnly, chuyển hướng về Trang chủ. |
| **TC-AUTH-05** | Chặn đăng nhập sai mật khẩu | Nhập đúng email, sai pass | Báo lỗi "Thông tin không chính xác" (HTTP 401). |
| **TC-AUTH-06** | Rate Limit (Chống Brute-force) | Nhập sai pass liên tục 10 lần | Chặn request tiếp theo, báo lỗi tạm khóa (HTTP 429). |
| **TC-AUTH-07** | Đăng nhập Chủ quầy (Vendor) | Tài khoản có Role \= VENDOR | Đăng nhập thành công, điều hướng vào Dashboard Bếp. |
| **TC-AUTH-08** | Chặn Sinh viên vào trang Admin | Tài khoản Role \= STUDENT vào /admin | Bị ProtectedRoute chặn, báo lỗi HTTP 403 Forbidden. |
| **TC-AUTH-09** | Đổi mật khẩu thu hồi phiên cũ | Đổi mật khẩu trên tab 1, F5 tab 2 | Tab 2 bị đăng xuất lập tức (tokenVersion thay đổi). |
| **TC-AUTH-10** | Đăng xuất an toàn | Bấm nút "Đăng xuất" | Xóa sạch cookie JWT phiên, chuyển về trang Đăng nhập. |

