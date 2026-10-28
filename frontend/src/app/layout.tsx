import type { Metadata } from 'next';
import ThemeRegistry from '@/theme/ThemeRegistry';
import { LibraryProvider } from '@/context/LibraryContext';
import AppShell from '@/components/layout/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'CU Library System — Christian Union Ministry',
  description: 'Catalogue management, book lending, overdue tracking with WhatsApp reminders and Brevo confirmation.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <ThemeRegistry>
          <LibraryProvider>
            <AppShell>{children}</AppShell>
          </LibraryProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
