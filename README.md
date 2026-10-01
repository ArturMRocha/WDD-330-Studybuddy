# StudyBuddy

Projeto final do curso WDD 330: um painel responsivo para organizar estudos, tarefas, agenda, notas e progresso.

## Semana 5: Estrutura

Esta etapa cria a estrutura visual do dashboard para desktop e mobile. Os dados são demonstrativos; tarefas, notas, calendário e integrações serão implementados nas próximas etapas.

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
