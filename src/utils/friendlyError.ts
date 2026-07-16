// Traduz erros técnicos (rede, Supabase, Storage) para mensagens que o
// usuário final consegue entender e agir, em vez de repassar error.message cru.
const PADROES: { teste: RegExp; mensagem: string }[] = [
  { teste: /network request failed|failed to fetch/i, mensagem: "Sem conexão com a internet. Verifique sua rede e tente novamente." },
  { teste: /jwt expired|invalid.*token|refresh_token/i, mensagem: "Sua sessão expirou. Saia e entre novamente." },
  { teste: /row level security|rls|policy/i, mensagem: "Você não tem permissão para realizar essa ação." },
  { teste: /duplicate key|already exists|unique constraint/i, mensagem: "Esse registro já existe." },
  { teste: /timeout/i, mensagem: "A operação demorou demais para responder. Tente novamente." },
];

export function friendlyError(error: unknown, fallback: string): string {
  const bruto = error instanceof Error ? error.message : String(error ?? "");
  const encontrado = PADROES.find((p) => p.teste.test(bruto));
  return encontrado ? encontrado.mensagem : bruto || fallback;
}
