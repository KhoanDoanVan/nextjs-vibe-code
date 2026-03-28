# Student UI Integration Readiness (EduMS API-4)

## 1) Phạm vi rà soát

- Snapshot backend: `/Users/doanvankhoan/Desktop/frontend-datn/docs/api/edums-openapi.json`
- Code đối chiếu:
  - `/Users/doanvankhoan/Desktop/frontend-datn/src/lib/student/service.ts`
  - `/Users/doanvankhoan/Desktop/frontend-datn/src/lib/student/tabs.ts`
  - `/Users/doanvankhoan/Desktop/frontend-datn/src/app/dashboard/page.tsx`

## 2) Kết quả tổng hợp

- Tập API phù hợp cho dashboard role student: `13`
- Đã có flow UI dùng: `13`
- Còn thiếu flow UI: `0`

## 3) API đã dùng trong student dashboard

1. `GET /api/v1/profile/me`
2. `PUT /api/v1/profile/me`
3. `PUT /api/v1/profile/password`
4. `GET /api/v1/course-sections`
5. `GET /api/v1/course-sections/{id}`
6. `GET /api/v1/course-sections/course/{courseId}`
7. `GET /api/v1/course-sections/semester/{semesterId}`
8. `GET /api/v1/recurring-schedules/section/{sectionId}`
9. `GET /api/v1/recurring-schedules/{id}/sessions`
10. `POST /api/v1/course-registrations`
11. `GET /api/v1/students/{studentId}/grade-reports`
12. `GET /api/v1/courses/{courseId}/grade-components`
13. `GET /api/v1/students/{studentId}/attendances`

## 4) API còn thiếu, có thể tích hợp thêm cho student dashboard

- Không còn thiếu API cốt lõi cho student dashboard trong phạm vi đã rà.
- Các endpoint còn lại trong OpenAPI chủ yếu phục vụ `ADMIN`/`LECTURER` hoặc nghiệp vụ quản trị (students CRUD, course-sections CRUD, grade-reports theo section cho giảng viên...).

## 5) Ghi chú quyền truy cập

- Trạng thái trên được xác nhận ở mức tích hợp UI + build pass.
- Vẫn cần smoke test bằng token role `STUDENT` trên môi trường backend thật để xác nhận RBAC cuối cùng.
