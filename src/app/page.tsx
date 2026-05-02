'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PoemCard } from '@/components/PoemCard';
import { SearchBar } from '@/components/SearchBar';
import { AuthorFilter } from '@/components/AuthorFilter';

interface Poem {
  id: string;
  author_name: string;
  title: string;
  subtitle: string;
  content: string;
  dynasty: string;
  poetry_type: string;
  source: string;
  tags: string[];
  notes: string;
  category?: string;
  category_score?: number;
}

interface Author {
  name: string;
  poem_count: number;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedAuthor = searchParams.get('author')?.trim() || null;

  const [poems, setPoems] = useState<Poem[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [categoryStats, setCategoryStats] = useState<{ category: string; count: number }[]>([]);

  useEffect(() => {
    fetchAuthors();
    fetchCategoryStats();
  }, []);

  useEffect(() => {
    fetchPoems();
  }, [selectedAuthor]);

  const fetchAuthors = async () => {
    try {
      const res = await fetch('/api/authors');
      const data = await res.json();
      setAuthors(data.authors || []);
    } catch (error) {
      console.error('Failed to fetch authors:', error);
    }
  };

  const fetchPoems = async () => {
    setLoading(true);
    try {
      const url = selectedAuthor
        ? `/api/poems?author=${encodeURIComponent(selectedAuthor)}`
        : '/api/poems?limit=100';
      const res = await fetch(url);
      const data = await res.json();
      setPoems(data.poems || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch poems:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryStats = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategoryStats(data.stats || []);
    } catch (error) {
      console.error('Failed to fetch category stats:', error);
    }
  };

  const handleAuthorSelect = (author: string | null) => {
    if (author) {
      router.replace(`/?author=${encodeURIComponent(author)}`, { scroll: false });
    } else {
      router.replace('/', { scroll: false });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">爱国诗词集</h1>
            <div className="w-full flex-shrink-0 sm:w-auto sm:max-w-md">
              <SearchBar />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8">
        <div className="flex flex-col gap-4 sm:gap-8 lg:flex-row">
          <aside className="hidden flex-shrink-0 lg:block lg:w-64">
            <div className="space-y-4 lg:sticky lg:top-24">
              <AuthorFilter
                authors={authors}
                selectedAuthor={selectedAuthor}
                onSelect={handleAuthorSelect}
              />

              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-2 font-bold text-gray-700">数据统计</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    诗词总数: <span className="font-semibold">{total}</span>
                  </p>
                  <p>
                    作者人数: <span className="font-semibold">{authors.length}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-bold text-gray-700">分类快速查看</h3>
                <div className="space-y-1">
                  {categoryStats.slice(0, 6).map((stat) => (
                    <a
                      key={stat.category}
                      href={`/categories?cat=${encodeURIComponent(stat.category)}`}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-blue-50"
                    >
                      <span className="truncate text-gray-700">{stat.category}</span>
                      <span className="ml-2 text-xs text-gray-400">{stat.count}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href="/search"
                  className="block rounded-md bg-gray-100 px-4 py-2 text-center transition-colors hover:bg-gray-200"
                >
                  全局搜索
                </a>
                <a
                  href="/tags"
                  className="block rounded-md bg-gray-100 px-4 py-2 text-center transition-colors hover:bg-gray-200"
                >
                  标签管理
                </a>
                <a
                  href="/categories"
                  className="block rounded-md bg-blue-500 px-4 py-2 text-center text-white transition-colors hover:bg-blue-600"
                >
                  数据可视化
                </a>
              </div>
            </div>
          </aside>

          <div className="-mx-4 overflow-x-auto px-4 lg:hidden">
            <div className="flex gap-2 pb-2">
              {categoryStats.slice(0, 8).map((stat) => (
                <a
                  key={stat.category}
                  href={`/categories?cat=${encodeURIComponent(stat.category)}`}
                  className="flex-shrink-0 rounded-full border bg-white px-3 py-1.5 text-sm"
                >
                  {stat.category} ({stat.count})
                </a>
              ))}
              <a
                href="/categories"
                className="flex-shrink-0 rounded-full border bg-blue-500 px-3 py-1.5 text-sm text-white"
              >
                更多...
              </a>
            </div>
          </div>

          <section className="flex-1">
            {selectedAuthor ? (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">筛选结果：</span>
                <span className="text-sm font-semibold text-blue-600">{selectedAuthor}</span>
                <button
                  type="button"
                  onClick={() => handleAuthorSelect(null)}
                  className="rounded border px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  清除筛选
                </button>
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center justify-center py-16 sm:py-20">
                <div className="text-gray-500">加载中...</div>
              </div>
            ) : poems.length === 0 ? (
              <div className="py-16 text-center sm:py-20">
                <p className="text-gray-500">暂无诗词数据</p>
                <p className="mt-2 text-sm text-gray-400">请先导入诗词数据</p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-500">显示 {poems.length} 首诗词</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  {poems.map((poem) => (
                    <a key={poem.id} href={`/poems/${poem.id}`}>
                      <PoemCard poem={poem} />
                    </a>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-gray-500">加载中...</div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
