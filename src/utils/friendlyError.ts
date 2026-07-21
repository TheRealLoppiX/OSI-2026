// Traduz erros técnicos (rede, Supabase, Storage) para mensagens que o
// usuário final consegue entender e agir, em vez de repassar error.message cru.
const PADROES: { teste: RegExp; mensagem: string }[] = [
  { teste: /network request failed|failed to fetch/i, mensagem: "Sem conexão com a internet. Verifique sua rede e tente novamente." },
  { teste: /jwt expired|invalid.*token|refresh_token/i, mensagem: "Sua sessão expirou. Saia e entre novamente." },
  { teste: /row level security|rls|policy/i, mensagem: "Você não tem permissão para realizar essa ação." },
  { teste: /duplicate key|already exists|unique constraint/i, mensagem: "Esse registro já existe." },
  { teste: /timeout/i, mensagem: "A operação demorou demais para responder. Tente novamente." },
];

function extrairMensagem(error: unknown): string {
  if (error instanceof Error) return error.message;
  // Erros do Supabase (PostgrestError, AuthError, StorageError) são objetos
  // simples com .message, não instâncias de Error — sem isso, caem no
  // String(error) genérico e viram "[object Object]" pro usuário.
  if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
    return (error as any).message;
  }
  return String(error ?? "");
}

export function friendlyError(error: unknown, fallback: string): string {
  const bruto = extrairMensagem(error);
  const encontrado = PADROES.find((p) => p.teste.test(bruto));
  return encontrado ? encontrado.mensagem : bruto || fallback;
}
