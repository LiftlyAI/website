import type { Metadata } from 'next';
import { Bebas_Neue, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'IRON LEDGER — Powerlifting Coach',
  description: 'AI-powered block periodization, form check, and nutrition for serious lifters.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
