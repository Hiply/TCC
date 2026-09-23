# SYSTEM // Training Protocol — versão online/mobile + nuvem gratuita

## O que muda nesta versão
- Continua um site estático (GitHub Pages, grátis) instalável como app (PWA).
- Agora tem **login e sincronização de progresso entre PC e celular**, usando o
  [Supabase](https://supabase.com) (plano gratuito: Postgres + Autenticação).
- Sem conta Supabase configurada, o app funciona exatamente como antes, salvando
  só no `localStorage` do navegador — nada quebra.

## Custo
Zero, dentro dos limites do plano gratuito do Supabase (por projeto):
- 500 MB de banco de dados
- 50.000 usuários autenticados/mês
- 1 GB de armazenamento de arquivos
- **Atenção:** um projeto gratuito "pausa" sozinho após 7 dias sem uso. Os dados
  não são apagados — basta entrar no painel do Supabase e clicar em "Restore
  project" para reativar.

## Passo a passo — GitHub Pages (frontend, grátis)
1. Crie uma conta no GitHub.
2. Crie um repositório, por exemplo `solo-system`.
3. Envie estes arquivos para a raiz do repositório:
   - `index.html`, `style.css`, `app.js`, `cloud.js`
   - `manifest.webmanifest`, `sw.js`, `icon.svg`
4. No GitHub, abra `Settings` → `Pages`.
5. Em `Build and deployment`, selecione a branch principal e a pasta `/ (root)`.
6. Salve e abra a URL publicada (algo como `https://SEU-USUARIO.github.io/solo-system/`).
7. No celular, permita localização quando o navegador pedir.
8. Em navegadores compatíveis, use "instalar" / "adicionar à tela inicial".

## Passo a passo — Supabase (login + nuvem, grátis)
1. Crie uma conta gratuita em https://supabase.com e clique em **New project**.
2. Escolha uma senha de banco (guarde-a) e aguarde o projeto ser criado (~2 min).
3. No menu lateral, abra **SQL Editor** → **New query**, cole o conteúdo do
   arquivo `supabase-schema.sql` (incluído neste pacote) e clique em **Run**.
   Isso cria a tabela `player_state` já protegida (cada usuário só acessa o
   próprio progresso).
4. No menu lateral, abra **Authentication** → **Providers** e confirme que
   **Email** está habilitado (vem habilitado por padrão). Se quiser liberar
   testes rápidos sem confirmação por e-mail, em **Authentication** →
   **Settings** desative "Confirm email" (opcional).
5. No menu lateral, abra **Project Settings** → **API**. Copie:
   - **Project URL**
   - **anon public key**
6. Abra o arquivo `cloud.js` e substitua as duas linhas no topo:
   ```js
   const SUPABASE_URL = "COLE_AQUI_SUA_URL_DO_SUPABASE";
   const SUPABASE_ANON_KEY = "COLE_AQUI_SUA_ANON_KEY";
   ```
   pelos valores copiados.
7. Suba o `cloud.js` atualizado para o mesmo repositório do GitHub Pages.
8. Pronto: o botão **☁ CONTA** no topo do app passa a permitir criar conta,
   entrar e sincronizar. Ao logar em outro aparelho com a mesma conta, o
   progresso é baixado automaticamente da nuvem.

## Limitações que continuam
- Sem conta/login: progresso fica só no navegador atual (`localStorage`), como
  antes.
- O GPS exige HTTPS (GitHub Pages já fornece) e permissão do navegador.
- A sincronização é "o mais recente vence" (last-write-wins) — se usar dois
  aparelhos ao mesmo tempo sem internet, o último a sincronizar prevalece.

## Próxima arquitetura (opcional, ainda sem custo)
Se no futuro quiserem lógica de servidor própria (ex.: validar rankings,
anti-cheat, notificações), dá para adicionar **Supabase Edge Functions**
(também no plano gratuito) sem precisar hospedar o `server.js`/Express em
lugar nenhum — o `server.js` deste projeto continua útil apenas para rodar
localmente durante o desenvolvimento (`npm start`).
