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
    slug: 'amostragem-de-solo-para-analise',
    titulo: 'Guia passo a passo: amostragem de solo para análise',
    descricao:
      'Se a amostra não representa a área, o resultado pode levar a adubação e calagem erradas. Veja como coletar corretamente e garantir uma análise confiável.',
    categoria: 'Solo',
    tempoLeitura: 6,
    publicadoEm: '2026-06-15',
    destaque: false,
    conteudo: `A amostragem de solo é o primeiro e mais importante passo para uma análise confiável. Se a amostra não representa a área, o resultado pode levar a adubação e calagem erradas, com perda de produtividade e aumento de custos.

## 1. Definir onde e quando amostrar

### Como dividir a área

- Separe a propriedade em **glebas homogêneas**.
- Cada gleba deve ser homogênea em tipo de solo, topografia, cor, drenagem, histórico de uso, produtividade e aplicações anteriores de corretivos e fertilizantes.
- Áreas com características diferentes devem ser amostradas separadamente, para evitar que o resultado mascare variações importantes dentro da propriedade.

### Época de amostragem

- Faça a coleta com antecedência suficiente para receber o resultado e realizar calagem e adubação antes do plantio.
- Evite amostrar com o solo muito encharcado ou em períodos de excesso de água.

## 2. Materiais necessários

- Trado de amostragem ou pá reta.
- Balde limpo, de preferência de plástico.
- Sacos limpos para envio ao laboratório.
- Etiquetas para identificação.
- Ficha ou formulário com informações da área.

Evite recipientes com resíduos de fertilizantes, defensivos ou outros produtos químicos, pois isso pode contaminar a amostra.

## 3. Passo a passo da coleta com trado

1. Divida a área em glebas homogêneas.
2. Caminhe em zig-zag dentro de cada gleba e escolha pontos distribuídos ao acaso.
3. Em cada ponto, introduza o trado e retire uma amostra simples.
4. Coloque todas as amostras simples em um balde limpo.
5. Misture bem para formar a amostra composta.

O recomendado é coletar entre **15 e 20 amostras simples por gleba**, para melhorar a representatividade da amostra final.

## 4. Passo a passo da coleta com pá

1. Limpe a superfície do local, retirando folhas, restos culturais e pedras.
2. Abra uma cova em forma de cunha, com profundidade de 15 a 20 cm.
3. Em um dos lados da cova, retire uma fatia de 2 a 5 cm de espessura.
4. Descarte as bordas laterais da fatia e aproveite apenas a parte central.
5. Coloque o solo aproveitado no balde de coleta.
6. Repita o procedimento nos demais pontos da gleba.

Depois de coletar todas as subamostras, misture bem e retire cerca de **0,5 kg de solo** para enviar ao laboratório.

## 5. Profundidade de amostragem

- Para culturas anuais, a profundidade padrão é de **0 a 20 cm**.
- Em algumas situações com culturas perenes, pode ser necessário também coletar a camada de **20 a 40 cm**, conforme a recomendação técnica.

## 6. Homogeneização e preparo da amostra final

- Misture todas as subamostras no balde até obter uma massa uniforme.
- Retire cerca de 0,5 kg para compor a amostra final.
- Coloque a amostra em saco limpo e identifique corretamente.

Se a amostra não puder ser enviada rapidamente, o material deve ser seco à sombra antes do envio, para preservar sua qualidade.

## 7. Etiquetagem e envio ao laboratório

Identifique a amostra com informações como nome da gleba, data da coleta e cultura de interesse. Também é recomendável enviar informações de histórico da área, como uso anterior, calagem e adubações já realizadas.

## 8. Cuidados importantes

Não colete próximo a estradas, currais, galpões, formigueiros, depósitos de adubo ou locais atípicos da área, porque esses pontos podem distorcer o resultado.

A análise de solo só será útil se a coleta representar bem a realidade da área. Por isso, a etapa de amostragem deve ser tratada como parte decisiva do manejo da fertilidade.`,
  },
  {
    slug: 'amostragem-de-silagem-no-painel-do-silo',
    titulo: 'Guia passo a passo: amostragem de silagem no painel do silo',
    descricao:
      'Uma coleta mal feita pode distorcer a análise bromatológica e levar a decisões erradas na formulação da dieta. Veja como amostrar corretamente o painel do silo.',
    categoria: 'Silagem',
    tempoLeitura: 6,
    publicadoEm: '2026-06-15',
    destaque: false,
    conteudo: `A amostragem de silagem deve representar o material realmente consumido pelos animais. Como a silagem é heterogênea, uma coleta mal feita pode distorcer a análise bromatológica e levar a decisões erradas na formulação da dieta.

## 1. Por que amostrar a silagem

- Conhecer a composição química do volumoso.
- Apoiar o balanceamento de dietas com mais precisão.
- Monitorar a qualidade da silagem ao longo do uso do silo.
- Detectar variações de material entre diferentes pontos ou momentos de retirada.

## 2. Onde coletar no painel do silo

A recomendação prática é coletar em vários pontos da face do silo, buscando representar o painel como um todo.

Evite coletar:

- Nas laterais do silo.
- No topo.
- Em regiões com mofo, aquecimento, mau cheiro ou coloração alterada.
- Apenas na camada superficial exposta ao ar.

A região periférica do silo tende a sofrer mais deterioração aeróbia do que a região central. Por isso, não deve ser usada como referência principal de coleta.

## 3. Número de pontos de coleta

| Tamanho do painel | Pontos recomendados |
|---|---|
| Até 30 m² | cerca de 8 pontos |
| 30 a 60 m² | cerca de 14 pontos |
| Acima de 90 m² | cerca de 20 pontos |

Quanto maior o painel, maior deve ser o número de subamostras para garantir boa representatividade.

## 4. Materiais necessários

- Balde limpo.
- Sacos plásticos limpos.
- Etiqueta de identificação.
- Luvas, se desejar.
- Lona ou superfície limpa para homogeneização.

## 5. Passo a passo da coleta

1. Realize a coleta após a retirada normal da silagem do dia, com a face do silo mais regular.
2. Distribua mentalmente pontos ao longo do painel, evitando bordas e topo.
3. Em cada ponto, retire material que represente a massa interna, e não apenas a parte superficial.
4. Junte todas as subamostras em um recipiente limpo.
5. Misture bem todo o material coletado.
6. Se o volume estiver grande, faça o quarteamento para reduzir a amostra sem perder representatividade.
7. Separe cerca de **1 kg de silagem** para envio ao laboratório.

## 6. Como fazer o quarteamento

- Espalhe a amostra sobre uma lona ou superfície limpa.
- Misture bem o material.
- Divida em quatro partes iguais.
- Descarte duas partes opostas.
- Misture novamente as duas partes restantes.
- Repita o processo, se necessário, até chegar ao volume ideal de envio.

## 7. Embalagem e conservação

- Coloque a amostra em saco plástico limpo.
- Retire o máximo de ar possível.
- Identifique com data, nome do silo e tipo de forragem.
- Se o envio não for imediato, mantenha a amostra **resfriada ou congelada**.

## 8. Erros comuns

- Coletar apenas da superfície do painel.
- Amostrar bordas, topo ou regiões deterioradas.
- Misturar material bom com material claramente alterado.
- Não homogeneizar bem antes de separar a amostra final.
- Demorar demais para enviar a amostra sem conservação adequada.

## 9. Observação técnica

Além da análise laboratorial, é importante observar aspectos físicos e organolépticos da silagem — cor, odor, textura e presença de fungos. Esses sinais ajudam a complementar a avaliação de qualidade diretamente na fazenda.

Uma boa análise depende de uma boa amostragem. O laboratório avalia apenas o material enviado, então a qualidade do resultado começa no momento da coleta.`,
  },
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
