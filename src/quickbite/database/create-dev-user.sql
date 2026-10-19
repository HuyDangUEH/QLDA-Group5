-- (Tuỳ chọn) Tạo user MySQL riêng cho QuickBite thay vì dùng root.
-- 1. Đổi 'doi_mat_khau_nay' thành mật khẩu bạn muốn.
-- 2. Chạy:  mysql -u root -p < database/create-dev-user.sql
-- 3. Sửa backend/.env:
--    DATABASE_URL="mysql://quickbite:<mật_khẩu>@localhost:3306/quickbite"

CREATE DATABASE IF NOT EXISTS quickbite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS quickbite_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'quickbite'@'localhost' IDENTIFIED BY 'doi_mat_khau_nay';

-- Prisma Migrate cần quyền tạo/xoá "shadow database" tạm thời khi chạy `migrate dev`,
-- nên user phát triển được cấp quyền trên toàn server. KHÔNG làm vậy trên production.
GRANT ALL PRIVILEGES ON *.* TO 'quickbite'@'localhost';
FLUSH PRIVILEGES;
