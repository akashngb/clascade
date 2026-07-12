import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClassForge — Teacher Studio',
  description: 'Build and conduct interactive lessons with AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full font-sans antialiased">{children}</body>
    </html>
  );
}
