export type CategoriaGuia =
  | 'Silagem'
  | 'Solo'
  | 'Rebanho'
  | 'Financeiro'
  | 'Pastagens'
  | 'Geral';

export type Guia = {
  slug: string;
  titulo: string;
  descricao: string; // 1–2 frases para o card
  categoria: CategoriaGuia;
  tempoLeitura: number; // minutos
  publicadoEm: string; // ISO date string
  conteudo: string; // Markdown simples
  destaque?: boolean;
};

export const CATEGORIAS_GUIA: CategoriaGuia[] = [
  'Silagem',
  'Solo',
  'Rebanho',
  'Financeiro',
  'Pastagens',
  'Geral',
];

export const GUIAS: Guia[] = [
  {
    slug: 'ponto-de-colheita-silagem-de-milho',
    titulo: 'Como avaliar o ponto de colheita da silagem de milho',
    descricao:
      'O teor de matéria seca define a qualidade da silagem. Aprenda a identificar o ponto certo de colheita usando a linha do leite e o teste prático da mão.',
    categoria: 'Silagem',
    tempoLeitura: 5,
    publicadoEm: '2026-06-10',
    destaque: true,
    conteudo: `O momento da colheita é a decisão que mais impacta a qualidade da sua silagem de milho. Colher cedo demais ou tarde demais compromete a fermentação, reduz a energia do volumoso e aumenta as perdas no silo. Acertar o ponto certo não exige laboratório — exige observação e alguns testes simples no campo.

## Por que o ponto de colheita é tão importante

A silagem de milho ideal tem entre **32% e 38% de matéria seca (MS)**. Esse intervalo garante três coisas ao mesmo tempo: açúcar suficiente para a fermentação, umidade adequada para a compactação e amido bem formado nos grãos.

- **Abaixo de 30% de MS:** a planta está muito úmida. Há produção de efluente (líquido que escorre do silo), perda de nutrientes e risco de fermentação por clostrídios, que gera silagem de cheiro ruim e baixa palatabilidade.
- **Acima de 40% de MS:** a planta está seca demais. A massa não compacta bem, sobra ar dentro do silo e isso favorece fungos, aquecimento e perdas por deterioração aeróbia na hora de abrir.

Cada ponto percentual de MS fora da faixa ideal representa energia perdida que sai caro na ponta — em leite a menos no balde ou em ganho de peso a menos no cocho.

## O indicador mais confiável: a linha do leite

O grão de milho é o melhor termômetro da planta. Quebre uma espiga ao meio e observe os grãos da porção central. Dentro de cada grão existe uma fronteira visível entre a parte leitosa (mais clara, pastosa) e a parte amilácea já endurecida (mais firme, opaca). Essa fronteira é a **linha do leite**, e ela sobe da ponta do grão em direção à base conforme a planta amadurece.

| Posição da linha do leite | Matéria seca aproximada | Recomendação |
|---|---|---|
| 1/4 do grão (próxima à coroa) | 28–30% | Cedo — aguardar |
| 1/2 do grão | 32–35% | **Ponto ideal de colheita** |
| 3/4 do grão | 36–38% | Limite — colher já |
| Camada preta na base | acima de 40% | Tarde — compactação prejudicada |

Na prática, a faixa entre **meio grão e dois terços** é a janela em que a maior parte das lavouras de milho atinge o teor ideal de matéria seca.

## O teste prático da mão

Sem balança de campo, dá para estimar a umidade apertando a massa picada na mão:

1. Pique uma amostra representativa da planta inteira (colmo, folhas e espiga).
2. Aperte firme um punhado por cerca de 30 segundos e abra a mão.
3. **Bola se forma e escorre líquido:** úmido demais (abaixo de 30% MS). Espere.
4. **Bola se forma e se mantém, sem escorrer:** ponto bom (32–38% MS). Pode colher.
5. **Massa se esfarela e não forma bola:** seca demais (acima de 40% MS). Já passou do ponto.

## Antes de levar a colheitadeira ao campo

- **Avalie a lavoura como um todo**, não apenas a borda. Caminhe pelo talhão e quebre espigas em pontos diferentes para ter uma média real.
- **Acompanhe a evolução a cada 2 ou 3 dias** quando a linha do leite passar de um quarto. A planta seca rápido nessa fase, especialmente em dias quentes.
- **Confira o tamanho de partícula** da picagem (ideal entre 8 e 15 mm) e o processamento dos grãos. Grão inteiro na silagem é amido que o animal não aproveita.
- **Tenha lona e mão de obra prontas.** Compactar e vedar no mesmo dia da colheita é o que trava o oxigênio e garante boa fermentação.

Registrar a data de fechamento e o ponto observado em cada silo ajuda a comparar safras e ajustar o calendário de plantio nos anos seguintes. Com o histórico em mãos, a decisão de quando colher deixa de ser palpite e passa a ser rotina.`,
  },
];

export function listGuias(): Guia[] {
  return [...GUIAS].sort(
    (a, b) =>
      new Date(b.publicadoEm).getTime() - new Date(a.publicadoEm).getTime(),
  );
}

export function getGuiaBySlug(slug: string): Guia | undefined {
  return GUIAS.find((g) => g.slug === slug);
}
