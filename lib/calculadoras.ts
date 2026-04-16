/**
 * Barrel export do módulo de calculadoras agrônomicas.
 * Re-exporta todos os tipos, funções e dados das subpastas.
 * Fonte: SPEC-calculadoras.md v1.1
 *
 * Backward compatibility: Este arquivo mantém todos os imports funcionando
 * como antes (importações legadas de @/lib/calculadoras continuam válidas).
 */

// Tipos
export * from './calculadoras/tipos-calculadoras';

// Funções de cálculo
export * from './calculadoras/calagem';
export * from './calculadoras/npk';

// Dados hardcoded
export * from './calculadoras/fertilizantes';
export * from './calculadoras/smp-tabela';
