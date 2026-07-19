# Plano de Ação — Bugs do Relatório de QA (Bruno, 16/07/2026)

> Baseado no relatório de testes de QA (build OSI-APP 2.1, 31 casos executados,
> 27 pass / 2 conditional pass / 2 fail). Este documento investiga a causa
> raiz de cada bug reportado (por leitura de código, sem acesso a
> device/emulador ou ao painel do Supabase neste ambiente) e propõe a correção.

## Priorização

| # | Bug | Severidade | Caso QA | Causa raiz | Confiança |
|---|-----|------------|---------|------------|-----------|
| 1 | BUG-003 — erro ao salvar questão no Banco de Questões | Alta | TF-015 | `simulado_id: null` no insert quando a questão não pertence a um simulado, combinado com política de RLS/constraint no Supabase | Alta |
| 2 | BUG-004 — perfil de aluno não é removido | Alta | TF-018 | RLS sem policy de `DELETE` para o client (que roda sempre como `anon`, pois o login é custom e não usa Supabase Auth) | Alta |
| 3 | BUG-001 — vínculo inválido após excluir instituição | Alta | TF-017 | Checagem client-side existe mas não é a única via de exclusão / não há garantia no banco (sem FK) | Média |
| 4 | BUG-002 — botão voltar redireciona pro último simulado | Média | TF-005 | Mistura de `push`/`replace` entre grupos de rota deixa telas de simulado antigas na pilha de navegação | Média |

Sugestão de ordem: **3 → 2 → 1 → 4** (bugs de integridade/perda de dados primeiro,
UX de navegação por último).

---

## BUG-003 — Falha ao cadastrar questão no Banco de Questões (TF-015)

**Onde:** `app/admin/cadastrar-questao.tsx` (`salvarQuestao`, linha ~102) e
`app/admin/gerenciar.tsx` (linha 173, botão "Banco de Questões").

**Causa raiz:** quando a questão é criada a partir do atalho "Banco de
Questões" (`router.push("/admin/cadastrar-questao")`, **sem** parâmetro
`simuladoId`), o insert monta o payload com `simulado_id: simuladoId ? Number(simuladoId) : null`
→ envia `simulado_id: null`. Quando a questão é criada a partir de um
simulado específico (linhas 220 e 346 de `gerenciar.tsx`), `simuladoId` é
sempre passado. A importação em massa (`importar-questoes.tsx`) funciona
porque roda numa Edge Function (`importar-planilha`), que usa a service role
e não passa pelas mesmas regras. Isso bate exatamente com o sintoma: só a
criação **avulsa** (sem simulado) falha.

Duas causas possíveis, não excludentes:
1. A coluna `questoes.simulado_id` é `NOT NULL` (ou tem FK obrigatória) no
   banco — inserir `null` quebra a constraint.
2. Existe uma policy de RLS de `INSERT` na tabela `questoes` que exige
   `authenticated`, mas o app nunca autentica de fato via Supabase Auth (login
   é feito contra as tabelas `usuarios`/`docentes` — ver memória
   `usuarios-role-sem-coluna`), então todo insert roda como `anon` e é
   rejeitado pela policy.

**Correção proposta:**
1. Confirmar no Supabase Studio (Table Editor → `questoes` → colunas e RLS)
   se `simulado_id` é nullable e se existe policy de `INSERT` liberada para
   `anon` (ou para o papel que o app realmente usa).
2. Se `simulado_id` for obrigatório no banco por design, alterar para
   nullable (uma questão do banco geral não pertence a nenhum simulado
   específico — isso é esperado pelo próprio fluxo "Banco de Questões").
3. Se for RLS: ajustar a policy de `INSERT` em `questoes` para permitir o
   papel usado pelo client (provavelmente `anon`, dado o login custom) — o
   mesmo vale para `UPDATE` (edição de questão) se ainda não estiver coberto.
4. No app, capturar e logar o `error.code`/`error.message` bruto do Supabase
   (hoje `friendlyError` pode estar mascarando a mensagem real) para
   confirmar qual das duas causas é a verdadeira antes de decidir o fix no
   banco.

**Como validar:** cadastrar uma questão pelo atalho "Banco de Questões" (sem
vir de um simulado) e confirmar que salva sem erro; repetir a partir de um
simulado específico para garantir que não quebrou o outro fluxo.

---

## BUG-004 — Perfil de aluno não é excluído (TF-018)

**Onde:** `app/admin/usuarios.tsx` (`handleDelete`, linha ~81).

**Causa raiz (mesma família do BUG-003):** o app não usa Supabase Auth — o
login de aluno/docente é validado contra as tabelas `usuarios`/`docentes`
por fora do sistema de autenticação do Supabase (`role` nem existe como
coluna, é só um campo em memória — ver memória `usuarios-role-sem-coluna`).
Isso significa que **toda** chamada ao Supabase a partir do app roda sob o
papel `anon` da chave pública, nunca como um usuário "autenticado" de fato.

Isso explica um padrão clássico do Postgres/RLS: um `DELETE` cuja policy
(`USING`) não bate com o papel do client não gera erro — só afeta 0 linhas,
silenciosamente. O código atual não verifica quantas linhas foram afetadas:

```ts
const { error } = await supabase.from("usuarios").delete().eq("id", selectedUser.id);
if (!error) { setModalVisible(false); fetchUsers(); } // fecha o modal mesmo se 0 linhas foram apagadas
```

Isso bate exatamente com o sintoma relatado: nenhum erro aparece, o modal
fecha, mas o aluno continua no banco.

**Correção proposta:**
1. No Supabase Studio, checar as policies de `usuarios` para `DELETE` — must
   provavelmente não existe nenhuma, ou existe uma que exige `authenticated`.
   Criar/ajustar a policy para permitir exclusão pelo papel que o app
   realmente usa (`anon`), já que a autorização de "é docente/admin" é hoje
   controlada só na camada do app.
2. Reforçar o client: usar `.select()` encadeado no delete para saber quantas
   linhas foram de fato removidas, e mostrar erro se vier vazio:
   ```ts
   const { data, error } = await supabase.from("usuarios").delete().eq("id", selectedUser.id).select();
   if (error || !data?.length) {
     appAlert.alert("Erro", "Não foi possível excluir o aluno. Verifique as permissões.");
     return;
   }
   ```
   Isso evita que qualquer falha silenciosa futura (RLS ou não) engane o
   admin achando que a exclusão funcionou.
3. Considerar, a médio prazo, mover operações administrativas sensíveis
   (excluir aluno, excluir instituição) para Edge Functions com service role
   — mesmo padrão já usado em `importar-planilha` — em vez de depender de
   RLS aberta para `anon`, o que é mais seguro (evita que qualquer client com
   a anon key consiga apagar alunos direto).

**Como validar:** excluir um aluno de teste pela tela "Monitorar Alunos" e
confirmar (dando refresh) que ele realmente sumiu da lista e do banco.

---

## BUG-001 — Vínculo inválido após excluir instituição (TF-017, conditional pass)

**Onde:** `app/admin/instituicoes.tsx` (`handleDeletar`, linha ~55).

O código **já** verifica dependências antes de excluir:
```ts
const { count } = await supabase.from("usuarios").select("id", { count: "exact", head: true }).eq("instituicao", inst.nome);
if (count && count > 0) return appAlert.alert("Não é possível excluir", ...);
```
Como o QA marcou "conditional pass" (não "fail"), o bloqueio em si
provavelmente funciona no fluxo normal — o problema relatado
("alunos já vinculados continuam vinculados, permitindo vínculos inválidos")
sugere uma falha de **integridade no banco**, não necessariamente que o botão
deixe excluir com alunos vinculados. Hipóteses:

1. **Falta de garantia no banco**: essa checagem só existe no client. Se
   qualquer outro caminho apagar uma instituição sem passar por essa tela
   (ex.: painel do Supabase, um bug futuro, uma condição de corrida entre
   dois admins), nada impede alunos órfãos. Não há FK/trigger no banco
   garantindo a regra.
2. **Comparação por nome (texto livre)**: a checagem usa
   `.eq("instituicao", inst.nome)`. Se `usuarios.instituicao` for
   preenchido por texto livre em algum fluxo (ex.: cadastro de docente,
   ou quando `instituicoes.length === 0` em `usuarios.tsx`, que cai no
   `TextInput` livre em vez do picker), um valor com espaço/acentuação/
   maiúscula diferente do `nome` cadastrado faz o `count` vir `0` mesmo
   havendo alunos "vinculados" (visualmente), permitindo a exclusão.
3. Sem `.delete()` checar erro (linha 76: `await supabase.from("instituicoes").delete().eq("id", inst.id);` sem capturar `error`), qualquer falha
   silenciosa aqui também passa despercebida.

**Correção proposta:**
1. Adicionar uma constraint no banco (FK de `usuarios.instituicao_id` para
   `instituicoes.id`, se ainda não existir — hoje parece ser texto livre) ou,
   no mínimo, um trigger de `BEFORE DELETE` em `instituicoes` que rejeite a
   exclusão se houver `usuarios.instituicao = OLD.nome`. Isso garante a regra
   no banco, não só no app.
2. A médio prazo, migrar `usuarios.instituicao` de texto livre para uma FK
   (`instituicao_id`), eliminando o risco de mismatch por texto. Isso também
   resolve o problema de digitação livre em `usuarios.tsx` quando não há
   instituições cadastradas.
3. Adicionar tratamento de erro no `delete()` de `handleDeletar` (linha 76),
   igual ao padrão já usado para alunos/questões.
4. Rodar uma auditoria pontual: `select instituicao, count(*) from usuarios group by instituicao` comparado com `select nome from instituicoes`,
   para achar e corrigir alunos já órfãos hoje (dado histórico, não é algo
   que o código corrige sozinho).

**Como validar:** tentar excluir uma instituição com alunos vinculados
(deve bloquear com a mensagem atual) e, separadamente, no Supabase Studio,
confirmar que não há mais `usuarios.instituicao` apontando para nomes que
não existem em `instituicoes`.

---

## BUG-002 — Botão voltar redireciona para o último simulado (TF-005, conditional pass)

**Onde:** `app/tutor/gerador.tsx` (linha 81, `router.replace({ pathname: "/simulado", ... })`),
`app/(tabs)/simulado.tsx` (linha 395, `router.replace("/(tabs)/home")` e linha
341, `router.replace` na própria rota para "refazer erradas"), `app/(tabs)/escolher.tsx`
(linha 182, `router.push("/tutor/gerador")` a partir do botão flutuante OSIA).

**Causa raiz (hipótese, precisa confirmar em device):** a navegação entre
`escolher` → `gerador` → `simulado` → `home` mistura `push` e `replace` de
forma inconsistente entre grupos de rota (`(tabs)` vs `tutor/`), sem nunca
limpar o histórico da aba. O `router.replace` de `gerador.tsx` "salta" de uma
tela empilhada (`tutor/gerador`, fora do grupo `(tabs)`) direto para uma rota
dentro do navigator de abas — isso não necessariamente remove uma tela de
simulado **anterior** que já estava na pilha daquela mesma aba (React
Navigation preserva o estado de cada aba ao trocar de aba). Resultado: se o
usuário gera um simulado, termina, troca de aba sem voltar explicitamente
pro início, e depois abre o botão OSIA de novo a partir de `escolher.tsx`
(`push`, empilha por cima do que já estava lá), o `router.back()` do botão
"voltar" do `gerador.tsx` revela a tela de simulado antiga que ainda estava
embaixo na pilha daquela aba, em vez de voltar pro menu.

**Correção proposta (independente da causa exata, resolve o sintoma):**
1. Em `tutor/gerador.tsx`, trocar o botão "voltar" de `router.back()` (que
   confia cegamente no que estiver embaixo na pilha) para um destino fixo e
   conhecido, ex.: `router.canGoBack() ? router.back() : router.replace("/(tabs)/escolher")` — ou, mais robusto, usar `router.dismissTo("/(tabs)/escolher")`
   diretamente, que não depende do estado acumulado da pilha.
2. Ao finalizar um simulado (`(tabs)/simulado.tsx`, botão "Voltar ao Início"),
   usar `router.dismissTo("/(tabs)/home")` em vez de `router.replace`, para
   garantir que a tela de simulado finalizada realmente saia do histórico da
   aba, não fique "presa" embaixo de navegações futuras.
3. Revisar se `router.replace({ pathname: "/simulado", ... })` em
   `gerador.tsx` deveria de fato ser `/(tabs)/simulado` explicitamente (hoje
   funciona porque o grupo `(tabs)` não afeta a URL, mas ser explícito ajuda
   a evitar ambiguidade de qual navigator resolve a rota).

**Como validar (precisa de device/emulador):** gerar um simulado via IA,
finalizar, trocar de aba (sem clicar "Voltar ao Início"), reabrir o botão
OSIA e gerar outro simulado, terminar, entrar de novo na tela de criação e
clicar em "voltar" — confirmar que cai no menu do tutor, não num simulado já
finalizado.

---

## Ação transversal recomendada

BUG-003 e BUG-004 têm a mesma causa de fundo: **o app nunca autentica de
verdade via Supabase Auth** (login customizado contra `usuarios`/`docentes`),
então toda chamada roda como `anon`. Isso é uma bomba-relógio maior do que os
2 bugs pontuais: qualquer tabela com RLS mal configurada pode falhar
silenciosamente (update/delete) ou ruidosamente (insert), e não há como
distinguir "aluno" de "docente" no nível do banco hoje — só no app.

Recomendo, antes ou junto da correção pontual dos 4 bugs, uma auditoria geral
das policies de RLS no Supabase Studio para todas as tabelas usadas por
escrita a partir do app (`usuarios`, `questoes`, `instituicoes`, `simulados`,
`tentativas`, `notificacoes`), confirmando que cada uma tem policy de
`SELECT`/`INSERT`/`UPDATE`/`DELETE` compatível com o papel `anon` (já que é
o único papel que o client realmente usa), e planejando, a médio prazo, mover
operações administrativas sensíveis (excluir aluno, excluir instituição,
cadastrar questão) para Edge Functions com service role — assim a
autorização "é docente" deixa de depender só da UI e passa a ser garantida
no servidor.

## Próximos passos

1. Confirmar causas raiz no Supabase Studio (RLS + schema) antes de programar
   os fixes de BUG-003/004/001 — evita corrigir o sintoma errado.
2. Implementar os 4 fixes (ordem sugerida acima).
3. Rodar `npx tsc --noEmit` após as mudanças de código.
4. Nova rodada de regressão focada nos 4 casos (TF-015, TF-017, TF-018,
   TF-005), como o próprio Bruno recomendou no relatório.
5. Gerar novo build de teste (EAS) para o Bruno validar.
