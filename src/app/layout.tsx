import type { Metadata } from 'next';
import { TRPCProvider } from '@/components/providers/TRPCProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Import Trading ERP',
  description: 'Enterprise resource planning system for import trading businesses',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TRPCProvider>
              {children}
              <Toaster />
            </TRPCProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
