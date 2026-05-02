'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { importarCSVAction } from '../actions';
import type { CSVImportResult } from '@/lib/types/rebanho';

export default function ImportarCSVPage() {
  const router = useRouter();
  const { loading: authLoading, profile } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [criarLote, setCriarLote] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CSVImportResult | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (profile?.perfil !== 'Administrador') {
      toast.error('Apenas administradores podem importar animais');
      router.push('/dashboard/rebanho');
      return;
    }
  }, [authLoading, profile, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files[0]) {
      if (!files[0].name.endsWith('.csv')) {
        toast.error('Por favor, selecione um arquivo CSV');
        return;
      }
      setFile(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      toast.error('Selecione um arquivo CSV');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', file);
      formData.append('criar_lote_automatico', String(criarLote));

      const resultado = await importarCSVAction(formData);
      setResult(resultado);

      if (resultado.importados > 0) {
        toast.success(`${resultado.importados} animal(is) importado(s) com sucesso!`);
      }

      if (resultado.erros.length > 0) {
        toast.error(`${resultado.erros.length} erro(s) ao importar`);
      }
    } catch (err) {
      toast.error('Erro ao importar arquivo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Rebanho', href: '/dashboard/rebanho' },
    { label: 'Importar CSV', href: '/dashboard/rebanho/importar' },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6 max-w-2xl">
        <div>
          <Breadcrumbs />
          <h1 className="text-3xl font-bold tracking-tight mt-4">Importar Animais</h1>
          <p className="text-muted-foreground mt-2">
            Importe múltiplos animais em massa via arquivo CSV
          </p>
        </div>

        {!result ? (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O arquivo CSV deve conter as colunas: <strong>brinco</strong>, <strong>sexo</strong>,
                <strong>data_nascimento</strong>. Opcionais: tipo_rebanho, lote, raca, observacoes.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Selecionar Arquivo</CardTitle>
                <CardDescription>Escolha um arquivo CSV para importar</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="arquivo">Arquivo CSV</Label>
                    <div className="mt-2 border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <Input
                        id="arquivo"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="arquivo" className="cursor-pointer">
                        <span className="text-sm font-medium text-primary">
                          {file ? file.name : 'Clique para selecionar'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="criar-lote"
                      checked={criarLote}
                      onCheckedChange={(checked) => setCriarLote(checked as boolean)}
                      disabled={isSubmitting}
                    />
                    <label
                      htmlFor="criar-lote"
                      className="text-sm cursor-pointer"
                    >
                      Criar lote automaticamente se não existir
                    </label>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !file}
                    >
                      {isSubmitting ? 'Importando...' : 'Importar'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Resultado da Importação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Total de Linhas</p>
                    <p className="text-3xl font-bold">{result.total_linhas}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-green-700 font-medium mb-1">Importados</p>
                    <p className="text-3xl font-bold text-green-700">{result.importados}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-red-700 font-medium mb-1">Erros</p>
                    <p className="text-3xl font-bold text-red-700">{result.erros.length}</p>
                  </CardContent>
                </Card>
              </div>

              {result.lote_criado_nome && (
                <Alert className="bg-blue-50">
                  <AlertDescription className="text-blue-800">
                    Lote <strong>{result.lote_criado_nome}</strong> foi criado automaticamente.
                  </AlertDescription>
                </Alert>
              )}

              {result.erros.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Erros Encontrados</h3>
                  <div className="border rounded-lg overflow-auto max-h-80">
                    <table className="w-full text-sm">
                      <thead className="bg-muted border-b">
                        <tr>
                          <th className="px-4 py-2 text-left">Linha</th>
                          <th className="px-4 py-2 text-left">Brinco</th>
                          <th className="px-4 py-2 text-left">Erro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.erros.map((erro, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted">
                            <td className="px-4 py-2">{erro.linha}</td>
                            <td className="px-4 py-2">{erro.brinco}</td>
                            <td className="px-4 py-2 text-red-600">{erro.mensagem}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                  }}
                >
                  Importar Novo Arquivo
                </Button>
                <Button onClick={() => router.push('/dashboard/rebanho')}>
                  Voltar para Rebanho
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
