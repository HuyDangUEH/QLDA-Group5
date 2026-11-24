# Thiết kế

Lưu tài liệu kiến trúc hệ thống, sơ đồ (use case, ERD, luồng xử lý) và thiết kế giao diện.
Ảnh sơ đồ đặt trong `03-design/images/` và chèn vào file .md bằng `![mô tả](images/ten-anh.png)`.

## Thiết kế đã thực hiện (v1.0.0)

| Nội dung | Ở đâu |
|---|---|
| Sơ đồ kiến trúc (trình duyệt → API → MySQL) | [README mã nguồn, mục "Công nghệ & kiến trúc"](../../src/quickbite/README.md) |
| Sơ đồ ER cơ sở dữ liệu (Mermaid) | [database.md](../../src/quickbite/docs/database.md) |
| Máy trạng thái đơn hàng, luồng thanh toán | [business-rules.md](../../src/quickbite/docs/business-rules.md) · [payments.md](../../src/quickbite/docs/payments.md) |
| Thiết kế API (OpenAPI 3.1) | [api.md](../../src/quickbite/docs/api.md) · [openapi.json](../../src/quickbite/docs/openapi.json) |
| Kiến trúc triển khai (Vercel + Aiven) | [deployment.md](../../src/quickbite/docs/deployment.md) · [release-v1.0.md](../../src/quickbite/docs/release-v1.0.md) |
