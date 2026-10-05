# StudyBuddy

Projeto final do curso WDD 330: um painel responsivo para organizar estudos, tarefas, agenda, notas e progresso.

## Semana 6: Funções principais

O dashboard responsivo funciona em desktop e mobile. Permite criar, editar, concluir, excluir e filtrar tarefas por situação e prioridade; criar, editar e excluir notas rápidas; e navegar entre semanas e dias da agenda, que inclui eventos de exemplo.

Tarefas e notas ficam salvas no `localStorage` do navegador e permanecem disponíveis após recarregar a página no mesmo navegador. A agenda é demonstrativa e não sincroniza entre dispositivos.

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
