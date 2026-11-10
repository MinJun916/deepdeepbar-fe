import { Analytics } from '@vercel/analytics/next';
import localFont from 'next/font/local';

import './globals.css';

import { AppToaster } from '@/components/sonner';
import QueryProvider from '@/providers/QueryProvider';

import type { Metadata, Viewport } from 'next';

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '혼술바 딥딥(deepdeep)',
  description: '혼자와도 함께하는, 밤이 깊어질수록 더 좋아지는 공간. 혼술바 딥딥',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  colorScheme: 'light',
  themeColor: '#fcf8f2',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} antialiased`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
        <AppToaster />
        <Analytics />
      </body>
    </html>
  );
}
