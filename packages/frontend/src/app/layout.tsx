import type { Metadata } from 'next';
import { Inter, Fira_Code } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';
import { ThemeScript } from '@/components/ThemeScript';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'CodeDuel',
  description: 'Code Evaluation and Contest Platform',
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  icons: {
    icon: [{ url: '/images/codeduel-logo.png', type: 'image/png' }],
    apple: [{ url: '/images/codeduel-logo.png', type: 'image/png' }],
  },
  openGraph: {
    title: 'CodeDuel',
    description: 'Compete. Code. Conquer. — Real-time duels and async code judging.',
    siteName: 'CodeDuel',
    type: 'website',
    images: [
      {
        url: '/images/codeduel-logo.png',
        width: 768,
        height: 714,
        alt: 'CodeDuel — Compete. Code. Conquer.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CodeDuel',
    description: 'Compete. Code. Conquer. — Real-time duels and async code judging.',
    images: ['/images/codeduel-logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${inter.variable} ${firaCode.variable} font-sans bg-background text-foreground min-h-screen flex flex-col antialiased`}
      >
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1">
                <PageTransition>{children}</PageTransition>
              </main>
              <Footer />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
