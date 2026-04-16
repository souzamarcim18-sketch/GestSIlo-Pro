/**
 * Calculadora NPK - Modo Simples e Otimizador Combinatório
 * Implementa sistema linear para 1, 2 e 3 fertilizantes
 * Fonte: SPEC-calculadoras.md v1.1
 */

import {
  NPKInput,
  NPKResult,
  Fertilizante,
  FertilizanteCombinacao,
  FertilizanteComDose,
} from './tipos-calculadoras';
import {
  getAllFertilizantes,
  getFertilizanteById,
  precoKg,
} from './fertilizantes';

// ========== MODO SIMPLES (atual) ==========
/**
 * Cálculo simples: nutriente limitante com 1 fertilizante
 * Mantém compatibilidade com implementação atual (aceita objetos com teores)
 */
export function calcularNPK(
  data: NPKInput,
  fertilizante: Fertilizante | { nome: string; teor_n_percent?: number | null; teor_p_percent?: number | null; teor_k_percent?: number | null } | null
): NPKResult | null {
  if (!fertilizante || !data.area) return null;

  const valN = parseFloat(data.n_nec) || 0;
  const valP = parseFloat(data.p_nec) || 0;
  const valK = parseFloat(data.k_nec) || 0;
  const valArea = parseFloat(data.area) || 0;

  if (valArea <= 0) return null;

  const teorN = fertilizante.teor_n_percent || 0;
  const teorP = fertilizante.teor_p_percent || 0;
  const teorK = fertilizante.teor_k_percent || 0;

  // Doses por nutriente
  const doses = [
    teorN > 0 ? valN / (teorN / 100) : 0,
    teorP > 0 ? valP / (teorP / 100) : 0,
    teorK > 0 ? valK / (teorK / 100) : 0,
  ];

  const dosePorHa = Math.max(...doses);
  const total = (dosePorHa * valArea) / 1000;

  return {
    modo: 'simples',
    dosePorHa,
    total,
    fertNome: fertilizante.nome,
  };
}

// ========== MODO OTIMIZADO (novo) ==========
/**
 * Otimizador combinatório: testa 1, 2 e 3 fertilizantes
 * Retorna top 5 opções mais baratas que atendem margem de erro
 */
export function otimizarNPK(
  data: NPKInput
): { top5: FertilizanteCombinacao[]; melhorOpcao: FertilizanteCombinacao } | null {
  const n_nec = parseFloat(data.n_nec) || 0;
  const p_nec = parseFloat(data.p_nec) || 0;
  const k_nec = parseFloat(data.k_nec) || 0;
  const area = parseFloat(data.area) || 0;

  if (area <= 0 || (n_nec === 0 && p_nec === 0 && k_nec === 0)) return null;

  const fertilizantes = data.fertilizantes_selecionados
    ? getAllFertilizantes().filter((f) =>
        data.fertilizantes_selecionados!.includes(f.id)
      )
    : getAllFertilizantes();

  if (fertilizantes.length === 0) return null;

  const opcoes: FertilizanteCombinacao[] = [];

  // ===== COMBINAÇÕES DE 1 FERTILIZANTE =====
  for (const fert of fertilizantes) {
    const combinacao = testarCombinacao1Fert(
      fert,
      n_nec,
      p_nec,
      k_nec,
      area
    );
    if (combinacao && combinacao.viavel) {
      opcoes.push(combinacao);
    }
  }

  // ===== COMBINAÇÕES DE 2 FERTILIZANTES =====
  for (let i = 0; i < fertilizantes.length; i++) {
    for (let j = i + 1; j < fertilizantes.length; j++) {
      const combinacao = testarCombinacao2Ferts(
        fertilizantes[i],
        fertilizantes[j],
        n_nec,
        p_nec,
        k_nec,
        area
      );
      if (combinacao && combinacao.viavel) {
        opcoes.push(combinacao);
      }
    }
  }

  // ===== COMBINAÇÕES DE 3 FERTILIZANTES =====
  for (let i = 0; i < fertilizantes.length; i++) {
    for (let j = i + 1; j < fertilizantes.length; j++) {
      for (let k = j + 1; k < fertilizantes.length; k++) {
        const combinacao = testarCombinacao3Ferts(
          fertilizantes[i],
          fertilizantes[j],
          fertilizantes[k],
          n_nec,
          p_nec,
          k_nec,
          area
        );
        if (combinacao && combinacao.viavel) {
          opcoes.push(combinacao);
        }
      }
    }
  }

  // Ordenar por custo e retornar top 5
  const top5 = opcoes
    .sort((a, b) => a.custoTotal_r_ha - b.custoTotal_r_ha)
    .slice(0, 5);

  if (top5.length === 0) return null;

  return { top5, melhorOpcao: top5[0] };
}

// ========== RESOLVEDORES DE SISTEMA LINEAR ==========

/**
 * Testa 1 fertilizante: solução trivial
 */
function testarCombinacao1Fert(
  fert: Fertilizante,
  n_nec: number,
  p_nec: number,
  k_nec: number,
  area: number
): FertilizanteCombinacao | null {
  const n = fert.teor_n_percent / 100;
  const p = fert.teor_p_percent / 100;
  const k = fert.teor_k_percent / 100;

  // Se todos os teores são zero, inviável
  if (n === 0 && p === 0 && k === 0) return null;

  // Encontrar o nutriente limitante (maior dose necessária)
  const doses = [
    n > 0 ? n_nec / n : 0,
    p > 0 ? p_nec / p : 0,
    k > 0 ? k_nec / k : 0,
  ].filter((d) => d > 0);

  if (doses.length === 0) return null;

  const dose_kg_ha = Math.max(...doses);

  // Validar que dose não é inviável
  if (dose_kg_ha < 0 || dose_kg_ha > 2000) return null;

  // Validar margem de erro: fornecer >= necessário, com tolerância de até +15%
  const n_fornecido = dose_kg_ha * n;
  const p_fornecido = dose_kg_ha * p;
  const k_fornecido = dose_kg_ha * k;

  const margem_erro_n =
    n_nec > 0 ? ((n_fornecido - n_nec) / n_nec) * 100 : 0;
  const margem_erro_p =
    p_nec > 0 ? ((p_fornecido - p_nec) / p_nec) * 100 : 0;
  const margem_erro_k =
    k_nec > 0 ? ((k_fornecido - k_nec) / k_nec) * 100 : 0;

  // Regra: 0% (exato) até +15% (máximo), nunca abaixo
  const viavel =
    margem_erro_n >= 0 &&
    margem_erro_n <= 15 &&
    margem_erro_p >= 0 &&
    margem_erro_p <= 15 &&
    margem_erro_k >= 0 &&
    margem_erro_k <= 15;

  if (!viavel) return null;

  const preco_r_kg = precoKg(fert.preco_saco_50kg);
  const custoTotal_r_ha = dose_kg_ha * preco_r_kg;

  return {
    fertilizantes: [
      {
        fertilizante: fert,
        dose_kg_ha,
        sacos_por_ha: Math.ceil(dose_kg_ha / 50),
        total_sacos: Math.ceil(dose_kg_ha / 50) * area,
        custo_por_ha: custoTotal_r_ha,
      },
    ],
    custoTotal_r_ha,
    nutrientes_fornecidos: {
      n: n_fornecido,
      p: p_fornecido,
      k: k_fornecido,
    },
    margemErro: {
      n_percent: margem_erro_n,
      p_percent: margem_erro_p,
      k_percent: margem_erro_k,
    },
    viavel: true,
  };
}

/**
 * Testa 2 fertilizantes: sistema linear 2x2
 * Testa os 3 pares possíveis (N+P, N+K, P+K) e retorna melhor resultado
 */
function testarCombinacao2Ferts(
  fert1: Fertilizante,
  fert2: Fertilizante,
  n_nec: number,
  p_nec: number,
  k_nec: number,
  area: number
): FertilizanteCombinacao | null {
  const n1 = fert1.teor_n_percent / 100;
  const p1 = fert1.teor_p_percent / 100;
  const k1 = fert1.teor_k_percent / 100;

  const n2 = fert2.teor_n_percent / 100;
  const p2 = fert2.teor_p_percent / 100;
  const k2 = fert2.teor_k_percent / 100;

  const resultados: FertilizanteCombinacao[] = [];

  // Pares de equações a testar: (nutriente1, nutriente2)
  const pares: Array<{
    a1: number;
    a2: number;
    a_nec: number;
    c1: number;
    c2: number;
    c_nec: number;
    nutrientes: string; // para debug
  }> = [
    {
      a1: n1,
      a2: n2,
      a_nec: n_nec,
      c1: p1,
      c2: p2,
      c_nec: p_nec,
      nutrientes: 'N+P',
    },
    {
      a1: n1,
      a2: n2,
      a_nec: n_nec,
      c1: k1,
      c2: k2,
      c_nec: k_nec,
      nutrientes: 'N+K',
    },
    {
      a1: p1,
      a2: p2,
      a_nec: p_nec,
      c1: k1,
      c2: k2,
      c_nec: k_nec,
      nutrientes: 'P+K',
    },
  ];

  for (const par of pares) {
    // Resolver: a1*x + a2*y = a_nec
    //           c1*x + c2*y = c_nec
    const det = par.a1 * par.c2 - par.a2 * par.c1;
    if (Math.abs(det) < 0.001) continue; // Sistema singular

    const x = (par.a_nec * par.c2 - par.a2 * par.c_nec) / det;
    const y = (par.a1 * par.c_nec - par.a_nec * par.c1) / det;

    if (x < 0 || y < 0 || x > 2000 || y > 2000) continue; // Doses inviáveis

    // Calcular nutrientes fornecidos
    const n_fornecido = n1 * x + n2 * y;
    const p_fornecido = p1 * x + p2 * y;
    const k_fornecido = k1 * x + k2 * y;

    // Validar margem de erro: 0% a +15% para TODOS os nutrientes
    const margem_erro_n =
      n_nec > 0 ? ((n_fornecido - n_nec) / n_nec) * 100 : 0;
    const margem_erro_p =
      p_nec > 0 ? ((p_fornecido - p_nec) / p_nec) * 100 : 0;
    const margem_erro_k =
      k_nec > 0 ? ((k_fornecido - k_nec) / k_nec) * 100 : 0;

    const viavel =
      margem_erro_n >= 0 &&
      margem_erro_n <= 15 &&
      margem_erro_p >= 0 &&
      margem_erro_p <= 15 &&
      margem_erro_k >= 0 &&
      margem_erro_k <= 15;

    if (!viavel) continue;

    const custoTotal_r_ha =
      x * precoKg(fert1.preco_saco_50kg) + y * precoKg(fert2.preco_saco_50kg);

    resultados.push({
      fertilizantes: [
        {
          fertilizante: fert1,
          dose_kg_ha: x,
          sacos_por_ha: Math.ceil(x / 50),
          total_sacos: Math.ceil(x / 50) * area,
          custo_por_ha: x * precoKg(fert1.preco_saco_50kg),
        },
        {
          fertilizante: fert2,
          dose_kg_ha: y,
          sacos_por_ha: Math.ceil(y / 50),
          total_sacos: Math.ceil(y / 50) * area,
          custo_por_ha: y * precoKg(fert2.preco_saco_50kg),
        },
      ],
      custoTotal_r_ha,
      nutrientes_fornecidos: { n: n_fornecido, p: p_fornecido, k: k_fornecido },
      margemErro: {
        n_percent: margem_erro_n,
        p_percent: margem_erro_p,
        k_percent: margem_erro_k,
      },
      viavel: true,
    });
  }

  // Retornar o de menor custo
  return resultados.length > 0
    ? resultados.sort((a, b) => a.custoTotal_r_ha - b.custoTotal_r_ha)[0]
    : null;
}

/**
 * Testa 3 fertilizantes: sistema linear 3x3 (Cramer)
 */
function testarCombinacao3Ferts(
  fert1: Fertilizante,
  fert2: Fertilizante,
  fert3: Fertilizante,
  n_nec: number,
  p_nec: number,
  k_nec: number,
  area: number
): FertilizanteCombinacao | null {
  const n1 = fert1.teor_n_percent / 100;
  const p1 = fert1.teor_p_percent / 100;
  const k1 = fert1.teor_k_percent / 100;

  const n2 = fert2.teor_n_percent / 100;
  const p2 = fert2.teor_p_percent / 100;
  const k2 = fert2.teor_k_percent / 100;

  const n3 = fert3.teor_n_percent / 100;
  const p3 = fert3.teor_p_percent / 100;
  const k3 = fert3.teor_k_percent / 100;

  // Matriz 3x3: [n1 n2 n3] [x]   [n_nec]
  //             [p1 p2 p3] [y] = [p_nec]
  //             [k1 k2 k3] [z]   [k_nec]

  // Det(A)
  const detA =
    n1 * (p2 * k3 - p3 * k2) -
    n2 * (p1 * k3 - p3 * k1) +
    n3 * (p1 * k2 - p2 * k1);

  if (Math.abs(detA) < 0.001) return null; // Sistema singular

  // Regra de Cramer
  const detX =
    n_nec * (p2 * k3 - p3 * k2) -
    n2 * (p_nec * k3 - p3 * k_nec) +
    n3 * (p_nec * k2 - p2 * k_nec);

  const detY =
    n1 * (p_nec * k3 - p3 * k_nec) -
    n_nec * (p1 * k3 - p3 * k1) +
    n3 * (p1 * k_nec - p_nec * k1);

  const detZ =
    n1 * (p2 * k_nec - p_nec * k2) -
    n2 * (p1 * k_nec - p_nec * k1) +
    n_nec * (p1 * k2 - p2 * k1);

  const x = detX / detA;
  const y = detY / detA;
  const z = detZ / detA;

  if (x < 0 || y < 0 || z < 0 || x > 2000 || y > 2000 || z > 2000)
    return null;

  // Validar margem de erro: 0% a +15%
  const n_fornecido = n1 * x + n2 * y + n3 * z;
  const p_fornecido = p1 * x + p2 * y + p3 * z;
  const k_fornecido = k1 * x + k2 * y + k3 * z;

  const margem_erro_n =
    n_nec > 0 ? ((n_fornecido - n_nec) / n_nec) * 100 : 0;
  const margem_erro_p =
    p_nec > 0 ? ((p_fornecido - p_nec) / p_nec) * 100 : 0;
  const margem_erro_k =
    k_nec > 0 ? ((k_fornecido - k_nec) / k_nec) * 100 : 0;

  const viavel =
    margem_erro_n >= 0 &&
    margem_erro_n <= 15 &&
    margem_erro_p >= 0 &&
    margem_erro_p <= 15 &&
    margem_erro_k >= 0 &&
    margem_erro_k <= 15;

  if (!viavel) return null;

  const preco1_r_kg = precoKg(fert1.preco_saco_50kg);
  const preco2_r_kg = precoKg(fert2.preco_saco_50kg);
  const preco3_r_kg = precoKg(fert3.preco_saco_50kg);

  const custoTotal_r_ha =
    x * preco1_r_kg + y * preco2_r_kg + z * preco3_r_kg;

  return {
    fertilizantes: [
      {
        fertilizante: fert1,
        dose_kg_ha: x,
        sacos_por_ha: Math.ceil(x / 50),
        total_sacos: Math.ceil(x / 50) * area,
        custo_por_ha: x * preco1_r_kg,
      },
      {
        fertilizante: fert2,
        dose_kg_ha: y,
        sacos_por_ha: Math.ceil(y / 50),
        total_sacos: Math.ceil(y / 50) * area,
        custo_por_ha: y * preco2_r_kg,
      },
      {
        fertilizante: fert3,
        dose_kg_ha: z,
        sacos_por_ha: Math.ceil(z / 50),
        total_sacos: Math.ceil(z / 50) * area,
        custo_por_ha: z * preco3_r_kg,
      },
    ],
    custoTotal_r_ha,
    nutrientes_fornecidos: { n: n_fornecido, p: p_fornecido, k: k_fornecido },
    margemErro: {
      n_percent: margem_erro_n,
      p_percent: margem_erro_p,
      k_percent: margem_erro_k,
    },
    viavel: true,
  };
}
