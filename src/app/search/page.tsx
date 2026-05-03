'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const initialQuery = searchParams.get('q') || '';
  const [results, setResults] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
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
            <div className="py-20 text-center">
              <p className="text-gray-500">未找到匹配的诗词</p>
              <p className="mt-2 text-sm text-gray-400">尝试其他关键词</p>
            </div>
          )}
        </>
      ) : (
        <div className="py-20 text-center">
          <p className="text-gray-500">输入关键词开始搜索</p>
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-gray-500">加载中...</div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}