'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '首页', icon: '首' },
  { href: '/search', label: '搜索', icon: '索' },
  { href: '/categories', label: '可视化', icon: '图' },
  { href: '/tags', label: '标签', icon: '签' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md"
      aria-label="主导航"
    >
      <div className="mx-auto flex max-w-lg justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
        {navItems.map(({ href, label, icon }) => {
          const active =
            href === '/'
              ? pathname === '/' || pathname === ''
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center rounded-lg px-3 py-1 text-xs transition-colors ${
                active ? 'font-semibold text-blue-600' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="mt-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
