'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="relative flex items-center">
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="诗词、作者、分类、朝代..."
          className="min-h-11 w-full rounded-lg border border-gray-300 py-2 pl-4 pr-[5.25rem] text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 min-h-9 -translate-y-1/2 rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          搜索
        </button>
      </div>
    </form>
  );
}