import type { Metadata, Viewport } from 'next';
import './globals.css';
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { AuthProvider } from "@/providers/AuthProvider";
import { Providers } from "@/app/providers";

const satoshi = localFont({
  src: [
    { path: '../public/fonts/Satoshi-Variable.ttf', style: 'normal' },
    { path: '../public/fonts/Satoshi-VariableItalic.ttf', style: 'italic' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GestSilo | Gestão Agrícola Inteligente',
  description: 'Sistema completo de gestão agrícola para silos, talhões, insumos, frota e financeiro.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GestSilo',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00843D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={cn("font-sans h-full scroll-smooth", satoshi.variable)}>
      <body className="h-full bg-background text-foreground">
        <AuthProvider>
          <Providers>
            {children}
            <Toaster position="top-right" />
            <SyncStatusBar />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
