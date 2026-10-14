# Quy ước Commit

## Cấu trúc commit message

```
<loại>: <mô tả ngắn gọn>
```

| Loại | Dùng khi |
|---|---|
| `docs` | Thêm/sửa tài liệu |
| `feat` | Thêm chức năng mới |
| `fix` | Sửa lỗi |
| `refactor` | Cải tiến code, không đổi chức năng |
| `test` | Thêm/sửa test |
| `chore` | Cấu hình, việc lặt vặt khác |

**Ví dụ hợp lệ:**
```
docs: thêm biên bản retrospective tuần 1
feat: thêm chức năng đăng nhập
fix: sửa lỗi hiển thị danh sách sản phẩm
```

**Ví dụ không hợp lệ:** `update`, `abc`, `sửa file`, `.`

## Commit hợp lệ là gì?

1. Commit bằng **tài khoản Git của chính mình**. Kiểm tra:
   ```bash
   git config user.name
   git config user.email   # phải trùng email tài khoản GitHub
   ```
2. Message đúng quy ước ở trên.
3. Có nội dung thay đổi thật, liên quan đến task được giao.

## Quy trình làm việc

```bash
git pull origin main
git checkout -b docs/ten-tai-lieu
# ... chỉnh sửa file ...
git add .
git commit -m "docs: mô tả thay đổi"
git push origin docs/ten-tai-lieu
# Tạo Pull Request trên GitHub để merge vào main
```
