'use client';

import { User, Sun, Moon, Monitor } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

export function Header() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const themeOptions: { value: string; label: string; icon: React.ReactNode }[] = [
    { value: 'light',  label: 'Claro',    icon: <Sun className="h-4 w-4" /> },
    { value: 'dark',   label: 'Escuro',   icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: 'Sistema',  icon: <Monitor className="h-4 w-4" /> },
  ];

  const currentIcon =
    theme === 'dark' ? <Moon className="h-4 w-4" /> :
    theme === 'light' ? <Sun className="h-4 w-4" /> :
    <Monitor className="h-4 w-4" />;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const userDisplayName = user?.email?.split('@')[0] || 'Usuário';

  return (
    <div
      className="flex items-center p-4 bg-white/80 backdrop-blur-md border-b border-green-100 sticky top-0 z-40"
      role="toolbar"
      aria-label="Barra superior"
    >
      {/* Menu mobile */}
      <Sheet>
        <SheetTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-gray-600 hover:bg-green-50"
            aria-label="Abrir menu de navegação"
          >
            <Menu aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 border-r-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Área direita */}
      <div className="flex w-full justify-end items-center gap-x-4">

        {/* Toggle de tema */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-green-50 dark:hover:bg-green-950"
              aria-label="Alternar tema"
            >
              {currentIcon}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-xl">
            {themeOptions.map(opt => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex items-center gap-2 rounded-lg cursor-pointer ${
                  theme === opt.value ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' : ''
                }`}
              >
                {opt.icon}
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Nome do usuário — desktop */}
        <div className="hidden md:flex flex-col items-end" aria-hidden="true">
          <p className="text-sm font-bold text-gray-900">{userDisplayName}</p>
          <p className="text-xs text-green-600 font-medium">Minha Propriedade</p>
        </div>

        {/* Menu do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-2xl p-0 hover:bg-green-50 transition-colors"
              aria-label={`Menu do usuário: ${userDisplayName}`}
            >
              <Avatar className="h-10 w-10 rounded-2xl border-2 border-white shadow-sm">
                <AvatarImage src="" alt="" />
                <AvatarFallback className="bg-green-100 text-green-700 rounded-2xl">
                  <User className="h-5 w-5" aria-hidden="true" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 mt-2 p-2 rounded-2xl border-green-50 shadow-xl"
            align="end"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold text-gray-900 leading-none">
                    {userDisplayName}
                  </p>
                  <p className="text-xs leading-none text-gray-400 mt-1">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-gray-50" />

            <div className="p-1">
              <DropdownMenuItem
                onClick={() => router.push('/dashboard/configuracoes')}
                className="rounded-xl focus:bg-green-50 focus:text-green-700 p-3 cursor-pointer"
              >
                Perfil do Usuário
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/dashboard/configuracoes')}
                className="rounded-xl focus:bg-green-50 focus:text-green-700 p-3 cursor-pointer"
              >
                Configurações
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="bg-gray-50" />

            <div className="p-1">
              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-xl focus:bg-red-50 focus:text-red-600 p-3 cursor-pointer text-red-500"
              >
                Sair da conta
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </div>
  );
}
