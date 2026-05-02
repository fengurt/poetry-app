'use client';

import { useState } from 'react';

interface Author {
  name: string;
  poem_count: number;
}

interface AuthorFilterProps {
  authors: Author[];
  selectedAuthor: string | null;
  onSelect: (author: string | null) => void;
}

export function AuthorFilter({ authors, selectedAuthor, onSelect }: AuthorFilterProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border rounded-lg p-4">
      <div
        className="flex justify-between items-center cursor-pointer mb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-bold text-gray-700">按作者筛选</h3>
        <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          <button
            onClick={() => onSelect(null)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              selectedAuthor === null
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-100'
            }`}
          >
            全部作者
          </button>

          {authors.map((author) => (
            <button
              key={author.name}
              onClick={() => onSelect(author.name)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors flex justify-between items-center ${
                selectedAuthor === author.name
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100'
              }`}
            >
              <span className="truncate">{author.name}</span>
              <span className="text-gray-400 text-sm ml-2">({author.poem_count})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}