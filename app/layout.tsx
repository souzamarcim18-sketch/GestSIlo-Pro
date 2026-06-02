import type { Metadata, Viewport } from 'next';
import './globals.css';
import { headers } from 'next/headers';
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
    statusBarStyle: 'black-translucent',
    title: 'GestSilo',
    startupImage: '/icon-512.png',
  },
  icons: {
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#00843D',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lê o nonce gerado pelo middleware para repassar ao Next.js internals e Sentry
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="pt-BR" className={cn("font-sans h-full scroll-smooth", satoshi.variable)}>
      <head>
        {/* Expõe o nonce como meta para que o @sentry/nextjs o leia na inicialização client-side */}
        {nonce && <meta name="csp-nonce" content={nonce} />}
      </head>
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
