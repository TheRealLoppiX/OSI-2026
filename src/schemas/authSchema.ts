import { z } from "zod";

export const cadastroSchema = z.object({
  nome: z.string().min(2, "Insira seu nome completo"),
  email: z.string().email("Insira um e-mail válido"),
  usuario: z.string().min(3, "O nome de usuário deve ter pelo menos 3 caracteres"),
  instituicao: z.string().min(2, "Insira uma instituição válida"),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

export type CadastroInput = z.infer<typeof cadastroSchema>;
