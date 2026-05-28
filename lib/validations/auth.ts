import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nome: z.string().min(2).max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  perfil: z.enum(['Operador', 'Visualizador']),
});
