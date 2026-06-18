import { describe, it, expect } from 'vitest';
import { calcularCustoColaborador } from '@/lib/utils';
import {
  tipoValorPadraoPorVinculo,
  vinculoEhMensal,
  labelTipoValor,
  sufixoTipoValor,
} from '@/lib/types/mao-de-obra';

describe('calcularCustoColaborador', () => {
  it('horas × hora', () => {
    expect(calcularCustoColaborador('horas', 4, 'hora', 25)).toBe(100);
  });

  it('dias × diaria', () => {
    expect(calcularCustoColaborador('dias', 2, 'diaria', 120)).toBe(240);
  });

  it('horas × diaria (converte para fração de diária)', () => {
    expect(calcularCustoColaborador('horas', 4, 'diaria', 160)).toBe(80); // 4/8 * 160
  });

  it('dias × hora (converte para horas)', () => {
    expect(calcularCustoColaborador('dias', 1, 'hora', 20)).toBe(160); // 1*8 * 20
  });

  it('mensal (CLT) nunca soma custo na atividade — sempre zero', () => {
    expect(calcularCustoColaborador('horas', 8, 'mensal', 3000)).toBe(0);
    expect(calcularCustoColaborador('dias', 5, 'mensal', 3000)).toBe(0);
  });
});

describe('helpers de vínculo', () => {
  it('CLT é mensal; demais são diária', () => {
    expect(tipoValorPadraoPorVinculo('CLT')).toBe('mensal');
    expect(tipoValorPadraoPorVinculo('Diarista')).toBe('diaria');
    expect(tipoValorPadraoPorVinculo('Empreiteiro')).toBe('diaria');
    expect(tipoValorPadraoPorVinculo('Familiar')).toBe('diaria');
  });

  it('vinculoEhMensal só é verdadeiro para CLT', () => {
    expect(vinculoEhMensal('CLT')).toBe(true);
    expect(vinculoEhMensal('Diarista')).toBe(false);
  });

  it('labelTipoValor', () => {
    expect(labelTipoValor('mensal')).toBe('Salário');
    expect(labelTipoValor('hora')).toBe('Por hora');
    expect(labelTipoValor('diaria')).toBe('Diária');
  });

  it('sufixoTipoValor', () => {
    expect(sufixoTipoValor('mensal')).toBe('mês');
    expect(sufixoTipoValor('hora')).toBe('h');
    expect(sufixoTipoValor('diaria')).toBe('dia');
  });
});
