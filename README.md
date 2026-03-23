# EduMS Frontend (Base Setup)

Project nền tảng frontend bằng Next.js (App Router + TypeScript) cho hệ thống
EduMS.

## 1) Cài đặt

```bash
npm install
```

## 2) Cấu hình môi trường

```bash
cp .env.example .env.local
```

Mặc định:

- `NEXT_PUBLIC_APP_NAME=EduMS Frontend`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`

## 3) Chạy frontend

```bash
npm run dev
```

Mở `http://localhost:3000`.

## API snapshot đã lưu

- OpenAPI đầy đủ: `docs/api/edums-openapi.json`
- Danh sách endpoint: `docs/api/endpoints.tsv`
- Tổng quan theo tag: `docs/api/README.md`

## Cấu trúc setup ban đầu

- `src/config/env.ts`: đọc biến môi trường frontend.
- `src/lib/api/client.ts`: hàm gọi API cơ bản (fetch wrapper).
- `src/lib/api/types.ts`: type cho API response.
- `src/lib/api/catalog.ts`: catalog tag endpoint (snapshot).
