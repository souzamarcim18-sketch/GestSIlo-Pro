import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { AuthProvider } from "@/providers/AuthProvider";
import { Providers } from "@/app/providers";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

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
    <html lang="pt-BR" className={cn("font-sans h-full scroll-smooth", geist.variable)}>
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
