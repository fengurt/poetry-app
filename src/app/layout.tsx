import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "爱国诗词集",
  description: "浏览、搜索、分类与导出的现代诗词管理应用",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full flex flex-col antialiased pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}