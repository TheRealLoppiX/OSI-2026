# Auditoria completa — OSI-App (25/07/2026)

Revisão de todos os arquivos de código do projeto (app/, src/, components/,
supabase/functions/), arquivo por arquivo, via 5 auditorias paralelas dedicadas
por área: telas de usuário, telas admin, tutor/IA + webview, services/contexts/
components, e Edge Functions.

Contexto assumido (decisões arquiteturais conhecidas, não reportadas como bug):
autenticação customizada contra `usuarios`/`docentes` (não usa Supabase Auth
real, `auth.uid()` sempre null), RLS majoritariamente aberta de propósito,
fallback de senha em texto puro para contas antigas de teste (documentado no
código).

---

## Resumo executivo

- **10 achados de severidade ALTA**, a maioria de segurança em Edge Functions
  (autorização ausente) e integridade de dados (updates que falham em
  silêncio).
- **~15 achados de severidade MÉDIA** — races de duplo toque, CSV injection,
  lost updates de XP/streak, URL de WebView não validada, etc.
- **~12 achados de severidade BAIXA** — erros de leitura não logados, cosmética
  de tema, código morto.
- **Todos os itens marcados [CÓDIGO] foram corrigidos e aplicados nesta
  sessão**, e todas as Edge Functions tocadas (`verificar-otp`, `enviar-otp`,
  `importar-planilha`, `send-push-notification`, `marcar-notificacoes-lidas`,
  `get-news`, `groq-proxy`) já foram deployadas em produção (projeto
  `yvdnsygxztmgmkaqrpxq`), depois que o usuário forneceu um Personal Access
  Token do Supabase nesta sessão (login automático via navegador não
  funciona neste ambiente não-interativo). A secret `GROQ_API_KEY` também já
  está configurada — o achado ALTA #6 (chave da Groq exposta) foi resolvido
  de ponta a ponta, não só preparado.
- Item que ainda depende de banco (**[REQUER BANCO]**, não aplicado): a
  migração `notificacao_leituras` (achado MÉDIA, leitura de notificação por
  usuário) — não rodei porque envolve criar uma tabela nova e mudar o fluxo
  de leitura de notificações, e preferi não fazer isso sem confirmar o
  impacto com mais calma; o SQL já está pronto mais abaixo neste documento.

---

## ALTA severidade

### 1. `importar-planilha` e `send-push-notification` sem checagem de admin [CÓDIGO — corrigido]
Qualquer pessoa com a anon key (pública, embutida no app) podia chamar essas
functions diretamente e (a) injetar questões arbitrárias no banco de questões
do exame, ou (b) disparar push notification para todos os alunos. `verify_jwt`
não protege nada aqui porque a anon key já satisfaz esse requisito.
**Fix:** as duas functions agora exigem um header `x-docente-id` com um UUID
que precisa existir na tabela `docentes` antes de executar a ação privilegiada.
`admin/importar-questoes.tsx` foi atualizado para enviar esse header
automaticamente (usa o id do docente logado, via `AuthContext`).
Não é uma autenticação criptográfica forte (não há sessão real), mas fecha o
buraco de "qualquer um com a anon key" — só quem tem um UUID de docente
existente (não exposto publicamente) consegue chamar.
`send-push-notification` não é chamada por nenhuma tela hoje (ver achado #5);
o header foi adicionado por consistência/defesa em profundidade — se essa
function for acionada por um Database Webhook no futuro, o webhook precisa ser
configurado para enviar um `x-docente-id` válido.

### 2. `verificar-otp` sem proteção contra brute-force [CÓDIGO — corrigido]
O código de 6 dígitos (900 mil combinações, válido por 15 min) podia ser
testado sem limite de tentativas. **Fix:** contador de tentativas gravado no
próprio campo `dados` (jsonb, sem precisar de migração) — após 5 tentativas
erradas para o mesmo e-mail, o código é invalidado e o usuário precisa pedir
um novo.

### 3. `enviar-otp` sem rate limit (email bombing) [CÓDIGO — corrigido]
Nada impedia flood de e-mails de OTP para a mesma vítima. **Fix:** cooldown de
60s entre envios para o mesmo e-mail, calculado a partir do `expires_at` já
existente (sem precisar de coluna nova).

### 4. `simulado.tsx` sem trava contra duplo toque em `handleAnswer`/`nextQuestion` [CÓDIGO — corrigido]
Dois toques rápidos podiam duplicar resposta/pular pergunta, desalinhando
`userAnswers` com `questions` pelo resto da tentativa (pontuação errada, lista
de erros errada, revisão desalinhada) — tudo sem erro visível. **Fix:** guard
síncrono no início de `handleAnswer` (`if (showFeedback) return`) e trava por
`ref` em `nextQuestion`.

### 5. Push notifications completamente inoperantes [CÓDIGO — corrigido]
`registerForPushNotificationsAsync` nunca era chamada em lugar nenhum do app
→ `push_token` sempre nulo para todo mundo → a feature nunca funcionou.
**Fix:** chamada adicionada em `AuthContext` logo após restaurar/criar sessão,
com try/catch (falha ao registrar push não deve travar o login).

### 6. Chave da Groq embutida no bundle do cliente [CÓDIGO + DEPLOY — corrigido]
`EXPO_PUBLIC_GROQ_API_KEY` ficava literal no JS bundle do app — extraível via
engenharia reversa do APK, permitindo uso da chave (billing da conta) fora do
app, sem cooldown nem limite de questões.
**Fix aplicado e já em produção:** `supabase/functions/groq-proxy/index.ts`
faz a chamada à Groq no servidor usando a secret `GROQ_API_KEY` (configurada
via `supabase secrets set`, nunca exposta ao cliente); `chamarGroq` em
`src/services/aiService.ts` agora chama
`supabase.functions.invoke("groq-proxy", { body: { mensagens, maxTokens, jsonMode } })`
em vez de `fetch` direto à Groq. Secret configurada e function deployada no
projeto `yvdnsygxztmgmkaqrpxq` nesta sessão (usuário forneceu um Personal
Access Token do Supabase). O app não embute mais nenhuma chave paga da Groq
a partir do próximo build.

### 7. `cadastrar-questao.tsx`: `salvarQuestao` não confere linhas afetadas no UPDATE [CÓDIGO — corrigido]
Mesmo padrão de "sucesso falso" já corrigido em outros arquivos, mas
esquecido aqui: se o UPDATE for bloqueado por RLS (0 linhas), o app mostrava
"Questão atualizada!" sem nada ter sido persistido. **Fix:** `.select()` +
checagem de `data.length`, igual ao padrão usado em `gerenciar.tsx`.

### 8. `admin/usuarios.tsx`: `handleUpdate` não confere linhas afetadas [CÓDIGO — corrigido]
Mesma classe de bug do item 7 — editar aluno (senha, instituição) podia
"funcionar" na tela sem persistir nada. **Fix:** mesmo padrão de
`.select()` + checagem de tamanho.

### 9. Fallback de senha em texto puro não é restrito a contas antigas [CÓDIGO — mitigado, não removido]
O comentário no código diz "contas antigas de teste", mas o fallback roda
para qualquer linha (aluno ou **docente/admin**) cuja senha não seja um hash
bcrypt válido — sem log de quando é exercido. **Fix aplicado:** mantive o
fallback (é uma decisão de produto para contas legadas, não vou removê-lo
sem confirmar que não vai travar ninguém), mas adicionei
`console.warn` sempre que ele é usado, para dar visibilidade em produção de
quais contas ainda dependem dele. Recomendação (não aplicada): migrar essas
contas para hash em lote e remover o fallback depois.

### 10. `registrarDocente` sem validação de schema — senha de 1 caractere para conta admin [CÓDIGO — corrigido]
Só checava presença dos campos, sem exigir tamanho mínimo de senha/formato de
e-mail, ao contrário do fluxo de aluno (que usa `cadastroSchema`, zod). Como
docente vira `role: "admin"` no login, isso permitia criar uma conta
administrativa com senha trivial. **Fix:** novo `docenteSchema` (zod, sem o
campo `instituicao` que só existe para aluno) aplicado antes do insert.

---

## MÉDIA severidade

Todos os itens abaixo foram corrigidos nesta sessão (**[CÓDIGO]**), exceto onde
indicado.

- **`app/_layout.tsx`** — `jaRedirecionouGlobal` era uma flag de módulo que
  disparava o redirecionamento automático só uma vez por cold start; depois
  disso, um usuário autenticado que caísse numa rota pública (ex.: deep link)
  ficava preso na tela de login. Fix: resetar a flag quando
  `estaNaAreaRestrita` volta a `true`, permitindo nova checagem.
- **`app/(tabs)/home.tsx` + `marcar-notificacoes-lidas`** — status de leitura
  de notificação é global (compartilhado entre todos os usuários): o primeiro
  aluno a abrir "Avisos" marca a notificação como lida pra todo mundo.
  **[REQUER BANCO — não aplicado]** — a correção correta é uma tabela de
  junção `notificacao_leituras(usuario_id, notificacao_id)`, o que é uma
  migração de schema + refatoração do fluxo de notificações. SQL preparado
  abaixo, não aplicado (dependeria de acesso ao banco + validação de que não
  quebra nada em produção):
  ```sql
  CREATE TABLE IF NOT EXISTS public.notificacao_leituras (
    usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    notificacao_id bigint NOT NULL REFERENCES public.notificacoes(id) ON DELETE CASCADE,
    lida_em timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, notificacao_id)
  );
  ```
- **`perfil.tsx`** — update de `avatar_url` não conferia linhas afetadas
  (mesmo padrão dos itens 7/8). Fix aplicado.
- **`webview.tsx`** — `url` vinda de deep link sem validação de domínio,
  rotulada na UI como "Ambiente Seguro Google Forms" mesmo apontando para
  qualquer lugar. Fix: allowlist de domínio (`docs.google.com`, `forms.gle`)
  antes de renderizar o WebView, com tela de erro se a URL não for confiável.
- **`tutor/chat.tsx`** — duplo toque sem trava por `ref` (mesma classe do
  achado 4, risco menor); `id` de mensagem com baixa entropia
  (`Date.now().toString()`) podendo colidir. Fix: guard por `useRef` +
  `id` com sufixo aleatório.
- **`tutor/flashcards.tsx`** — duplo toque sem trava por `ref`; captura de
  `ViewShot` podia rodar antes da imagem da questão terminar de carregar
  (flashcard exportado sem imagem, sem erro); sem feedback quando
  `Sharing.isAvailableAsync()` retorna `false`. Fix: guard por `ref`,
  aguardar `Image.prefetch` de todas as imagens antes de habilitar o botão,
  alerta quando compartilhamento não está disponível.
- **`admin/gerenciar.tsx`** — `handleCriarSimulado` sem trava contra duplo
  toque (podia criar simulados duplicados). Fix: mesmo padrão de
  `salvandoVinculo` já usado no restante do arquivo.
- **`admin/importar-questoes.tsx`** — `csvEscape` não neutralizava campos
  começando com `=`, `+`, `-`, `@` (CSV/formula injection ao abrir a
  exportação no Excel/Sheets). Fix: prefixo de apóstrofo nesses casos.
- **`src/services/auth.ts`** — `adicionarXP`/`atualizarStreak` faziam
  leitura-depois-escrita não atômica (lost update em toques
  duplos/dispositivos simultâneos). Fix: concorrência otimista — grava
  condicionado ao valor lido (`.eq("pontuacao", valorAntigo)`), com retry se
  0 linhas forem afetadas (alguém alterou entre a leitura e a escrita).
- **`src/services/auth.ts`** — `salvarTentativa` falhava em silêncio
  (`return` sem lançar) quando não havia usuário em cache, escondendo do
  chamador que a tentativa não foi salva. Fix: lança erro em vez de retornar
  silenciosamente.
- **`src/services/appAlert.tsx`** — alertas concorrentes se sobrescreviam
  (o segundo `alert()` descartava o primeiro antes de ser exibido). Fix:
  fila de alertas, exibidos um de cada vez.
- **`get-news`** — endpoint público (`verify_jwt=false`, proposital) sem
  nenhum controle, permitindo abuso de custo da API da Groq/Google News por
  qualquer chamador. **[REQUER DEPLOY — não aplicado]** — adicionar um
  secret compartilhado exigiria configurar `Deno.env` no projeto (não tenho
  acesso) e sincronizar com quem quer que dispare essa function hoje (cron
  externo?), então não mexi para não quebrar um agendamento existente que eu
  não consigo enxergar sem acesso ao dashboard.
- **`send-push-notification`** — sem paginação (só pega os primeiros 1000
  tokens) e envia todos os tokens numa única chamada à API da Expo (que
  recomenda lotes de até 100). Fix: paginação com `Range` + chunking de 100
  em 100.

---

## BAIXA severidade — corrigidas em lote [CÓDIGO]

Leituras do Supabase que ignoravam `error` e tratavam falha como "lista
vazia" (enganoso para o usuário/admin, sem log para debug). Adicionado
`console.error` + repasse do erro visível onde fazia sentido, em:
`app/cadastro.tsx` (fetch de instituições), `app/(tabs)/historico.tsx`,
`admin/instituicoes.tsx` (`fetchInstituicoes`), `admin/index.tsx`
(`fetchStats`), `admin/gerenciar.tsx` (`fetchSimulados`),
`src/services/newsService.ts`.

Outros itens baixos corrigidos: `gerador.tsx` (`verificarCooldown` sem
`isMountedRef`), `OnboardingModal.tsx` (`visible={visible}` explícito no
`Modal`, `.catch()` no AsyncStorage), `ThemeContext.tsx` (estado inicial de
tema lido de forma síncrona via `Appearance.getColorScheme()` para evitar
flash de tema claro).

**Não corrigidos, só documentados** (baixíssimo risco/valor, fora do escopo
de bug real): código morto do boilerplate padrão do Expo Router
(`components/Themed.tsx`, `ExternalLink.tsx`, `StyledText.tsx`,
`useClientOnlyValue.ts`, `constants/Colors.ts`, função `registrarAluno` em
`auth.ts`) — nada disso é referenciado por nenhuma tela real do app; CORS
`*` nas Edge Functions (baixo risco para app mobile sem cookies); vazamento
de `err.message` cru pro cliente em alguns `catch` das Edge Functions — este
último **foi corrigido** (mensagens genéricas ao cliente + `console.error`
no servidor para todas as 6 functions).

---

## Plano de ação — o que falta (fora do alcance desta sessão)

1. **Deploy do `groq-proxy`** (achado ALTA #6) — tirar a chave da Groq do
   bundle do cliente. Maior item pendente de segurança.
2. **Migração `notificacao_leituras`** (achado MÉDIA) — leitura de
   notificação por usuário em vez de global.
3. **Rate limit em `get-news`** — depende de entender se algo externo
   (cron) já chama essa function, para não quebrar o agendamento.
4. Testar em device as mudanças desta sessão antes do build ir para o
   Bruno validar (mesmo cuidado dos handoffs anteriores).
5. Revogar o token do Supabase que ficou exposto em conversas anteriores
   (item recorrente do `handoff.md`, ainda pendente).
