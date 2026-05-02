import { Poem } from '@/lib/db';

interface PoemCardProps {
  poem: Poem;
  onSelect?: (poem: Poem) => void;
  selected?: boolean;
}

export function PoemCard({ poem, onSelect, selected }: PoemCardProps) {
  const contentPreview = poem.content.length > 80
    ? poem.content.substring(0, 80) + '...'
    : poem.content;

  const redundantMeta = new Set(
    [poem.author_name, poem.dynasty, poem.poetry_type].filter(Boolean) as string[]
  );
  const customTagsOnly =
    poem.tags?.filter((tag) => tag && !redundantMeta.has(tag)) ?? [];

  // Category color mapping
  const categoryColors: Record<string, string> = {
    '不忘初心': 'bg-red-100 text-red-700 border-red-200',
    '咏物寄情': 'bg-green-100 text-green-700 border-green-200',
    '情系河山': 'bg-blue-100 text-blue-700 border-blue-200',
    '老龄心声': 'bg-purple-100 text-purple-700 border-purple-200',
    '感事抒怀': 'bg-orange-100 text-orange-700 border-orange-200',
    '诗社撷英': 'bg-pink-100 text-pink-700 border-pink-200',
    '曲赋雅韵': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    '时代风云': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    '刺玫瑰': 'bg-rose-100 text-rose-700 border-rose-200',
    '七彩人生': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    '诗词文苑': 'bg-violet-100 text-violet-700 border-violet-200',
    '心香一瓣': 'bg-gray-100 text-gray-700 border-gray-200'
  };

  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
      }`}
      onClick={() => onSelect?.(poem)}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="flex-1 truncate text-base font-bold text-gray-800 sm:text-lg">{poem.title}</h3>
      </div>

      {poem.subtitle && (
        <p className="text-xs sm:text-sm text-gray-600 mb-2">{poem.subtitle}</p>
      )}

      <p className="text-gray-600 text-xs sm:text-sm whitespace-pre-line leading-relaxed line-clamp-2 sm:line-clamp-3">
        {contentPreview}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {poem.category ? (
          <span
            className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${categoryColors[poem.category] || 'border-gray-200 bg-gray-100 text-gray-600'}`}
          >
            {poem.category}
          </span>
        ) : null}
        {poem.author_name ? (
          <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
            {poem.author_name}
          </span>
        ) : null}
        {poem.dynasty ? (
          <span className="rounded-md border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
            {poem.dynasty}
          </span>
        ) : null}
        {poem.poetry_type ? (
          <span className="rounded-md border border-violet-100 bg-violet-50 px-2 py-0.5 text-xs text-violet-800">
            {poem.poetry_type}
          </span>
        ) : null}
      </div>

      {customTagsOnly.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {customTagsOnly.slice(0, 6).map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
          {customTagsOnly.length > 6 ? (
            <span className="px-1.5 py-0.5 text-xs text-gray-400">+{customTagsOnly.length - 6}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}