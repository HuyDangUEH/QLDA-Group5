# 📚 Tài liệu dự án

Thư mục này chứa toàn bộ tài liệu của dự án, tổ chức theo quy trình Scrum.
Mọi tài liệu viết bằng **Markdown (.md)** và được quản lý phiên bản bằng Git.

## Cấu trúc thư mục

| Thư mục | Nội dung |
|---|---|
| `00-overview/` | Thông tin chung: mục tiêu dự án, thành viên & vai trò, Definition of Done, quy ước commit |
| `01-product-backlog/` | Product Backlog, User Story, tiêu chí chấp nhận |
| `02-sprints/week-XX/` | Tài liệu từng tuần/Sprint: Planning, Daily Scrum, Review, Retrospective |
| `03-design/` | Kiến trúc hệ thống, sơ đồ, thiết kế UI/UX |
| `04-testing/` | Test case, báo cáo lỗi |

## Tài liệu kỹ thuật (mã nguồn)

Tài liệu kỹ thuật của ứng dụng nằm cùng mã nguồn trong [`src/quickbite/docs/`](../src/quickbite/docs/):

| Tài liệu | Nội dung |
|---|---|
| [README mã nguồn](../src/quickbite/README.md) | Cài đặt, biến môi trường, các lệnh, kiểm thử, cấu trúc mã nguồn |
| [api.md](../src/quickbite/docs/api.md) · [openapi.json](../src/quickbite/docs/openapi.json) | Tài liệu API, Swagger / OpenAPI 3.1 |
| [database.md](../src/quickbite/docs/database.md) | Sơ đồ ER, thiết kế cơ sở dữ liệu |
| [business-rules.md](../src/quickbite/docs/business-rules.md) | Quy tắc nghiệp vụ: trạng thái đơn, thanh toán, huỷ / hoàn tiền |
| [payments.md](../src/quickbite/docs/payments.md) | Thanh toán VietQR, webhook SePay |
| [security.md](../src/quickbite/docs/security.md) | Bảo mật |
| [deployment.md](../src/quickbite/docs/deployment.md) | Triển khai production, sao lưu & khôi phục |
| [release-v1.0.md](../src/quickbite/docs/release-v1.0.md) | Bản phát hành v1.0.0 |
| [cong-nghe.md](../src/quickbite/docs/cong-nghe.md) | Công nghệ & phiên bản |

## Quy ước

- Tên file và thư mục: chữ thường, không dấu, nối bằng gạch ngang (`sprint-planning.md`).
- Thư mục tuần đánh số 2 chữ số: `week-01`, `week-02`, …
- Tuần mới: sao chép thư mục tuần trước, đổi tên và xóa nội dung cũ.
- Commit message theo [quy ước commit](00-overview/commit-convention.md).

## Phân công tài liệu tuần 1

| Thành viên | File phụ trách | Trạng thái |
|---|---|---|
| Đặng Xuân Huy | `README.md`, cấu trúc thư mục, `sprint-planning.md` | ✅ |
| Thành viên 2 | `project-charter.md`, `definition-of-done.md` | ⬜ |
| Thành viên 3 | `product-backlog.md` | ⬜ |
| Thành viên 4 | `daily-scrum.md`, `sprint-review.md` | ⬜ |
| Thành viên 5 | `retrospective.md` | ⬜ |

> Mỗi thành viên tự bổ sung thông tin của mình vào `00-overview/team-roles.md`
> và commit bằng tài khoản Git của chính mình.
