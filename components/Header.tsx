'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Sun, Moon, Monitor, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/Sidebar';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';

// ── Helpers ────────────────────────────────────────────────────────────
function capitalizeName(name: string): string {
  const preposicoes = ['de', 'da', 'do', 'dos', 'das', 'e'];
  return name
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word, index) =>
      index > 0 && preposicoes.includes(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter((n) => n[0] === n[0].toUpperCase()) // ignora "de", "da", etc.
    .slice(0, 2)
    .map((n) => n[0])
    .join('');
}

// ── Componente ─────────────────────────────────────────────────────────
export function Header() {
  const { user, fazendaId } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [fazendaNome, setFazendaNome] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Tema ─────────────────────────────────────────────────────────────
  const themeOptions = [
    { value: 'light',  label: 'Claro',   icon: <Sun className="h-4 w-4" /> },
    { value: 'dark',   label: 'Escuro',  icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: 'Sistema', icon: <Monitor className="h-4 w-4" /> },
  ];

  const currentIcon =
    theme === 'dark'  ? <Moon className="h-4 w-4" /> :
    theme === 'light' ? <Sun className="h-4 w-4" /> :
    <Monitor className="h-4 w-4" />;

  // ── Buscar nome da fazenda ───────────────────────────────────────────
  useEffect(() => {
    if (!fazendaId) return;

    const fetchFazenda = async () => {
      const { data } = await supabase
        .from('fazendas')
        .select('nome')
        .eq('id', fazendaId)
        .single();

      if (data?.nome) setFazendaNome(data.nome);
    };

    fetchFazenda();
  }, [fazendaId]);

  // ── Logout ───────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ── Dados do usuário ────────────────────────────────────────────────
  const rawName =
    user?.user_metadata?.nome ||
    user?.user_metadata?.full_name ||
    '';

  const fullName = rawName ? capitalizeName(rawName) : '';
  const displayName = fullName || user?.email?.split('@')[0] || 'Usuário';

  const initials = fullName
    ? getInitials(fullName)
    : displayName[0]?.toUpperCase() || 'U';

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <header
      className="flex items-center p-4 bg-background/80 dark:bg-sidebar/95 backdrop-blur-md border-b border-border sticky top-0 z-40"
      role="toolbar"
      aria-label="Barra superior"
    >
      {/* Menu mobile */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger
          className="inline-flex items-center justify-center rounded-md p-2 md:hidden text-foreground hover:bg-muted dark:hover:bg-muted/80 transition-colors"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 border-r-0">
          <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Breadcrumbs — inline no header, só desktop */}
      <div className="flex-1 ml-4 hidden md:flex items-center overflow-hidden">
        <Breadcrumbs />
      </div>

      {/* Área direita */}
      <div className="flex justify-end items-center gap-x-4">

        {/* Toggle de tema */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-foreground hover:bg-muted dark:hover:bg-muted/80 transition-colors"
            aria-label="Alternar tema"
          >
            {currentIcon}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-xl">
            {themeOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex items-center gap-2 rounded-lg cursor-pointer focus:bg-muted",
                  theme === opt.value ? "bg-muted text-primary" : ""
                )}
              >
                {opt.icon}
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Nome + Fazenda — desktop */}
        <div className="hidden md:flex flex-col items-end" aria-hidden="true">
          <p className="text-sm font-bold text-foreground leading-tight">
            {displayName}
          </p>
          {fazendaNome && (
            <p className="text-xs text-primary font-medium leading-tight mt-0.5">
              {fazendaNome}
            </p>
          )}
        </div>

        {/* Menu do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative h-10 w-10 rounded-2xl p-0 hover:bg-muted dark:hover:bg-muted/80 transition-colors"
            aria-label={`Menu do usuário: ${displayName}`}
          >
            <Avatar className="h-10 w-10 rounded-2xl border-2 border-primary/20 shadow-sm">
              <AvatarImage src={user?.user_metadata?.avatar_url || ''} alt="" />
              <AvatarFallback className="bg-muted text-primary font-bold rounded-2xl text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 mt-2 p-2 rounded-2xl border-border shadow-xl"
            align="end"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold text-foreground leading-none">
                    {displayName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground mt-1">
                    {user?.email}
                  </p>
                  {fazendaNome && (
                    <p className="text-xs leading-none text-primary font-medium mt-1.5">
                      🌱 {fazendaNome}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-border/50" />

            <div className="p-1">
              <DropdownMenuItem
                onClick={() => router.push('/dashboard/configuracoes')}
                className="rounded-xl focus:bg-muted p-3 cursor-pointer"
              >
                Perfil do Usuário
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/dashboard/configuracoes')}
                className="rounded-xl focus:bg-muted p-3 cursor-pointer"
              >
                Configurações
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="bg-border/50" />

            <div className="p-1">
              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-xl focus:bg-destructive/10 p-3 cursor-pointer text-destructive focus:text-destructive"
              >
                Sair da conta
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
