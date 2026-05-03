'use client';

import Link from 'next/link';
import { SearchBar } from '@/components/SearchBar';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
}

export function TopBar({ title, showBack, backHref = '/' }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            {showBack ? (
              <Link
                href={backHref}
                className="flex-shrink-0 text-sm text-blue-600 hover:text-blue-700"
              >
                ← 返回
              </Link>
            ) : (
              <h1 className="text-lg font-bold text-gray-800 sm:text-xl">
                {title || '爱国诗词集'}
              </h1>
            )}
          </div>
          <div className="w-full">
            <SearchBar />
          </div>
        </div>
      </div>
    </header>
  );
}
