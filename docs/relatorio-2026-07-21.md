# Relatório de atividades — 17/07/2026 a 21/07/2026

Período coberto: sexta-feira 17/07/2026 até hoje, terça-feira 21/07/2026.

## Resumo

| Data | O que aconteceu |
|---|---|
| 17–18/07 | (sem commits no repositório neste intervalo) |
| 19/07 | Diagnóstico e correção dos 4 bugs do relatório de QA do Bruno (build 2.1) |
| 19/07 | Bump de versão do app para 1.1 |
| 21/07 | Teste em device confirmado pelo usuário; heurística 7 (flexibilidade/eficiência) implementada; bug novo achado no teste ("object Object" ao vincular questão a simulado) investigado e corrigido na raiz; varredura de bugs em todo o app; auditoria de RLS no Supabase; commit, push e novo build EAS disparado |

---

## 19/07/2026 — Bugs do QA (Bruno)

Bruno (QA do time) rodou 31 casos de teste na build OSI-APP 2.1 em dois devices Android (Redmi Note 9C e LG K11+): 27 pass, 2 conditional pass, 2 fail, 4 bugs abertos.

**Causa raiz comum:** o app nunca autentica via Supabase Auth de verdade — o login é customizado contra as tabelas `usuarios`/`docentes` — então toda chamada ao banco roda como o papel `anon`. Várias policies de RLS assumiam `auth.uid()` preenchido, o que nunca acontece nessa arquitetura.

- **BUG-001** (Alta): alunos continuavam vinculados após excluir a instituição. Corrigido com um trigger no banco (`prevent_delete_instituicao_vinculada`) que bloqueia a exclusão de instituição com alunos vinculados, além da checagem que já existia no app.
- **BUG-002** (Média): botão voltar na geração de simulado por IA redirecionava para o último simulado feito. Corrigido trocando `router.back()`/`router.replace()` por `router.dismissTo()` em `gerador.tsx` e `simulado.tsx`, evitando telas antigas presas na pilha de navegação.
- **BUG-003** (Alta): erro ao cadastrar questão avulsa no Banco de Questões. Causa: a única policy de escrita em `questoes` exigia `auth.uid()` (sempre nulo). Corrigido com uma policy `ALL` aberta para `anon`/`authenticated`.
- **BUG-004** (Alta): perfil de aluno não era removido ao confirmar exclusão. Causa: não existia nenhuma policy de `DELETE` em `usuarios` — o delete "funcionava" sem erro mas não apagava nada. Corrigido com a policy de `DELETE` faltante, e o código de `usuarios.tsx` passou a checar se o delete realmente afetou alguma linha antes de reportar sucesso.

Os 4 bugs foram corrigidos no código (commit `3d91f0f`) e no banco (aplicado manualmente pelo usuário no SQL Editor do Supabase Studio, confirmado via query somente-leitura). Versão bumpada para **1.1** (commit `01f1d20`).

---

## 21/07/2026 — Teste em device, heurística 7, bug novo e varredura geral

### Teste em device confirmado
O usuário validou em device real as correções dos 4 bugs do Bruno e a rodada anterior de usabilidade (heurísticas de Nielsen 4, 5, 6, 8, 9, 10 — diálogos temáticos, mensagens de erro amigáveis, acessibilidade, onboarding/FAQ). Durante esse teste, apareceu um bug novo.

### Bug novo: "object Object" ao vincular questão a simulado
**Sintoma:** ao tentar adicionar uma questão já cadastrada a um simulado já criado, a tela mostrava o erro literal `"object Object"`.

**Investigação em duas camadas:**
1. `src/utils/friendlyError.ts` só extraía `.message` de erros `instanceof Error`. Erros do Supabase (`PostgrestError`, `AuthError`) são objetos simples, não instâncias de `Error` — caíam num `String(error)` genérico que produz `"[object Object]"`. Esse bug afetava as 14 telas do app que usam essa função, não só essa tela.
2. Com a mensagem de erro corrigida, veio à tona a causa raiz real: **`simulados.questoes_ids` era uma coluna `int4[]` (array de inteiros) no banco, mas `questoes.id` é `uuid`.** O app tentava gravar UUIDs num array de inteiros, e o Postgres rejeitava com erro de tipo. Como todos os simulados existentes tinham `questoes_ids` vazio, essa funcionalidade nunca tinha funcionado de ponta a ponta.

**Correções aplicadas:**
- `friendlyError.ts` passou a extrair `.message` de qualquer objeto que o tenha, não só de `instanceof Error`.
- Migração de schema no Supabase: `simulados.questoes_ids` convertido de `int4[]` para `uuid[]` (migração segura, sem dado real para converter).
- `admin/gerenciar.tsx`: estado `questoesSelecionadas` e `handleToggleSelect` migrados de `number[]` para `string[]`, batendo com o tipo real de `questoes.id`.

### Heurística 7 — flexibilidade e eficiência de uso
Único item da meta "5/5 nas 10 heurísticas de Nielsen" que ainda não tinha sido trabalhado:
- `admin/gerenciar.tsx`: busca por enunciado/matéria/dificuldade no modal "Vincular Questões", com atalho para selecionar/desmarcar em lote todos os resultados filtrados.
- `admin/usuarios.tsx`: busca por usuário/nome/instituição na lista de alunos, e modo de seleção múltipla (toque longo) com exclusão em lote — antes só dava para excluir um aluno por vez.

### Varredura de bugs em todo o app
A pedido do usuário, foi feita uma varredura completa em `app/**` e `src/**` procurando bugs de correção (não estilo). Achados e corrigidos:
- **`src/services/auth.ts`** (`adicionarXP`, `salvarTentativa`, `atualizarStreak`): as três funções engoliam qualquer erro só com `console.error`, sem relançar — o `catch` em `simulado.tsx` que deveria avisar "Não foi possível salvar seu XP/histórico" nunca era executado. Agora relançam o erro.
- **`admin/gerenciar.tsx`**: `handleDeletarQuestao` e `handleDeletarSimulado` não checavam se o `delete()` realmente afetou alguma linha (mesma classe do BUG-004). `handleSalvarQuestoesNoSimulado` checava erro mas não linhas afetadas. Todos corrigidos no mesmo padrão já usado em `usuarios.tsx`/`instituicoes.tsx`.
- **`app/_layout.tsx`**: o guard de autenticação não incluía as rotas `/ajuda` e `/webview` (destinos autenticados legítimos) na lista de "área restrita" — podia redirecionar o usuário de volta pra home nessas telas em certos cenários de restauração de sessão. Adicionadas à lista.
- **`app/(tabs)/perfil.tsx`**: upload de avatar não checava erro do `update()` do banco — se falhasse, o app mostrava "Sucesso!" mesmo sem persistir. Corrigido.
- **`app/tutor/gerador.tsx`**: havia uma pequena janela de corrida entre o toque no botão de gerar simulado por IA e o estado que o desabilita, permitindo um toque duplo rápido furar o cooldown de 1 geração/hora. Corrigido com um guard síncrono.
- **Sinalizado, não alterado:** `auth.ts` tem um fallback de comparação de senha em texto puro para contas antigas de teste, já documentado no código como intencional — fica registrado para uma futura limpeza de segurança, se fizer sentido.

### Auditoria de RLS no Supabase
Com acesso ao banco (token fornecido pelo usuário nesta sessão — **recomendo revogá-lo em Supabase → Account → Access Tokens**, mesma recomendação da sessão de 19/07), foi feita uma auditoria completa de `pg_tables`/`pg_policies`:
- `questoes`, `usuarios`: policies dos fixes de 19/07 seguem ativas.
- `simulados`: já tinha uma policy totalmente aberta — não era RLS que bloqueava o vínculo de questões (era o mismatch de tipo descrito acima).
- `instituicoes`, `tentativas`, `verificacao_email`: RLS desativado, sem restrição.
- `docentes`: policy aberta para todos os papéis.
- `notificacoes`: sem policy de update/delete para `anon`, mas é intencional — a escrita já passa pela Edge Function `marcar-notificacoes-lidas` (service role) por esse motivo exato.

Nenhuma lacuna de RLS adicional foi encontrada além do que já tinha sido corrigido.

### Verificação e entrega
- `npx tsc --noEmit` limpo em todas as etapas (fora dos erros pré-existentes das Edge Functions Deno, que não usam o mesmo runtime do app).
- Commit `b8e86ef` com todas as correções e melhorias desta sessão, enviado para `origin/master`.
- Build EAS (perfil `preview`, Android) disparado para o Bruno validar a nova rodada: [expo.dev/.../builds/a0bbbf35-9542-485c-952c-6959a1325535](https://expo.dev/accounts/therealloppix/projects/OSI-App/builds/a0bbbf35-9542-485c-952c-6959a1325535).

## Pendências

1. Revogar o token do Supabase usado nesta sessão.
2. Testar em device as mudanças desta sessão: vínculo de questão a simulado (primeira vez que deve funcionar de ponta a ponta), exclusão de questão/simulado, upload de avatar, geração por IA (double tap), navegação restaurando sessão em `/ajuda` e `/webview`.
3. Acompanhar o build EAS e enviar para o Bruno validar.
4. Heurística 2 (compatibilidade com o mundo real) segue sem trabalhar — depende de validação com usuários reais, não é algo que se resolve só codando.
