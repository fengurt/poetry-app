'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TagItem {
  name: string;
  count: number;
}

interface MetadataTags {
  categories: TagItem[];
  authors: TagItem[];
  poetryTypes: TagItem[];
  dynasties: TagItem[];
  customTags: TagItem[];
}

export default function TagsPage() {
  const [data, setData] = useState<MetadataTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'authors' | 'types' | 'years'>('categories');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/tags');
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">数据加载失败</div>
      </div>
    );
  }

  const tabs = [
    { key: 'categories', label: '分类', data: data.categories },
    { key: 'authors', label: '作者', data: data.authors },
    { key: 'types', label: '类型', data: data.poetryTypes },
    { key: 'years', label: '自定义标签', data: data.customTags }
  ] as const;

  const currentData = tabs.find(t => t.key === activeTab)?.data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← 返回
          </Link>
          <h1 className="text-xl font-bold text-gray-800">标签管理</h1>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span className="ml-1 text-xs text-gray-400">({tab.data.length})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">
            {tabs.find(t => t.key === activeTab)?.label}
          </h2>
          <span className="text-sm text-gray-500">共 {currentData.length} 项</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {currentData.map((item, index) => (
            <Link
              key={`${item.name}-${index}`}
              href={`/search?q=${encodeURIComponent(item.name)}`}
              className="p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="font-medium text-gray-800 truncate">{item.name}</div>
              <div className="text-sm text-gray-500 mt-1">{item.count} 首</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}