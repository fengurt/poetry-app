'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

export default function PoemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [poem, setPoem] = useState<Poem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchPoem();
  }, [params.id]);

  const fetchPoem = async () => {
    try {
      const res = await fetch(`/api/poems/${params.id}`);
      if (!res.ok) throw new Error('Poem not found');
      const data = await res.json();
      setPoem(data);
      setTagInput(data.tags?.join(', ') || '');
    } catch (error) {
      console.error('Failed to fetch poem:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.open(`/api/poems/export?ids=${poem?.id}`, '_blank');
  };

  const handleUpdateTags = async () => {
    if (!poem) return;

    const newTags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      const res = await fetch(`/api/poems/${poem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags })
      });

      if (res.ok) {
        setPoem({ ...poem, tags: newTags });
        setEditingTags(false);
      }
    } catch (error) {
      console.error('Failed to update tags:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!poem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">诗词未找到</div>
      </div>
    );
  }

  const categoryChipClass: Record<string, string> = {
    不忘初心: 'border-red-200 bg-red-50 text-red-800',
    咏物寄情: 'border-green-200 bg-green-50 text-green-800',
    情系河山: 'border-blue-200 bg-blue-50 text-blue-800',
    老龄心声: 'border-purple-200 bg-purple-50 text-purple-800',
    感事抒怀: 'border-orange-200 bg-orange-50 text-orange-800',
    诗社撷英: 'border-pink-200 bg-pink-50 text-pink-800',
    曲赋雅韵: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    时代风云: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    刺玫瑰: 'border-rose-200 bg-rose-50 text-rose-800',
    七彩人生: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    诗词文苑: 'border-violet-200 bg-violet-50 text-violet-800',
    心香一瓣: 'border-gray-200 bg-gray-50 text-gray-800',
  };

  const redundantMeta = new Set(
    [poem.author_name, poem.dynasty, poem.poetry_type].filter(Boolean) as string[]
  );
  const customTagsOnly =
    poem.tags?.filter((tag) => tag && !redundantMeta.has(tag)) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← 返回
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            导出Word
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-white rounded-xl shadow-lg p-8">
          {/* Title & Author */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{poem.title}</h1>
            {poem.subtitle && (
              <p className="text-xl text-gray-600 mb-4">{poem.subtitle}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {poem.category ? (
                <span
                  className={`rounded-full border px-3 py-1 text-sm font-medium ${categoryChipClass[poem.category] ?? 'border-gray-200 bg-gray-50 text-gray-700'}`}
                >
                  {poem.category}
                </span>
              ) : null}
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm text-blue-800">
                {poem.author_name}
              </span>
              {poem.dynasty ? (
                <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-sm text-amber-900">
                  {poem.dynasty}
                </span>
              ) : null}
              {poem.poetry_type ? (
                <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-sm text-violet-800">
                  {poem.poetry_type}
                </span>
              ) : null}
            </div>
          </div>

          {/* Content */}
          <div className="border-t border-b border-gray-200 py-8 mb-8">
            <pre className="whitespace-pre-wrap text-center text-xl leading-loose text-gray-700 font-sans">
              {poem.content}
            </pre>
          </div>

          {/* Tags */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">自定义标签</h3>
            {editingTags ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="输入标签，用逗号分隔（可与年份等备注共用）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateTags}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setEditingTags(false);
                      setTagInput(poem.tags?.join(', ') || '');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 items-center">
                {customTagsOnly.length > 0 ? (
                  customTagsOnly.map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">暂无自定义标签</span>
                )}
                <button
                  onClick={() => setEditingTags(true)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  + 编辑标签
                </button>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="text-sm text-gray-400 space-y-1">
            {poem.source && <p>来源: {poem.source}</p>}
            {poem.notes && <p>备注: {poem.notes}</p>}
          </div>
        </article>
      </main>
    </div>
  );
}