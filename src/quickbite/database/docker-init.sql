-- Chạy tự động lần đầu container MySQL khởi tạo (docker compose).
-- Cấp quyền cho user "quickbite" tạo database test và shadow database của Prisma Migrate.
CREATE DATABASE IF NOT EXISTS quickbite_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON *.* TO 'quickbite'@'%';
FLUSH PRIVILEGES;
