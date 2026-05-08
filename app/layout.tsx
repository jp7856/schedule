import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "행사 매출 관리",
  description: "행사 매출 관리 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}