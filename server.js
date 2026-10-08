const path = require("node:path");
const express = require("express");

const app = express();
const port = Number(process.env.PORT) || 3000;
const root = __dirname;
const fallbackQuote = {
  quote: "Grandes jornadas começam com pequenos passos.",
  author: "StudyBuddy",
  source: "local",
};
let quoteCache = null;
let quoteCacheTime = 0;
const googleCalendarScope = "https://www.googleapis.com/auth/calendar.events";
const googleCalendarApiUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

app.get("/api/config", (request, response) => {
  response.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || "" });
});

app.get("/api/google/config", (request, response) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
  response.json({
    clientId: googleClientId,
    scope: googleCalendarScope,
    calendarApiUrl: googleCalendarApiUrl,
    configured: Boolean(googleClientId),
  });
});

app.get("/api/quote", async (request, response) => {
  response.set("Cache-Control", "no-store");
  const cacheIsFresh = quoteCache && Date.now() - quoteCacheTime < 60 * 60 * 1000;
  if (cacheIsFresh) {
    response.json(quoteCache);
    return;
  }

  try {
    const upstream = await fetch("https://zenquotes.io/api/random", {
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) throw new Error(`ZenQuotes returned ${upstream.status}`);
    const [result] = await upstream.json();
    if (!result?.q || !result?.a) throw new Error("ZenQuotes returned an invalid quote");
    quoteCache = { quote: result.q, author: result.a, source: "ZenQuotes" };
    quoteCacheTime = Date.now();
    response.json(quoteCache);
  } catch {
    response.json(quoteCache || { ...fallbackQuote, source: "fallback" });
  }
});

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
  console.log(`StudyBuddy is available at http://localhost:${port}`);
});