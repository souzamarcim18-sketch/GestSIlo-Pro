import type {Metadata} from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/providers/AuthProvider";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'GestSilo-Pro | Gestão Agrícola Inteligente',
  description: 'Sistema completo de gestão agrícola para silos, talhões, insumos, frota e financeiro.',
  manifest: '/manifest.json',
  themeColor: '#16a34a',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GestSilo PRO',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={cn("font-sans h-full dark", geist.variable)} suppressHydrationWarning>
      <body suppressHydrationWarning className="h-full">
        <ThemeProvider attribute="class" forcedTheme="dark">
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
            <SyncStatusBar />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
