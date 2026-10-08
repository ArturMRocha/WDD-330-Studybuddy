# StudyBuddy

Projeto final do curso WDD 330: um painel responsivo para organizar estudos, tarefas, agenda, notas e progresso.

## Semana 7: Integrações e acabamento

O dashboard responsivo integra a ZenQuotes API por meio de um endpoint do servidor, com cache de uma hora, atribuição ao serviço e frase local como fallback. A agenda continua utilizável com eventos de exemplo e pode ler eventos do Google Calendar após autorização OAuth somente leitura. O painel de progresso calcula sessões de estudo registradas pelo usuário, em vez de exibir valores demonstrativos.

Tarefas, notas e sessões ficam no `localStorage` do navegador e não sincronizam entre dispositivos. Sem conexão do Google, a agenda usa os eventos de exemplo.

### Google Calendar

1. Ative a Google Calendar API em um projeto do Google Cloud e configure a tela de consentimento OAuth.
2. Crie um OAuth Client ID do tipo aplicação Web. Adicione `http://localhost:3000` às origens JavaScript autorizadas e o domínio publicado quando houver deploy.
3. Para configurar o site uma única vez, defina `GOOGLE_CLIENT_ID` no servidor. Em PowerShell local, use `$env:GOOGLE_CLIENT_ID="seu-client-id"` antes de iniciar com `npm.cmd start`; no Render, adicione a variável em **Environment** e reinicie o serviço.
4. Para um teste individual sem alterar o servidor, o avaliador pode informar seu OAuth Client ID no painel e salvar. O ID fica salvo somente naquele navegador.
5. Depois, escolha **Conectar Google Calendar** e autorize a leitura dos eventos. **Atualizar agenda** busca alterações recentes; trocar de semana também sincroniza automaticamente. Sem Client ID, a agenda de demonstração continua funcionando.

O cliente usa o Google Identity Services e a Calendar API v3 diretamente. O token de acesso é mantido somente na sessão atual e nunca é persistido. Client IDs são públicos; nunca coloque um client secret no navegador. A conta de teste precisa estar autorizada na tela de consentimento enquanto o app estiver em modo de teste.

Para validar a integração, execute `npm test` e confira o endpoint `/api/google/config`. A integração real requer um Client ID válido e uma origem autorizada no Google Cloud.

### Escopo

Login/registro, notificações de lembrete e personalização de avatar/perfil ainda não fazem parte deste protótipo. Os dados permanecem no navegador, sem banco de dados ou sincronização entre contas.

## Executar localmente

Requer Node.js instalado.

```bash
npm install
npm start
```

Abra `http://localhost:3000` no navegador. O servidor usa a porta `PORT` do ambiente quando definida, como no Render.

## Publicar no Render

Crie um **Web Service** conectado a este repositório e configure:

- Build Command: `npm install`
- Start Command: `npm start`

O serviço escuta automaticamente a porta fornecida pelo Render. Não é necessário configurar uma variável `PORT` manualmente.
