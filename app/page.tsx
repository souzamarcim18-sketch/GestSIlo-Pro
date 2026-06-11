'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { LandingModalProvider } from './(landing)/components/LandingModalContext';
import ModalInstitucional from './(landing)/components/ModalInstitucional';
import Navbar from './(landing)/components/Navbar';
import Hero from './(landing)/components/Hero';
import ComoFunciona from './(landing)/components/ComoFunciona';
import Funcionalidades from './(landing)/components/Funcionalidades';
import Beneficios from './(landing)/components/Beneficios';
import QuemSomos from './(landing)/components/QuemSomos';
import Planos from './(landing)/components/Planos';
import CtaFinal from './(landing)/components/CtaFinal';
import Footer from './(landing)/components/Footer';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const checkUserRole = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('perfil')
          .eq('id', user.id)
          .single();

        if (profile?.perfil === 'Operador') {
          router.push('/operador');
        } else {
          router.push('/dashboard');
        }
      } catch {
        router.push('/dashboard');
      }
    };

    checkUserRole();
  }, [user, loading, router]);

  return (
    <LandingModalProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <ModalInstitucional />
        <Navbar />
        <Hero />
        <ComoFunciona />
        <Funcionalidades />
        <Beneficios />
        <QuemSomos />
        <Planos />
        <CtaFinal />
        <Footer />
      </div>
    </LandingModalProvider>
  );
}
