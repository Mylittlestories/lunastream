import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LunaStream - Freedom to Stream',
  description: 'Stream movies and TV series with community addons. A powerful Stremio-like streaming platform.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0b1a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0b1a] text-[#f0f0f0]">
        {children}
      </body>
    </html>
  );
}
