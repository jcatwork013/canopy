import { useQuery } from '@tanstack/react-query';
import { BookOpen } from '@/components/icons';
import { api } from '@/lib/api';

export function GuidesScreen() {
  const q = useQuery({
    queryKey: ['system', 'guides'],
    queryFn: () => api.system.guides(),
    staleTime: 30 * 60_000,
  });
  const articles = q.data?.articles ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-center gap-3">
        <span className="icon-tile flex h-12 w-12 items-center justify-center rounded-2xl">
          <BookOpen className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Cẩm nang cây</h1>
          <p className="text-sm text-content-secondary">
            Bài viết & kỹ năng trồng cây hay, tổng hợp từ các trang uy tín.
          </p>
        </div>
      </header>

      {q.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse overflow-hidden">
              <div className="aspect-[16/10] w-full bg-subtle" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-subtle" />
                <div className="h-3 w-full rounded bg-subtle" />
              </div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="card p-10 text-center text-sm text-content-tertiary">
          Chưa tải được bài viết. Vui lòng thử lại sau.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <a
              key={a.link}
              href={a.link}
              target="_blank"
              rel="noreferrer"
              className="card lift flex flex-col overflow-hidden"
            >
              {a.image ? (
                <div className="aspect-[16/10] w-full overflow-hidden bg-subtle">
                  <img src={a.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex aspect-[16/10] w-full items-center justify-center bg-brand-50 text-brand-300">
                  <BookOpen className="h-10 w-10" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <span className="text-xs font-semibold text-brand-600">{a.source}</span>
                <h3 className="mt-1 line-clamp-2 font-semibold leading-snug">{a.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-content-secondary">{a.summary}</p>
                <span className="mt-3 text-sm font-medium text-brand-700">Đọc bài →</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
