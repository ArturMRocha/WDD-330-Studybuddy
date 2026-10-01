const path = require("node:path");
const express = require("express");

const app = express();
const port = Number(process.env.PORT) || 3000;
const root = __dirname;

app.get("/", (request, response) => {
  response.sendFile(path.join(root, "index.html"));
});

app.get("/styles.css", (request, response) => {
  response.sendFile(path.join(root, "styles.css"));
});

app.get("/app.js", (request, response) => {
  response.sendFile(path.join(root, "app.js"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`StudyBuddy listening on port ${port}`);
});