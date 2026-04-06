'use client';

import { User } from 'lucide-react';
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
import { Sidebar } from '@/components/sidebar';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function Header() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

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

  return (
    <div className="flex items-center p-4 bg-white/80 backdrop-blur-md border-b border-green-100 sticky top-0 z-40">
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden text-gray-600 hover:bg-green-50">
              <Menu />
            </Button>
          }
        />
        <SheetContent side="left" className="p-0 w-72 border-r-0">
          <Sidebar />
        </SheetContent>
      </Sheet>
      <div className="flex w-full justify-end items-center gap-x-4">
        <div className="hidden md:flex flex-col items-end">
          <p className="text-sm font-bold text-gray-900">{user?.email?.split('@')[0] || 'Usuário'}</p>
          <p className="text-xs text-green-600 font-medium">Minha Propriedade</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="relative h-10 w-10 rounded-2xl p-0 hover:bg-green-50 transition-colors">
                <Avatar className="h-10 w-10 rounded-2xl border-2 border-white shadow-sm">
                  <AvatarImage src="" alt="Avatar" />
                  <AvatarFallback className="bg-green-100 text-green-700 rounded-2xl">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent className="w-64 mt-2 p-2 rounded-2xl border-green-50 shadow-xl" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold text-gray-900 leading-none">{user?.email?.split('@')[0]}</p>
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
