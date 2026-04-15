'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Landmark, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { createFazenda } from '@/lib/supabase/fazenda';
import type { CityOption } from '@/hooks/useGeocoding';

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);

  const nomeRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nome = nomeRef.current?.value?.trim();
    if (!nome) {
      toast.error('Informe o nome da fazenda.');
      nomeRef.current?.focus();
      return;
    }

    if (!user) {
      toast.error('Usuário não autenticado.');
      return;
    }

    if (!selectedCity) {
      toast.error('Selecione uma cidade para localizar sua fazenda.');
      return;
    }

    setSaving(true);
    try {
      await createFazenda(user.id, {
        nome,
        localizacao: selectedCity.displayName,
        area_total: areaRef.current?.value
          ? parseFloat(areaRef.current.value)
          : null,
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
      });

      toast.success('Fazenda criada com sucesso! 🎉');

      // Atualiza o state do useAuth sem reload
      await refreshProfile();

      // Redireciona pro dashboard
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar fazenda';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-4 shadow-lg dark:bg-card dark:border-border">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto w-14 h-14 bg-primary/20 dark:bg-muted rounded-full flex items-center justify-center">
          <Landmark className="h-7 w-7 text-primary dark:text-primary" aria-hidden="true" />
        </div>
        <CardTitle>
          <h1 className="text-2xl font-bold dark:text-foreground">Bem-vindo ao GestSilo!</h1>
        </CardTitle>
        <CardDescription className="text-base dark:text-muted-foreground">
          Para começar, cadastre os dados da sua fazenda.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="onb-nome">
              Nome da Fazenda <span className="text-destructive">*</span>
            </Label>
            <Input
              id="onb-nome"
              ref={nomeRef}
              placeholder="Ex: Fazenda Santa Maria"
              autoFocus
              required
            />
          </div>

          <CityAutocomplete
            label="Localização (Cidade) *"
            placeholder="Digite a cidade (ex: Ribeirão Preto)"
            onSelect={setSelectedCity}
          />

          <div className="space-y-2">
            <Label htmlFor="onb-area">Área Total (ha)</Label>
            <Input
              id="onb-area"
              ref={areaRef}
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex: 500"
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? (
              'Criando fazenda...'
            ) : (
              <>
                Começar a usar o GestSilo
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
