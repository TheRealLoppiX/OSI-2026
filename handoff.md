# Handoff — Usabilidade (Heurísticas de Nielsen)

> Obs: não há registro em memória de uma sessão anterior explicitamente rotulada
> "avaliação Nielsen". O que encontrei foi um **working tree com 14 arquivos
> modificados e ainda não commitados** (`git status`), cujo conteúdo é,
> claramente, uma rodada de correções de usabilidade/UX. Este handoff reconstrói
> o que foi feito a partir desse diff e complementa com uma auditoria rápida do
> restante do app, heurística por heurística.

## Estado do repositório

- Branch `master`, 3 commits à frente de `origin/master` (não enviados).
- 14 arquivos com mudanças não commitadas: `app.json`, `app/(tabs)/perfil.tsx`,
  `app/(tabs)/simulado.tsx`, `app/_layout.tsx`, `app/admin/cadastrar-questao.tsx`,
  `app/admin/importar-questoes.tsx`, `app/admin/instituicoes.tsx`,
  `app/admin/usuarios.tsx`, `app/cadastro.tsx`, `app/index.tsx`,
  `app/tutor/chat.tsx`, `app/tutor/flashcards.tsx`, `app/tutor/gerador.tsx`,
  `src/services/aiService.ts`.
- **Ação pendente #0: revisar, testar em device e commitar/pushar essas mudanças**
  antes de qualquer coisa — hoje elas só existem na working copy.

## O que foi feito na sessão anterior (por heurística)

### 1. Visibilidade do status do sistema
- `simulado.tsx`: novo componente `QuestaoImagem` com estados `loading/error/loaded`
  (spinner enquanto carrega, ícone + texto se falhar) — antes a imagem da questão
  não dava nenhum feedback de carregamento.
- `_layout.tsx`, `index.tsx`, `cadastro.tsx`: `startNavigation()` agora é disparado
  no momento certo (login/cadastro bem-sucedido) em vez de em toda troca de rota —
  corrige loading que não aparecia (ou aparecia errado) na transição pós-login.
- `admin/importar-questoes.tsx`: spinner no botão de exportar CSV.
- `admin/cadastrar-questao.tsx`: spinner durante upload de imagem.

### 2. Compatibilidade sistema ↔ mundo real
- Sem mudanças diretas nesta sessão.

### 3. Controle e liberdade do usuário
- `admin/cadastrar-questao.tsx`: botões "Trocar"/"Remover" para a imagem já
  anexada, dando ao usuário uma saída fácil sem precisar recomeçar o cadastro.
- `tutor/gerador.tsx`: guard `isMountedRef` — se o usuário sair da tela enquanto
  a IA gera questões, o app não força mais a navegação para um simulado que ele
  não pediu.

### 4. Consistência e padrões
- `tutor/chat.tsx`: troca de `KeyboardAvoidingView` (que não funciona bem com
  edge-to-edge no Android) por `useAnimatedKeyboard`/`useAnimatedStyle` do
  Reanimated, alinhando o comportamento do teclado com o resto do app.
- `admin/usuarios.tsx`: modal de edição ganhou `ScrollView` +
  `keyboardShouldPersistTaps="handled"`, mesmo padrão que outras telas com
  formulário já usavam.

### 5. Prevenção de erros
- `admin/instituicoes.tsx`: `handleDeletar` agora checa se existem alunos
  vinculados à instituição **antes** de oferecer a exclusão — bloqueia a ação
  destrutiva em vez de só avisar depois.
- `src/services/aiService.ts`: sanitização do tema livre digitado pelo usuário
  (corta quebras de linha, limita tamanho) e teto rígido de questões
  (`MAX_QUESTOES = 15`) aplicado no cliente independente do que a IA devolver —
  evita prompt injection e respostas fora do esperado.
- `simulado.tsx`: `resetQuizState()` chamado também em "Refazer questões
  erradas", que reaproveita a mesma instância da rota via `router.replace` —
  sem isso, score/respostas da tentativa anterior vazavam pra nova tentativa.

### 6. Reconhecimento em vez de memorização
- `admin/importar-questoes.tsx`: texto de dica abaixo do header explicando o
  que o ícone de download faz ("Toque no ícone de download para exportar...").

### 7. Flexibilidade e eficiência de uso
- `admin/importar-questoes.tsx`: nova exportação do banco de questões para CSV
  (mesma ordem de colunas da importação), permitindo round-trip
  exportar → validar → reimportar.
- `admin/cadastrar-questao.tsx`: upload de imagem (gráfico/diagrama) na questão,
  refletido depois em `simulado.tsx` e `tutor/flashcards.tsx`.

### 8. Design estético e minimalista
- `(tabs)/perfil.tsx`: conteúdo agora dentro de `ScrollView`; botão de logout
  ficou fixo fora do scroll para nunca ser cortado em telas pequenas.

### 9. Ajudar a reconhecer, diagnosticar e recuperar de erros
- `tutor/gerador.tsx`: em caso de erro, propaga `error.message` real da API em
  vez de sempre mostrar a mensagem genérica de rate limit.
- `src/services/aiService.ts`: validação final das questões retornadas pela IA
  (descarta itens malformados) e erro explícito ("Não foi possível gerar
  questões válidas para esse tema...") em vez de deixar o app quebrar com dado
  inconsistente.
- `simulado.tsx`: estado de erro visual na imagem da questão (ícone +
  "Não foi possível carregar a imagem") em vez de espaço em branco/quebra.

### 10. Ajuda e documentação
- `admin/importar-questoes.tsx`: texto de dica do botão de exportar (ver item 6).

---

## O que falta para 5/5 em cada heurística

### 1. Visibilidade do status do sistema — 4/5
- Já coberto: spinners/feedback nas ações assíncronas principais; `appAlert`
  agora dá feedback temático de sucesso/erro em todo o app.
- Falta: nenhum estado de skeleton (só `ActivityIndicator` central) — cosmético,
  baixa prioridade.

### 2. Compatibilidade sistema ↔ mundo real — não avaliado a fundo
- Ação: revisar terminologia com um aluno/professor real para confirmar que a
  linguagem bate com o vocabulário deles.

### 3. Controle e liberdade do usuário — 4/5
- Já coberto: trocar/remover imagem sem recomeçar cadastro; geração de IA não
  força navegação se o usuário já saiu da tela.
- Falta: nenhum "desfazer" pós-exclusão (soft delete) — as confirmações de
  exclusão (agora temáticas) continuam sendo o único freio.

### 4. Consistência e padrões — 5/5
- Feito: todo `Alert.alert` nativo (59 chamadas em 14 arquivos) migrado para
  `src/services/appAlert.tsx`, um diálogo temático único (`useTheme()`) que
  respeita claro/escuro e o visual do resto do app.

### 5. Prevenção de erros — 5/5
- Feito: `admin/gerenciar.tsx` agora bloqueia exclusão de questão vinculada a
  simulado e de simulado com tentativas registradas, no mesmo padrão de
  `admin/instituicoes.tsx`. Notificação em massa (`admin/notificar.tsx`) passou
  a pedir confirmação antes de disparar para todos os alunos.

### 6. Reconhecimento em vez de memorização — 5/5
- Feito: `accessibilityRole`/`accessibilityLabel` adicionados a todo botão
  só-de-ícone do app (voltar, fechar, atualizar, editar, excluir, exportar,
  trocar/remover imagem, alternar tema, enviar mensagem, notificações, FAQ).

### 7. Flexibilidade e eficiência de uso — 3/5 (não trabalhado nesta rodada)
- Falta: ações em lote nas telas admin, atalhos para usuários avançados.
- Ação: fica para uma próxima rodada — não fazia parte do escopo combinado
  desta vez (foco foi 4, 5, 6, 9, 10).

### 8. Design estético e minimalista — 5/5
- Feito: o `Alert.alert` nativo (que fugia do tema) foi o principal ofensor e
  já foi substituído (ver item 4).

### 9. Ajudar a reconhecer, diagnosticar e recuperar de erros — 5/5
- Feito: `src/utils/friendlyError.ts` traduz erros comuns (rede, sessão
  expirada, RLS/policy, chave duplicada) para mensagens em PT-BR, aplicado em
  todos os catches que antes repassavam `error.message` cru; erros antes
  silenciosos (`console.error` apenas, ex. `tutor/chat.tsx`, finalização de
  simulado) agora avisam o usuário.

### 10. Ajuda e documentação — 5/5
- Feito: `components/OnboardingModal.tsx` (carrossel de 3 telas na primeira
  abertura, flag `@osi_onboarding_seen`) montado em `(tabs)/home.tsx`; nova tela
  `app/ajuda.tsx` (FAQ em accordion) linkada a partir do menu do perfil.

---

## Status: implementado nesta sessão

Itens 4, 5, 6, 8, 9 e 10 foram implementados (ver commits pendentes — nada foi
commitado ainda). `npx tsc --noEmit` passa limpo (os erros que aparecem são
pré-existentes nas Edge Functions Deno em `supabase/functions/`, não
relacionados a este trabalho).

**Falta antes de considerar concluído:**
1. Testar em device/emulador real — não há emulador disponível neste ambiente
   de execução, então a verificação foi só estática (leitura de código + tsc).
   Testar principalmente: diálogo temático em tema escuro, onboarding na
   primeira abertura, bloqueio de exclusão de questão/simulado vinculado.
2. Heurística 7 (Flexibilidade e eficiência) ficou de fora do escopo combinado
   — não foi trabalhada.
3. Heurística 2 (Compatibilidade com o mundo real) não foi avaliada a fundo —
   depende de revisão com usuários reais, não é algo que dá para "codar".
4. Revisar e commitar as mudanças (nesta sessão e na anterior).

---

## Sessão 19/07/2026 — Correção dos bugs do QA (Bruno)

Bruno (QA do time) rodou 31 casos de teste na build OSI-APP 2.1 (16/07/2026),
achando 4 bugs (`plano-acao-bugs-qa.md` tem o diagnóstico completo, com
trechos de código e SQL). Nesta sessão, o usuário forneceu um **Supabase
Personal Access Token** e autorizou investigar/corrigir diretamente no banco
de produção. Usei a Management API do Supabase (`api.supabase.com`) para
rodar queries de diagnóstico (somente leitura) e confirmei precisamente a
causa de cada bug:

- **`questoes`**: RLS ativo, a única policy de escrita
  (`Docentes gerenciam questões`) exige `auth.uid() IN (SELECT id FROM docentes)`
  — mas o app nunca autentica via Supabase Auth de verdade (login customizado
  contra `usuarios`/`docentes`), então `auth.uid()` é sempre `null` e todo
  INSERT é rejeitado. **Causa confirmada do BUG-003** (erro ao cadastrar
  questão no Banco de Questões).
- **`usuarios`**: RLS ativo, tem policy de INSERT e UPDATE públicas, mas
  **nenhuma policy de DELETE** — um delete sem policy correspondente afeta 0
  linhas e não retorna erro. **Causa confirmada do BUG-004** (perfil de aluno
  não é removido).
- **`instituicoes`**: RLS **desativado** (sem nenhuma restrição no banco) e
  `usuarios.instituicao` é texto livre sem FK — a checagem de vínculo hoje só
  existe no app (`instituicoes.tsx`), sem garantia no banco. **Causa
  confirmada do BUG-001**. Auditoria encontrou 1 aluno já órfão (instituição
  "Universidade Federal do Vale do São Francisco" referenciada mas ausente
  da tabela `instituicoes`).

**Feito nesta sessão (código):**
- `app/admin/usuarios.tsx`: `handleDelete` agora encadeia `.select()` no
  delete e checa `data.length` antes de fechar o modal — evita que uma
  exclusão que silenciosamente não apagou nada (RLS sem policy, por exemplo)
  seja reportada como sucesso ao admin.
- `app/admin/instituicoes.tsx`: `handleDeletar` agora captura e mostra o
  erro do `delete()` (antes era totalmente ignorado).
- `app/tutor/gerador.tsx`: botão "voltar" trocado de `router.back()` (que
  podia reabrir uma tela de simulado antiga ainda presa na pilha da aba,
  reproduzindo o BUG-002) para `router.dismissTo("/(tabs)/escolher")`, que
  força um destino fixo e limpa qualquer tela acumulada acima dele.
- `app/(tabs)/simulado.tsx`: botão "Voltar ao Início" trocado de
  `router.replace("/(tabs)/home")` para `router.dismissTo("/(tabs)/home")`,
  para garantir que a tela do simulado finalizado realmente saia do
  histórico da aba (causa raiz do BUG-002 era acúmulo dessas telas).
- `npx tsc --noEmit` limpo (fora dos erros pré-existentes das Edge Functions
  Deno).

**Feito nesta sessão (banco — via Supabase Management API):**
- ⚠️ **BLOQUEADO pelo classificador de segurança do modo automático** (ação
  de alto risco: mutação em banco de produção). As queries de diagnóstico
  (somente leitura) rodaram normalmente; as 4 alterações abaixo **ainda não
  foram aplicadas** e precisam ser rodadas manualmente (SQL Editor do
  Supabase Studio, projeto `yvdnsygxztmgmkaqrpxq`) ou reautorizadas
  explicitamente para eu rodar:
  ```sql
  -- 1. Corrige BUG-003: permite que o client (que roda sempre como anon)
  -- escreva em questoes, já que auth.uid() nunca é preenchido nesta arquitetura.
  CREATE POLICY "Acesso total anonimo questoes" ON public.questoes
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  -- 2. Corrige BUG-004: hoje não existe NENHUMA policy de DELETE em usuarios.
  CREATE POLICY "Permitir exclusao anonima de usuarios" ON public.usuarios
    FOR DELETE TO anon, authenticated USING (true);

  -- 3. Reforça BUG-001 no nível do banco (defesa em profundidade —
  -- a checagem do app continua existindo, isso é uma segunda trava).
  CREATE OR REPLACE FUNCTION public.prevent_delete_instituicao_vinculada()
  RETURNS TRIGGER AS $$
  BEGIN
    IF EXISTS (SELECT 1 FROM public.usuarios WHERE instituicao = OLD.nome) THEN
      RAISE EXCEPTION 'Nao e possivel excluir a instituicao "%": existem alunos vinculados a ela.', OLD.nome;
    END IF;
    RETURN OLD;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_prevent_delete_instituicao_vinculada ON public.instituicoes;
  CREATE TRIGGER trg_prevent_delete_instituicao_vinculada
    BEFORE DELETE ON public.instituicoes
    FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_instituicao_vinculada();

  -- 4. Repara o aluno órfão encontrado na auditoria (aditivo, não destrutivo).
  INSERT INTO public.instituicoes (nome, sigla)
  SELECT 'Universidade Federal do Vale do São Francisco', 'UNIVASF'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.instituicoes WHERE nome = 'Universidade Federal do Vale do São Francisco'
  );
  ```

**Atualização — SQL aplicado e verificado (19/07/2026):** o usuário rodou o
SQL acima manualmente no SQL Editor do Supabase Studio (na primeira
tentativa, sem querer, no projeto errado da conta — "lock" em vez de
"OSI2026"; na segunda tentativa, no projeto certo). Reconfirmei via query
somente-leitura na Management API que as 4 alterações estão realmente no
projeto `yvdnsygxztmgmkaqrpxq` (OSI2026):
- Policy `Acesso total anonimo questoes` (ALL, anon+authenticated) existe em
  `questoes`.
- Policy `Permitir exclusao anonima de usuarios` (DELETE, anon+authenticated)
  existe em `usuarios`.
- Trigger `trg_prevent_delete_instituicao_vinculada` existe em `instituicoes`.
- A instituição "Universidade Federal do Vale do São Francisco" (o aluno
  órfão da auditoria) foi recadastrada.

**Os 4 bugs do relatório do Bruno (BUG-001 a BUG-004) estão corrigidos.**

**Falta:**
1. Testar em device: cadastrar questão avulsa no Banco de Questões, excluir
   aluno, excluir instituição com/sem vínculo, e o fluxo IA→simulado→voltar
   do BUG-002 — nenhuma dessas correções foi validada num device/emulador
   real, só por leitura de código + queries de confirmação no banco.
2. **O token de acesso do Supabase foi colado diretamente no chat várias
   vezes nesta sessão** — como ele já foi exposto na conversa, é fortemente
   recomendado revogá-lo e gerar um novo em Supabase → Account → Access
   Tokens agora que os fixes já foram aplicados.
3. Novo build EAS para o Bruno validar a nova rodada de correções.
