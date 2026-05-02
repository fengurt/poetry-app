'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CategoryStat {
  category: string;
  count: number;
}

interface Author {
  name: string;
  poem_count: number;
}

export default function CategoriesPage() {
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [totalPoems, setTotalPoems] = useState(0);
  const [categoryByAuthor, setCategoryByAuthor] = useState<Record<string, Record<string, number>>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setStats(data.stats || []);
      setAuthors(data.authors || []);
      setTotalPoems(data.totalPoems || 0);
      setCategoryByAuthor(data.categoryByAuthor || {});
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate percentages
  const statsWithPercent = stats.map(s => ({
    ...s,
    percent: totalPoems > 0 ? (s.count / totalPoems * 100).toFixed(1) : '0'
  }));

  // Category colors
  const categoryColors: Record<string, { bg: string; text: string; light: string }> = {
    '不忘初心': { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' },
    '咏物寄情': { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' },
    '情系河山': { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' },
    '老龄心声': { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50' },
    '感事抒怀': { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' },
    '诗社撷英': { bg: 'bg-pink-500', text: 'text-pink-600', light: 'bg-pink-50' },
    '曲赋雅韵': { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50' },
    '时代风云': { bg: 'bg-cyan-500', text: 'text-cyan-600', light: 'bg-cyan-50' },
    '刺玫瑰': { bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50' },
    '七彩人生': { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-50' },
    '诗词文苑': { bg: 'bg-violet-500', text: 'text-violet-600', light: 'bg-violet-50' },
    '心香一瓣': { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-50' }
  };

  // Find max count for bar scaling
  const maxCount = Math.max(...stats.map(s => s.count), 1);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← 返回首页
          </Link>
          <h1 className="text-xl font-bold text-gray-800">数据可视化</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Overview Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border text-center">
            <div className="text-3xl font-bold text-blue-600">{totalPoems}</div>
            <div className="text-gray-500 text-sm mt-1">诗词总数</div>
          </div>
          <div className="bg-white p-6 rounded-lg border text-center">
            <div className="text-3xl font-bold text-green-600">{authors.length}</div>
            <div className="text-gray-500 text-sm mt-1">作者人数</div>
          </div>
          <div className="bg-white p-6 rounded-lg border text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.length}</div>
            <div className="text-gray-500 text-sm mt-1">已分类数</div>
          </div>
          <div className="bg-white p-6 rounded-lg border text-center">
            <div className="text-3xl font-bold text-orange-600">
              {totalPoems - stats.reduce((a, b) => a + b.count, 0)}
            </div>
            <div className="text-gray-500 text-sm mt-1">未分类</div>
          </div>
        </section>

        {/* Category Distribution */}
        <section className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-bold text-gray-800 mb-6">诗词分类分布</h2>

          {/* Horizontal Bar Chart */}
          <div className="space-y-4">
            {statsWithPercent.map((stat) => {
              const colors = categoryColors[stat.category] || { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-50' };
              const barWidth = (stat.count / maxCount * 100).toFixed(0);

              return (
                <div key={stat.category} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-700 truncate">{stat.category}</div>
                  <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors.bg} rounded-full flex items-center justify-end pr-3 transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                    >
                      <span className="text-white text-xs font-semibold">{stat.count}</span>
                    </div>
                  </div>
                  <div className="w-16 text-sm text-gray-500 text-right">{stat.percent}%</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Category List with Details */}
        <section className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-bold text-gray-800 mb-6">分类详情</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat) => {
              const colors = categoryColors[stat.category] || { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-50' };

              return (
                <Link
                  key={stat.category}
                  href={`/search?q=${encodeURIComponent(stat.category)}`}
                  className={`p-4 rounded-lg border ${colors.light} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${colors.text}`}>{stat.category}</span>
                    <span className={`text-2xl font-bold ${colors.text}`}>{stat.count}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    占总数 {((stat.count / totalPoems) * 100).toFixed(1)}%
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Author-Category Matrix */}
        <section className="bg-white p-6 rounded-lg border overflow-x-auto">
          <h2 className="text-lg font-bold text-gray-800 mb-6">作者-分类矩阵</h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-semibold text-gray-700">作者</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-700">作品数</th>
                {categories.slice(0, 6).map(cat => (
                  <th key={cat} className="text-right py-2 px-3 font-semibold text-gray-700">{cat}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {authors.slice(0, 15).map((author) => (
                <tr key={author.name} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <Link href={`/?author=${encodeURIComponent(author.name)}`} className="text-blue-600 hover:underline">
                      {author.name}
                    </Link>
                  </td>
                  <td className="text-right py-2 px-3 font-semibold">{author.poem_count}</td>
                  {categories.slice(0, 6).map(cat => {
                    const count = categoryByAuthor[author.name]?.[cat] || 0;
                    return (
                      <td key={cat} className="text-right py-2 px-3">
                        {count > 0 ? (
                          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {count}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {authors.length > 15 && (
            <div className="mt-4 text-center text-gray-500 text-sm">
              显示前15位作者， 共 {authors.length} 位作者
            </div>
          )}
        </section>

        {/* Export Section */}
        <section className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-bold text-gray-800 mb-4">导出数据</h2>
          <div className="flex flex-wrap gap-4">
            <a
              href="/api/export?type=word&format=all"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              导出全部为 Word
            </a>
            <a
              href="/api/export?type=excel&format=all"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              导出全部为 Excel（.xlsx）
            </a>
            <a
              href="/api/export?type=word&format=categories"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              按分类导出 Word
            </a>
            <a
              href="/api/export?type=excel&format=categories"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              按分类导出 Excel（.xlsx）
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}