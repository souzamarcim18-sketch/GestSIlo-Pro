import {
  Wheat,
  Tractor,
  Calculator,
  DollarSign,
  Package,
  BarChart3,
  Sprout,
  Zap,
  MapPin,
  TrendingDown,
  Shield,
  Beef,
  Leaf,
  Users,
  Scale,
  type LucideIcon,
} from 'lucide-react';

// ===== COMO FUNCIONA =====
export interface Step {
  num: string;
  title: string;
  desc: string;
}

export const STEPS: Step[] = [
  {
    num: '01',
    title: 'Solicite seu acesso',
    desc: 'Preencha um formulário rápido com os dados da sua fazenda. Em até 1 dia útil você recebe o convite por e-mail.',
  },
  {
    num: '02',
    title: 'Cadastre sua propriedade',
    desc: 'Nome da fazenda, seus silos, rebanho e áreas. Leva menos de 10 minutos para ter tudo pronto.',
  },
  {
    num: '03',
    title: 'Comece a controlar',
    desc: 'Registre entradas e saídas, acompanhe o estoque em tempo real e receba alertas automáticos.',
  },
];

// ===== FUNCIONALIDADES =====
export interface Funcionalidade {
  Icon: LucideIcon;
  title: string;
  desc: string;
  iconColor: string;
}

export const FUNCIONALIDADES_CORE: Funcionalidade[] = [
  { Icon: Wheat, title: 'Gestão de Silagens', desc: 'Controle total das suas silagens — entradas, saídas, volumes, qualidade bromatológica e de tamanho de partículas, evitando perdas e garantindo forragem de alto valor nutricional para o rebanho.', iconColor: '#BBF7D0' },
  { Icon: Beef, title: 'Gestão de Rebanho', desc: 'Seja para o rebanho leiteiro ou de corte. Ficha completa de cada animal, controle por lotes, reprodução, produção leiteira, sanidade, pesagens e GMD — tudo integrado em um único módulo.', iconColor: '#FED7AA' },
  { Icon: Sprout, title: 'Gestão de Lavouras', desc: 'Para gerenciar seus talhões, ciclos agrícolas, operações de campo, histórico de cultivos, produtividade por área e custo de produção por ciclo.', iconColor: '#BFDBFE' },
];

export const FUNCIONALIDADES_GESTAO: Funcionalidade[] = [
  { Icon: Tractor, title: 'Frota & Maquinário', desc: 'Plano de manutenção preventiva/corretiva, diário de bordo, abastecimentos e custo operacional por máquina.', iconColor: '#FED7AA' },
  { Icon: Leaf, title: 'Gestão de Pastagens', desc: 'Controle de piquetes, ocupações de lotes, cálculo de UA/ha e histórico de eventos de manejo por área.', iconColor: '#BBF7D0' },
  { Icon: DollarSign, title: 'Gestão Financeira', desc: 'Despesas, receitas, fluxo de caixa e lucratividade com integração automática de todos os módulos — insumos, mão de obra, vendas.', iconColor: '#FEF08A' },
  { Icon: Users, title: 'Mão de Obra', desc: 'Registro de atividades rurais, custo por colaborador, vínculo com talhões e silos, e integração automática ao financeiro.', iconColor: '#E9D5FF' },
];

export const FUNCIONALIDADES_SUPORTE: Funcionalidade[] = [
  { Icon: Package, title: 'Estoque de Insumos & Produtos', desc: 'Controle os estoques de insumos e de seus produtos, com níveis mínimos, alertas automáticos, integração financeira e planejamento de compras.', iconColor: '#A5F3FC' },
  { Icon: Scale, title: 'Balanço Forrageiro', desc: 'Cruzamento do consumo real da silagem, da demanda projetada para o rebanho e da oferta das pastagens para calcular a autonomia líquida.', iconColor: '#D9F99D' },
  { Icon: Calculator, title: 'Calculadoras Agronômicas', desc: 'Encontre a combinação de fertilizantes mais econômica para sua necessidade. Calcule a necessidade de calcário a partir da análise de solo, com recomendação técnica integrada.', iconColor: '#E9D5FF' },
  { Icon: BarChart3, title: 'Relatórios Exportáveis', desc: 'Mais de 15 relatórios em Excel e PDF cobrindo todos os módulos — rebanho, financeiro, talhões, frota e muito mais.', iconColor: '#DDD6FE' },
];

// ===== HERO — prova social =====
export const HERO_PROVA_SOCIAL: string[] = [
  'Desenvolvido por agrônomo com mestrado e experiência de campo em silagem',
  'Funciona no celular, sem sinal, direto do campo',
  'Começar é gratuito — sem cartão de crédito',
];

// ===== BENEFÍCIOS =====
export interface Beneficio {
  Icon: LucideIcon;
  title: string;
  desc: string;
}

export const BENEFICIOS: Beneficio[] = [
  { Icon: Zap, title: 'Agilidade no campo', desc: 'Qualquer dado em menos de 3 segundos, do celular, com luvas, mesmo com sinal fraco.' },
  { Icon: MapPin, title: 'Rastreabilidade completa', desc: 'Histórico desde o primeiro dia: cada silo, cada retirada, cada lote do rebanho.' },
  { Icon: TrendingDown, title: 'Custo real, não estimativa', desc: 'Saiba exatamente o que cada silagem, cada animal e cada talhão está custando.' },
  { Icon: Shield, title: 'Seus dados são seus', desc: 'Criptografia, backup semanal automático e isolamento total entre fazendas.' },
];

// ===== BENEFÍCIOS — mockup sidebar =====
export interface MockupSidebarItem {
  Icon: LucideIcon;
  label: string;
}

export const MOCKUP_SIDEBAR_ITEMS: MockupSidebarItem[] = [
  { Icon: Wheat, label: 'Silos' },
  { Icon: Sprout, label: 'Lavouras' },
  { Icon: Leaf, label: 'Pastagens' },
  { Icon: Beef, label: 'Rebanho' },
  { Icon: Package, label: 'Insumos' },
  { Icon: DollarSign, label: 'Financeiro' },
];

export const MOCKUP_ALERTAS = [
  { msg: 'Sem consumo há 4 dias — Silo02', sub: 'Silo aberto sem registro de saída' },
  { msg: 'Silo aberto sem consumo — Silo 01', sub: 'Aberto há 3 dias sem saída de silagem' },
];

export const MOCKUP_SILOS = [
  { nome: 'Silo02 — Milho', pct: 99, cor: '#00A651' },
  { nome: 'Silo 04 — Sorgo', pct: 99, cor: '#EAB308' },
  { nome: 'Silo 01 — Milho', pct: 99, cor: '#3B82F6' },
];

export const MOCKUP_FINANCEIRO = [
  { label: 'Receita do Mês', value: 'R$ 0,00', color: '#4ADE80' },
  { label: 'Despesa do Mês', value: 'R$ 0,00', color: '#F87171' },
];

// ===== ANCORAGEM HUMANA — diferenciais =====
export const ANCORAGEM_DIFERENCIAIS: { label: string }[] = [
  { label: 'Interface pensada para uso com luvas, ao sol, com 4G fraco' },
  { label: 'PWA offline-ready: registre no campo sem sinal, sincroniza depois' },
  { label: 'Nenhum jargão técnico desnecessário na interface' },
  { label: 'Suporte via WhatsApp — sem ticket, sem fila, sem robô' },
  { label: 'Desenvolvido no Brasil, para o campo brasileiro' },
];

// ===== PLANOS =====
export interface Plano {
  name: string;
  priceMonthly: number | null;
  priceAnnually: number | null;
  desc: string;
  features: string[];
  cta: string;
  highlight: boolean;
  freeForever: boolean;
}

export const PLANOS: Plano[] = [
  {
    name: 'Free',
    priceMonthly: null,
    priceAnnually: null,
    desc: 'Para produtores que querem iniciar e conhecer',
    features: ['Até 2 silos', '1 simulação de planejamento', 'Alertas críticos do dashboard'],
    cta: 'Começar grátis',
    highlight: false,
    freeForever: true,
  },
  {
    name: 'Starter',
    priceMonthly: 49,
    priceAnnually: 490,
    desc: 'Para quem gerencia rebanho e silagem',
    features: ['Silos ilimitados', 'Rebanho completo', 'Balanço Forrageiro', 'Pastagens e Piquetes', 'Insumos com alertas de estoque', 'Calculadoras Agronômicas', 'Relatórios de silos e rebanho', 'Suporte prioritário'],
    cta: 'Assinar Starter',
    highlight: false,
    freeForever: false,
  },
  {
    name: 'Pro',
    priceMonthly: 74,
    priceAnnually: 740,
    desc: 'Para gestão completa da propriedade',
    features: ['Tudo do Starter', 'Gestão de lavouras', 'Gestão de Frota e Maquinário', 'Financeiro', 'Estoque de produtos', 'Planejamento de Compras', 'Calendário de Atividades', 'Todos os relatórios exportáveis (XLSX e PDF)'],
    cta: 'Assinar Pro',
    highlight: true,
    freeForever: false,
  },
  {
    name: 'Max',
    priceMonthly: 119,
    priceAnnually: 1190,
    desc: 'Para quem quer suporte técnico da equipe GestSilo',
    features: ['Tudo do Pro', 'Revisão agronômica bimestral com o fundador — analise dados e tire dúvidas técnicas', 'Histórico de assessoria no sistema', 'Resposta em até 4h úteis', 'Acesso antecipado a novas funcionalidades'],
    cta: 'Assinar Max',
    highlight: false,
    freeForever: false,
  },
];

// ===== MODAL — Suporte =====
export const SUPORTE_CONTATOS = [
  { title: 'E-mail', desc: 'Para dúvidas gerais, bugs e solicitações.', contact: 'gestsilo.app@gmail.com', href: 'mailto:gestsilo.app@gmail.com', label: 'Enviar e-mail', badge: 'Resposta em até 24h' },
  { title: 'WhatsApp', desc: 'Atendimento rápido para problemas urgentes.', contact: '+55 (31) 99087-5346', href: 'https://wa.me/5531990875346', label: 'Abrir WhatsApp', badge: 'Seg–Sex, 8h–18h' },
  { title: 'Telefone', desc: 'Suporte por voz para situações críticas.', contact: '+55 (31) 99087-5346', href: 'tel:+5531990875346', label: 'Ligar agora', badge: 'Seg–Sex, 8h–18h' },
];

export const SUPORTE_FAQ = [
  { q: 'O aplicativo funciona sem internet?', a: 'Sim. O GestSilo é um PWA com suporte offline. Operações são salvas localmente e sincronizadas ao reconectar.' },
  { q: 'Como adicionar um operador ou visualizador?', a: 'Em Configurações → Usuários e Acessos, clique em "Convidar Usuário" e informe o e-mail e o perfil desejado.' },
  { q: 'Os meus dados estão seguros?', a: 'Sim. Usamos criptografia em trânsito e em repouso, isolamento total entre fazendas via RLS e backups automáticos semanais.' },
  { q: 'Posso mudar de plano depois?', a: 'Sim. Upgrade é imediato e sem perda de dados. No downgrade, nenhum dado é excluído — registros excedentes são arquivados e reativados automaticamente se você voltar ao plano anterior.' },
];

// ===== MODAL — Valores =====
export const VALORES = [
  {
    title: 'Proximidade com o produtor',
    desc: 'Cada funcionalidade nasce de uma necessidade real, a partir da realidade de uma operação, não de uma hipótese de escritório.',
  },
  {
    title: 'Precisão e confiabilidade',
    desc: 'Dados errados custam caro na fazenda. Priorizamos a exatidão de cada cálculo, a integridade de cada registro e a consistência de cada relatório.',
  },
  {
    title: 'Simplicidade sem superficialidade',
    desc: 'Fácil de usar, sem abrir mão da robustez técnica. Intuitivo para o operador de campo e robusto para o administrador da fazenda.',
  },
  {
    title: 'Compromisso com o campo brasileiro',
    desc: 'Acreditamos que o agronegócio brasileiro é estratégico para o país. Nosso trabalho é fortalecer quem está na base dessa cadeia — o produtor rural.',
  },
  {
    title: 'Melhoria contínua',
    desc: 'O campo evolui. Em nossa plataforma inovamos sem atrapalhar a estabilidade do que já funciona.',
  },
];

// ===== MODAL — Privacidade =====
export const PRIVACIDADE_SECOES = [
  { h: '1. Coleta de dados', p: 'O GestSilo coleta apenas os dados necessários para a prestação do serviço, como nome, e-mail, dados da fazenda e informações operacionais inseridas pelo usuário, incluindo registros de silos, insumos, financeiro, rebanho, pastagens, talhões e demais módulos da plataforma. Não realizamos monitoramento de comportamento fora do ambiente da plataforma nem coleta de localização em segundo plano.' },
  { h: '2. Uso dos dados', p: 'Os dados coletados são utilizados exclusivamente para viabilizar o funcionamento da plataforma, prestar suporte ao usuário, melhorar a experiência de uso e cumprir obrigações legais. Não compartilhamos informações pessoais com terceiros sem base legal adequada ou consentimento do titular, exceto quando necessário para cumprimento de obrigação legal, regulatória ou ordem judicial.' },
  { h: '3. Armazenamento e segurança', p: 'Adotamos medidas técnicas e administrativas razoáveis para proteger os dados contra acesso não autorizado, perda, alteração, divulgação ou destruição. As informações trafegam por conexão segura e são armazenadas em infraestrutura de terceiros contratados para hospedagem e banco de dados, com controles de segurança compatíveis com boas práticas de mercado.' },
  { h: '4. Isolamento entre fazendas', p: 'Os dados de cada fazenda são tratados de forma segregada, com controles de acesso que impedem a visualização indevida de informações de outras propriedades. O acesso aos dados é limitado conforme o perfil do usuário e as permissões associadas à sua conta.' },
  { h: '5. Direitos do usuário (LGPD)', p: 'Em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018), você pode solicitar, a qualquer momento, acesso aos seus dados, correção de informações incorretas, exclusão da conta e dos dados pessoais quando aplicável, revogação do consentimento e demais direitos previstos em lei. Para exercer seus direitos, entre em contato pelo e-mail gestsilo.app@gmail.com.' },
  { h: '6. Cookies', p: 'Utilizamos apenas cookies estritamente necessários para autenticação, manutenção de sessão e funcionamento da plataforma. Não utilizamos cookies de publicidade, rastreamento comportamental ou análise de terceiros.' },
  { h: '7. Contato', p: 'Se tiver dúvidas sobre esta Política de Privacidade, entre em contato pelo e-mail gestsilo.app@gmail.com ou pelo WhatsApp (31) 99087-5346.' },
];

// ===== MODAL — Termos =====
export const TERMOS_SECOES = [
  { h: '1. Aceitação dos termos', p: 'Ao acessar ou utilizar o GestSilo, você declara que leu, compreendeu e concorda com estes Termos de Uso. Caso não concorde com qualquer disposição, não utilize a plataforma.' },
  { h: '2. Descrição do serviço', p: 'O GestSilo é uma plataforma SaaS de gestão agropecuária desenvolvida para auxiliar produtores rurais na organização e no controle de informações operacionais, incluindo silos, talhões, rebanho, pastagens, insumos, mão de obra, frota, financeiro e outros módulos relacionados à gestão da propriedade.' },
  { h: '3. Conta de usuário', p: 'O usuário é responsável pela guarda, sigilo e uso adequado de suas credenciais de acesso, bem como por todas as atividades realizadas em sua conta. Em caso de uso não autorizado ou suspeita de violação de segurança, o usuário deve comunicar o GestSilo imediatamente pelo e-mail gestsilo.app@gmail.com.' },
  { h: '4. Uso aceitável', p: 'É proibido utilizar a plataforma para fins ilegais, fraudulentos ou abusivos, incluindo tentativas de acesso indevido a dados de terceiros, engenharia reversa, disseminação de conteúdo malicioso, violação de segurança, inserção de dados falsos de forma intencional ou qualquer atividade que comprometa a integridade do serviço ou de outros usuários.' },
  { h: '5. Propriedade intelectual', p: 'Todo o conteúdo, código, design, identidade visual, marca e elementos proprietários da plataforma são de titularidade exclusiva do GestSilo ou de seus licenciantes.Os dados inseridos pelo usuário permanecem vinculados à sua conta e à sua operação, e o GestSilo poderá tratá-los apenas na medida necessária para prestação do serviço, suporte técnico, segurança, cumprimento legal e funcionalidades contratadas.' },
  { h: '6. Disponibilidade do serviço', p: 'O GestSilo busca manter a plataforma disponível de forma contínua, mas não garante funcionamento ininterrupto. Poderão ocorrer indisponibilidades temporárias por manutenções, atualizações, falhas de terceiros, caso fortuito, força maior ou eventos fora do controle razoável do GestSilo. O serviço é fornecido sem garantia de resultado econômico específico.' },
  { h: '7. Assinaturas, planos pagos, cancelamento e exclusão de dados', p: 'O acesso a determinadas funcionalidades do GestSilo poderá depender da contratação de planos pagos ou assinaturas, com cobrança mensal e renovação automática, conforme a modalidade escolhida no momento da contratação. O usuário será informado de forma clara sobre valores, periodicidade, forma de pagamento, renovação automática e demais condições aplicáveis. O cancelamento da assinatura poderá ser solicitado a qualquer momento. Quando ocorrer durante um ciclo já pago, o acesso às funcionalidades contratadas permanecerá válido até o fim do período mensal vigente, sem novas cobranças após a data do cancelamento, salvo disposição expressa em contrário. Nos casos aplicáveis por lei, o usuário poderá exercer o direito de arrependimento em até 7 (sete) dias corridos contados da contratação, com reembolso integral dos valores pagos, observadas as regras legais e o meio de contratação utilizado. Após o período de 7 dias, valores já pagos referentes ao ciclo mensal em andamento não serão reembolsados em cancelamentos voluntários fora das hipóteses legais ou de previsão expressa em oferta, contrato específico ou exigência legal aplicável. Após o encerramento da conta ou da assinatura, os dados poderão permanecer disponíveis por um período razoável para exportação, quando aplicável, e serão eliminados, anonimizados ou mantidos apenas pelo tempo necessário para cumprimento de obrigações legais, regulatórias, de segurança, auditoria e prevenção a fraudes. Em caso de inadimplência ou falha no pagamento, o GestSilo poderá suspender ou limitar o acesso às funcionalidades pagas até a regularização da cobrança.' },
  { h: '8. Alterações nos termos', p: 'O GestSilo poderá alterar estes Termos de Uso a qualquer momento para refletir mudanças legais, técnicas ou operacionais. Quando houver alteração relevante, o usuário será comunicado por meio adequado. O uso contínuo da plataforma após a publicação da nova versão será interpretado como aceite dos termos atualizados.' },
  { h: '9. Foro e lei aplicável', p: 'Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de Belo Horizonte/MG, com renúncia a qualquer outro, por mais privilegiado que seja, para dirimir eventuais controvérsias decorrentes destes termos, salvo disposição legal em sentido diverso.' },
];
