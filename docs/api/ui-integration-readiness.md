# UI Integration Readiness (EduMS API-4)

Tài liệu này tổng hợp sau khi đọc file:
`/Users/doanvankhoan/Downloads/EduMS API-4.json`.

## 0) Cập nhật mới nhất (2026-03-29)

### 0.1 Phạm vi rà soát admin

- Snapshot dùng để đối chiếu: `/Users/doanvankhoan/Desktop/frontend-datn/docs/api/edums-openapi.json`.
- Nhóm tag admin đã đối chiếu:
  - `Account`, `Role and permission`, `Faculty`, `Major`, `Specialization`,
    `Cohort`, `Course`, `Grade Component`, `Classroom`, `Administrative Class`,
    `Student Management`, `Lecturer Management`, `Guardian Management`,
    `Course Section`, `Recurring Schedule`, `Grade Report`, `Attendance`,
    `admin-admission-config-controller`, `admin-application-controller`.
- Tổng operation admin trong OpenAPI: `118`.

### 0.2 Trạng thái tích hợp hiện tại

- Dashboard admin hiện đã map phần lớn API nghiệp vụ chính:
  - CRUD + status patch cho các module quản trị lõi.
  - Admissions config + applications (list, review, bulk-review, auto-screen, onboard).
  - Grade management + attendance management.
  - Dropdown phụ thuộc dữ liệu (ví dụ specialization theo major).
- Kết quả đối chiếu hiện tại: `118/118` operation admin đã có đường gọi từ UI/service.
- Đã bổ sung thêm các API admin từng thiếu:
  - `GET /api/v1/admin/admissions/config/periods/{id}` (tra cứu chi tiết kỳ tuyển sinh)
  - `GET /api/v1/majors/faculty/{facultyId}` (lọc ngành theo khoa)
  - `GET /api/v1/recurring-schedules/{id}` (tra cứu chi tiết lịch lặp theo ID)
  - `GET /api/v1/guardians/{guardianId}/students/{studentId}/attendances` (tra cứu điểm danh theo phụ huynh-sinh viên)
- Đã bổ sung thêm cụm API ngoài admin:
  - `GET /api/v1/public/admissions/active-periods`
  - `GET /api/v1/public/admissions/lookup`
  - `GET /api/v1/public/admissions/periods/{periodId}/majors`
  - `GET /api/v1/public/admissions/periods/{periodId}/majors/{majorId}/blocks`
  - `POST /api/v1/public/admissions/apply`
  - `GET /api/v1/schedules/lecturers/me`
  - Route mới: `/admissions`, `/lecturer/dashboard`

### 0.3 Mức ưu tiên đề xuất

- Cụm API thiếu ở lần rà soát trước đã được triển khai vào UI admin và các module bổ sung.
- Khuyến nghị tiếp theo: tiếp tục tối ưu UX (autocomplete/select có tìm kiếm) cho các trường ID để giảm nhập tay.

## 1) Kết quả kiểm tra snapshot

- File API-4 **trùng hoàn toàn** với snapshot hiện có:
  - `/Users/doanvankhoan/Downloads/EduMS API-4.json`
  - `/Users/doanvankhoan/Desktop/frontend-datn/docs/api/edums-openapi.json`
- `sha1`: `b67952d66144e123b81beb27abe11554c4b5b05c` (cả 2 file)
- OpenAPI: `3.1.0`
- API version: `v1.0.0`
- Tổng path: `76`
- Tổng operation: `129`
- Tổng schema: `120`

## 2) Nhóm API đã được UI tích hợp

UI hiện tại đã có service + màn hình cho các nhóm chính:

- Auth + profile:
  - `POST /api/v1/auth/login`
  - `GET|PUT /api/v1/profile/me`
  - `PUT /api/v1/profile/password`
- Student dashboard:
  - `GET /api/v1/course-sections`
  - `POST /api/v1/course-registrations`
  - `GET /api/v1/students/{studentId}/grade-reports`
  - `GET /api/v1/students/{studentId}/attendances`
- Admin CRUD core:
  - accounts, roles, faculties, majors, specializations, cohorts, courses,
    classrooms, administrative-classes, students, lecturers, guardians,
    course-sections, recurring-schedules
- Admin admissions (mức list/read):
  - periods, blocks, benchmarks, applications

## 3) Lịch sử backlog tích hợp API

- Mục này lưu lại backlog theo từng giai đoạn; nhiều endpoint trong danh sách đã được triển khai ở các bản cập nhật mới hơn phía trên.

### P1 - Có giá trị nghiệp vụ cao

- Admissions hành động:
  - `PATCH /api/v1/admin/admissions/applications/{id}/review`
  - `POST /api/v1/admin/admissions/applications/bulk-review`
  - `POST /api/v1/admin/admissions/applications/auto-screen/{periodId}`
  - `POST /api/v1/admin/admissions/applications/onboard`
- Admissions config nâng cao:
  - `GET /api/v1/admin/admissions/config/form-options`
  - `POST /api/v1/admin/admissions/config/benchmarks/bulk`
  - CRUD chi tiết theo `{id}` cho periods/blocks/benchmarks

### P2 - Vận hành đào tạo

- Attendance theo lớp học:
  - `GET /api/v1/class-sessions/{sessionId}/attendances`
  - `POST /api/v1/class-sessions/{sessionId}/attendances/batch`
  - `PUT|DELETE /api/v1/attendances/{id}`
- Schedule:
  - `GET /api/v1/recurring-schedules/{id}/sessions`
  - `GET /api/v1/schedules/lecturers/me`
- Hỗ trợ filter theo ngữ cảnh:
  - `GET /api/v1/course-sections/course/{courseId}`
  - `GET /api/v1/course-sections/semester/{semesterId}`
  - `GET /api/v1/courses/faculty/{facultyId}`
  - `GET /api/v1/majors/faculty/{facultyId}`
  - `GET /api/v1/specializations/major/{majorId}`
  - `GET /api/v1/courses/{courseId}/grade-components`

### P3 - Public flow (có thể làm thành module riêng)

- `GET /api/v1/public/admissions/active-periods`
- `GET /api/v1/public/admissions/lookup`
- `GET /api/v1/public/admissions/periods/{periodId}/majors`
- `GET /api/v1/public/admissions/periods/{periodId}/majors/{majorId}/blocks`
- `POST /api/v1/public/admissions/apply`

## 4) Lưu ý kỹ thuật quan trọng khi tích hợp

- `POST /api/v1/course-registrations` trả về `201` (không phải `200`).
- Một số endpoint GET dùng query object trong OpenAPI:
  - `/api/v1/accounts` với `searchRequest`
  - `/api/v1/admin/admissions/applications` với `filter`
  - `/api/v1/admin/admissions/config/benchmarks` với `filter`
  - `/api/v1/admin/admissions/config/periods` với `filter`
- Enum trạng thái cần map chuẩn ở UI:
  - Account: `ACTIVE|INACTIVE|LOCKED`
  - Course section: `DRAFT|OPEN|ONGOING|FINISHED|CANCELLED`
  - Grade report: `DRAFT|PUBLISHED|LOCKED`
  - Attendance: `PRESENT|ABSENT|LATE|EXCUSED`
  - Admission application: `PENDING|APPROVED|ENROLLED|REJECTED`

## 5) Đề xuất cách triển khai UI tiếp theo

1. Hoàn thiện module `Admissions Admin` (review single/bulk, auto-screen, onboard).
2. Bổ sung module `Attendance by Session` cho giảng viên/admin.
3. Bổ sung module `Public Admissions` tách route public riêng.
4. Chuẩn hóa filter builder dùng chung cho các endpoint có query object.
5. Chuẩn hóa status badge/action theo enum trung tâm để giảm lệch UI.
