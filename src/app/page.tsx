import { env } from "@/config/env";
import { apiDomains, totalApiEndpoints } from "@/lib/api/catalog";

export default function Home() {
  const visibleDomains = apiDomains.slice(0, 10);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-8">
      <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-blue-600">
          EDU MANAGEMENT SYSTEM
        </p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">
          {env.appName}: setup xong với Next.js
        </h1>
        <p className="mt-3 text-zinc-600">
          Mục tiêu hiện tại: dựng nền tảng frontend và lưu snapshot API để sẵn
          sàng làm tính năng ở bước tiếp theo.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Trạng thái frontend</p>
          <p className="mt-2 text-lg font-semibold text-emerald-600">Running</p>
        </article>
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Backend base URL</p>
          <p className="mt-2 break-all font-mono text-sm text-zinc-900">
            {env.apiBaseUrl}
          </p>
        </article>
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">OpenAPI snapshot</p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            {totalApiEndpoints} endpoints / {apiDomains.length} domain tags
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-900">
          API domains (top 10)
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Snapshot được lưu tại{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">
            docs/api/edums-openapi.json
          </code>{" "}
          và danh sách endpoint đầy đủ tại{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">
            docs/api/endpoints.tsv
          </code>
          .
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {visibleDomains.map((domain) => (
            <div
              key={domain.tag}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2"
            >
              <span className="text-sm text-zinc-700">{domain.tag}</span>
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-900">
                {domain.count}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
