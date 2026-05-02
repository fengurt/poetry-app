'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PoemCard } from '@/components/PoemCard';

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
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/poems?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data.poems || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      void performSearch(initialQuery);
    } else {
      setResults([]);
    }
  }, [initialQuery, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      router.replace('/search');
      return;
    }
    router.replace(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              ← 返回首页
            </Link>
            <form onSubmit={handleSubmit} className="flex-1 max-w-2xl">
              <div className="relative flex items-center">
                <input
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="标题、正文、作者、分类、朝代、体裁..."
                  className="min-h-11 w-full rounded-lg border border-gray-300 py-2 pl-4 pr-[5.25rem] text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 min-h-9 -translate-y-1/2 rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
                >
                  搜索
                </button>
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Results */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {initialQuery ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-700">
                搜索结果: &quot;{initialQuery}&quot;
              </h2>
              <p className="text-gray-500 mt-1">
                {loading ? '搜索中…' : `找到 ${results.length} 首诗词`}
              </p>
            </div>

            {loading ? (
              <div className="py-16 text-center text-gray-500">正在检索…</div>
            ) : results.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.map((poem) => (
                  <Link key={poem.id} href={`/poems/${poem.id}`}>
                    <PoemCard poem={poem} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500">未找到匹配的诗词</p>
                <p className="text-sm text-gray-400 mt-2">尝试其他关键词</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500">输入关键词开始搜索</p>
          </div>
        )}
      </main>
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">加载中...</div></div>}>
        <SearchContent />
      </Suspense>
    </div>
  );
}