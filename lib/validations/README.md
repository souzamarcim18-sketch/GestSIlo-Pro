# Padrão de Formulários — GestSilo

## Padrão Oficial (Padrão B)
Todos os formulários novos e refatorações devem usar:
- React Hook Form (useForm, Controller)
- Zod para schema de validação
- Componentes shadcn/ui: Form, FormField, FormItem, FormLabel, FormControl, FormMessage

## Estrutura obrigatória
1. Schema Zod em lib/validations/[modulo].ts
2. Componente de formulário usa useForm com zodResolver
3. Erros exibidos via <FormMessage /> — nunca <p className="text-red-*">

## Features com Padrão A (migração pendente)
- SiloForm → migrar quando houver sprint de silos
- TalhaoForm → migrar quando houver sprint de talhões
- InsumoForm → migrar quando houver sprint de insumos
