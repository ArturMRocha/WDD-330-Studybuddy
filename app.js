const taskStorageKey = "studybuddy.tasks.v1";
const noteStorageKey = "studybuddy.notes.v1";
const studySessionStorageKey = "studybuddy.study-sessions.v1";
const googleClientIdStorageKey = "studybuddy.google-client-id.v1";
const authStorageKey = "studybuddy.auth.v1";
const sessionStorageKey = "studybuddy.session.v1";
const priorityLabels = { high: "Alta", medium: "Média", low: "Baixa" };
const sampleTasks = [
  { title: "Lista de álgebra", details: "Matemática · Capítulo 5", dueOffset: 0, priority: "high" },
  { title: "Pesquisa para ciências", details: "Biologia · Pesquisa e fontes", dueOffset: 1, priority: "medium" },
  { title: "Leitura: História moderna", details: "História · Capítulo 3", dueOffset: 3, priority: "medium" },
  { title: "Revisar vocabulário", details: "Inglês · Unidade 2", dueOffset: 5, priority: "low" },
];
const sampleNotes = [
  { title: "Lembrar!", body: "Entregar trabalho de história sexta-feira.", color: "yellow" },
  { title: "Ideia", body: "Criar mapa mental para a prova de biologia.", color: "green" },
  { title: "Comprar", body: "Caderno novo e marcadores coloridos.", color: "blue" },
];
const sampleEvents = [
  { day: 0, time: "09:00", title: "Aula de matemática", detail: "09:00 - 10:00 · Sala 204", color: "blue" },
  { day: 0, time: "10:30", title: "Sessão de estudos", detail: "10:30 - 11:30 · Biblioteca", color: "green" },
  { day: 0, time: "12:00", title: "Pausa para almoço", detail: "12:00 - 13:00", color: "yellow" },
  { day: 0, time: "14:00", title: "Projeto de ciências", detail: "14:00 - 15:30 · Laboratório", color: "blue" },
  { day: 1, time: "10:00", title: "Laboratório de biologia", detail: "10:00 - 11:30 · Sala 108", color: "green" },
  { day: 2, time: "13:30", title: "Grupo de história", detail: "13:30 - 14:30 · Biblioteca", color: "yellow" },
  { day: 3, time: "08:30", title: "Aula de inglês", detail: "08:30 - 09:30 · Sala 112", color: "blue" },
  { day: 4, time: "11:00", title: "Revisão semanal", detail: "11:00 - 12:00 · Biblioteca", color: "green" },
];

const today = new Date();
const dateInputValue = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};
const dateFromOffset = (offset) => {
  const date = new Date(today);
  date.setDate(date.getDate() + offset);
  return dateInputValue(date);
};
const readStored = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};
let tasks = readStored(taskStorageKey, sampleTasks.map((task, index) => ({
  ...task,
  due: dateFromOffset(task.dueOffset),
  completed: false,
  id: `task-${Date.now()}-${index}`,
})));
tasks = tasks.map(({ dueOffset, ...task }) => task);
let notes = readStored(noteStorageKey, sampleNotes.map((note, index) => ({ ...note, id: `note-${Date.now()}-${index}` })));
let studySessions = readStored(studySessionStorageKey, []);
let activeTaskId = null;
let activeNoteId = null;
const startOfWeek = (date) => {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
};
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
let weekStart = startOfWeek(today);
let selectedDate = dateInputValue(today);
let googleClientId = localStorage.getItem(googleClientIdStorageKey) || "";
let googleAccessToken = null;
let googleEvents = null;
let googleCalendarConfiguration = null;
let googleIdentityScriptPromise = null;
let googleIdentityReady = false;
let calendarAuthInProgress = false;
let calendarSyncInProgress = false;

const googleCalendarScope = "https://www.googleapis.com/auth/calendar.events";
const googleCalendarApiUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const googleClientIdPattern = /^[a-z0-9.-]+\.apps\.googleusercontent\.com$/i;

const saveTasks = () => localStorage.setItem(taskStorageKey, JSON.stringify(tasks));
const saveNotes = () => localStorage.setItem(noteStorageKey, JSON.stringify(notes));
const saveStudySessions = () => localStorage.setItem(studySessionStorageKey, JSON.stringify(studySessions));
const readStoredAuth = () => {
  try {
    return JSON.parse(localStorage.getItem(authStorageKey) || "[]");
  } catch {
    return [];
  }
};
let authUsers = readStoredAuth();
let currentUser = null;
let authMode = "login";
let authSubmitInProgress = false;

const hashPassword = async (password, salt) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const createAuthSalt = () => `${Date.now()}-${crypto.randomUUID()}`;
const formatUserName = (username) => username.trim().replace(/\s+/g, " ");
const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem(sessionStorageKey));
  } catch {
    return null;
  }
};
currentUser = getCurrentUser();
const saveAuthUsers = () => localStorage.setItem(authStorageKey, JSON.stringify(authUsers));
const setAuthSession = (session) => {
  currentUser = session;
  localStorage.setItem(sessionStorageKey, JSON.stringify(session));
  document.querySelector("#profile-name").textContent = session.name;
  document.querySelector(".avatar").textContent = session.name.slice(0, 2).toUpperCase();
  document.querySelector("#open-auth").textContent = "Sair";
};
const showAuthDialog = (mode = "login") => {
  authMode = mode;
  const form = document.querySelector("#auth-form");
  const title = document.querySelector("#auth-dialog-title");
  const submitButton = document.querySelector("#auth-submit");
  form.elements.username.value = "";
  form.elements.password.value = "";
  title.textContent = mode === "login" ? "Entrar no StudyBuddy" : "Criar conta no StudyBuddy";
  submitButton.textContent = mode === "login" ? "Entrar" : "Criar conta";
  document.querySelector("#auth-message").textContent = mode === "login"
    ? "Entre com sua conta para manter seus dados organizados."
    : "Crie uma conta local. A senha é armazenada como hash.";
  document.querySelector("#auth-dialog").showModal();
};
const createElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const formatDueDate = (value) => {
  if (!value) return "Sem prazo";
  const due = new Date(`${value}T12:00:00`);
  if (value === dateInputValue(today)) return "Hoje";
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === dateInputValue(tomorrow)) return "Amanhã";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(due);
};
const formatStudyDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours && remainingMinutes) return `${hours}h ${remainingMinutes}min`;
  if (hours) return `${hours}h`;
  return `${remainingMinutes} min`;
};

function renderTasks() {
  const list = document.querySelector("#task-list");
  const status = document.querySelector("#task-status-filter").value;
  const priority = document.querySelector("#task-priority-filter").value;
  const openCount = tasks.filter((task) => !task.completed).length;
  document.querySelector("#task-count").textContent = `${openCount} ${openCount === 1 ? "aberta" : "abertas"}`;
  list.replaceChildren();

  const visibleTasks = tasks.filter((task) => {
    const statusMatches = status === "all" || (status === "completed" ? task.completed : !task.completed);
    return statusMatches && (priority === "all" || task.priority === priority);
  });
  if (visibleTasks.length === 0) {
    const empty = createElement("li", "empty-state", "Nenhuma tarefa neste filtro.");
    list.append(empty);
    return;
  }

  visibleTasks.forEach((task) => {
    const row = createElement("li", `task-row${task.completed ? " is-completed" : ""}`);
    const complete = createElement("button", `task-check${task.completed ? " is-checked" : ""}`);
    complete.type = "button";
    complete.setAttribute("aria-label", task.completed ? `Reabrir ${task.title}` : `Concluir ${task.title}`);
    complete.setAttribute("aria-pressed", String(task.completed));
    complete.addEventListener("click", () => {
      task.completed = !task.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;
      saveTasks();
      renderTasks();
    });
    const copy = createElement("span", "task-copy");
    copy.append(createElement("strong", "", task.title), createElement("small", "", task.details || "Sem detalhes"));
    const badge = createElement("span", `priority priority-${task.priority}`, priorityLabels[task.priority]);
    const due = createElement("time", "", formatDueDate(task.due));
    if (task.due) due.dateTime = task.due;
    const actions = createElement("span", "task-actions");
    const edit = createElement("button", "row-action", "Editar");
    edit.type = "button";
    edit.addEventListener("click", () => openTaskEditor(task));
    const remove = createElement("button", "row-action delete-action", "Excluir");
    remove.type = "button";
    remove.addEventListener("click", () => {
      tasks = tasks.filter((item) => item.id !== task.id);
      saveTasks();
      renderTasks();
    });
    actions.append(edit, remove);
    row.append(complete, copy, badge, due, actions);
    list.append(row);
  });
}

function openTaskEditor(task) {
  activeTaskId = task.id;
  const form = document.querySelector("#task-edit-form");
  form.elements.title.value = task.title;
  form.elements.details.value = task.details || "";
  form.elements.due.value = task.due || "";
  form.elements.priority.value = task.priority;
  document.querySelector("#task-dialog").showModal();
}

function renderNotes() {
  const grid = document.querySelector("#notes-grid");
  grid.replaceChildren();
  if (notes.length === 0) grid.append(createElement("p", "empty-state", "Suas notas rápidas aparecerão aqui."));
  notes.forEach((note) => {
    const card = createElement("article", `note note-${note.color}`);
    card.append(createElement("span", "note-pin"), createElement("h3", "", note.title), createElement("p", "", note.body));
    const actions = createElement("div", "note-actions");
    const edit = createElement("button", "row-action", "Editar");
    edit.type = "button";
    edit.addEventListener("click", () => openNoteEditor(note));
    const remove = createElement("button", "row-action delete-action", "Excluir");
    remove.type = "button";
    remove.addEventListener("click", () => {
      notes = notes.filter((item) => item.id !== note.id);
      saveNotes();
      renderNotes();
    });
    actions.append(edit, remove);
    card.append(actions);
    grid.append(card);
  });
}

function openNoteEditor(note) {
  activeNoteId = note?.id || null;
  const form = document.querySelector("#note-edit-form");
  form.elements.title.value = note?.title || "";
  form.elements.body.value = note?.body || "";
  form.elements.color.value = note?.color || "yellow";
  document.querySelector("#note-dialog-title").textContent = note ? "Editar nota" : "Nova nota";
  document.querySelector("#note-dialog").showModal();
}

function renderCalendar() {
  const strip = document.querySelector("#week-strip");
  const schedule = document.querySelector("#schedule");
  const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const monthDate = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(weekStart);
  document.querySelector("#month-label").textContent = monthDate.charAt(0).toUpperCase() + monthDate.slice(1);
  strip.replaceChildren();
  const weekDates = weekdayLabels.map((label, index) => {
    const date = addDays(weekStart, index);
    const value = dateInputValue(date);
    const button = createElement("button", `day-cell${value === dateInputValue(today) ? " is-today" : ""}${value === selectedDate ? " is-selected" : ""}`);
    button.type = "button";
    button.setAttribute("aria-label", new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(date));
    button.setAttribute("aria-pressed", String(value === selectedDate));
    button.append(createElement("span", "", label), createElement("strong", "", String(date.getDate()).padStart(2, "0")));
    button.addEventListener("click", () => {
      selectedDate = value;
      renderCalendar();
    });
    strip.append(button);
    return { date, value };
  });
  const dayIndex = weekDates.findIndex(({ value }) => value === selectedDate);
  const selected = weekDates[dayIndex];
  schedule.setAttribute("aria-label", `Compromissos de ${new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(selected.date)}`);
  schedule.replaceChildren();
  const events = googleEvents
    ? googleEvents.filter((event) => event.date === selectedDate)
    : sampleEvents.filter((event) => event.day === dayIndex);
  if (events.length === 0) schedule.append(createElement("p", "empty-state", "Sem eventos para este dia."));
  events.forEach((event) => {
    const row = createElement("div", "schedule-row");
    row.append(createElement("time", "", event.time), createElement("span", `event-dot ${event.color || "blue"}-dot`));
    const details = createElement("div", `event event-${event.color}`);
    details.append(createElement("strong", "", event.title));
    if (event.detail) details.append(createElement("small", "", event.detail));
    if (event.description) details.append(createElement("small", "event-description", event.description));
    if (event.attendees?.length) {
      const names = event.attendees.slice(0, 3).map((attendee) => attendee.displayName || attendee.email).filter(Boolean);
      if (names.length) details.append(createElement("small", "", `Participantes: ${names.join(", ")}${event.attendees.length > 3 ? ` +${event.attendees.length - 3}` : ""}`));
    }
    row.append(details);
    schedule.append(row);
  });
}

function renderProgress() {
  const completed = tasks.filter((task) => task.completed).length;
  document.querySelector("#completed-count").textContent = `${completed} ${completed === 1 ? "tarefa concluída" : "tarefas concluídas"}`;

  const currentDate = new Date();
  const currentWeekStart = startOfWeek(currentDate);
  const nextWeekStart = addDays(currentWeekStart, 7);
  const sessionsThisWeek = studySessions.filter((session) => {
    const sessionDate = new Date(session.createdAt);
    return sessionDate >= currentWeekStart && sessionDate < nextWeekStart;
  });
  const totalMinutes = sessionsThisWeek.reduce((total, session) => total + Number(session.minutes || 0), 0);
  document.querySelector("#study-total").textContent = formatStudyDuration(totalMinutes);

  const minutesByDay = Array(7).fill(0);
  const minutesBySubject = new Map();
  sessionsThisWeek.forEach((session) => {
    const day = (new Date(session.createdAt).getDay() + 6) % 7;
    const minutes = Number(session.minutes || 0);
    minutesByDay[day] += minutes;
    minutesBySubject.set(session.subject, (minutesBySubject.get(session.subject) || 0) + minutes);
  });

  const chart = document.querySelector("#study-chart");
  const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const maxDayMinutes = Math.max(30, ...minutesByDay);
  chart.replaceChildren();
  weekdayLabels.forEach((label, index) => {
    const day = addDays(currentWeekStart, index);
    const column = createElement("div", `chart-column${dateInputValue(day) === dateInputValue(currentDate) ? " is-current" : ""}`);
    const bar = createElement("span");
    bar.style.setProperty("--bar-height", `${Math.max(4, (minutesByDay[index] / maxDayMinutes) * 100)}%`);
    bar.setAttribute("aria-hidden", "true");
    column.append(bar, createElement("small", "", label));
    chart.append(column);
  });
  chart.setAttribute("aria-label", `Tempo de estudo nesta semana: ${minutesByDay.map((minutes, index) => `${weekdayLabels[index]} ${minutes} minutos`).join(", ")}`);

  const subjectProgress = document.querySelector("#subject-progress");
  subjectProgress.replaceChildren();
  if (minutesBySubject.size === 0) {
    subjectProgress.append(createElement("p", "empty-state", "Registre uma sessão para acompanhar as matérias."));
    return;
  }
  [...minutesBySubject.entries()].sort((first, second) => second[1] - first[1]).forEach(([subject, minutes]) => {
    const row = createElement("div", "subject-row");
    const label = createElement("span", "", subject);
    const track = createElement("div", "progress-track");
    const bar = createElement("span");
    bar.style.width = `${Math.round((minutes / totalMinutes) * 100)}%`;
    track.append(bar);
    row.append(label, track, createElement("strong", "", formatStudyDuration(minutes)));
    subjectProgress.append(row);
  });
}

async function loadQuote() {
  try {
    const response = await fetch("/api/quote");
    if (!response.ok) throw new Error("A API de frases está indisponível.");
    const data = await response.json();
    document.querySelector("#quote-text").textContent = data.quote;
    document.querySelector("#quote-author").textContent = data.author;
    document.querySelector("#quote-status").textContent = data.source === "ZenQuotes" ? "Inspiração para seus estudos." : "Frase local; API indisponível no momento.";
  } catch {
    document.querySelector("#quote-status").textContent = "Frase local; API indisponível no momento.";
  }
}

async function loadCalendarConfiguration() {
  let calendarConfiguration = null;
  try {
    const response = await fetch("/api/google/config");
    if (!response.ok) throw new Error("A configuração do Google não está disponível.");
    calendarConfiguration = await response.json();
    googleCalendarConfiguration = calendarConfiguration;
    googleClientId = localStorage.getItem(googleClientIdStorageKey) || calendarConfiguration.clientId || "";
  } catch {
    googleClientId = localStorage.getItem(googleClientIdStorageKey) || "";
  }

  document.querySelector("#google-client-id").value = googleClientId;
  const connectButton = document.querySelector("#google-connect");
  connectButton.disabled = true;
  connectButton.title = googleClientId ? "Aguarde o serviço do Google carregar." : "Configure o OAuth Client ID primeiro.";

  if (googleClientId) {
    try {
      await loadGoogleIdentityScript();
      googleIdentityReady = true;
      connectButton.disabled = false;
      connectButton.title = "Conectar com o Google Calendar";
      document.querySelector("#calendar-status").textContent = calendarConfiguration?.configured
        ? "Client ID disponível. Conecte sua conta para importar eventos."
        : "Client ID salvo neste navegador. Conecte sua conta para importar eventos.";
    } catch (error) {
      googleIdentityReady = false;
      document.querySelector("#calendar-status").textContent = `Não foi possível preparar o Google: ${error.message}`;
    }
  } else {
    document.querySelector("#calendar-status").textContent = "Agenda de demonstração ativa. A conexão Google ainda não foi configurada neste site.";
  }
}

function updateCalendarConnection() {
  const connected = Boolean(googleAccessToken);
  document.querySelector("#google-connect").hidden = connected;
  document.querySelector("#google-connect").disabled = !googleClientId || !googleIdentityReady || calendarAuthInProgress;
  document.querySelector("#google-refresh").hidden = !connected;
  document.querySelector("#google-refresh").disabled = calendarSyncInProgress;
  document.querySelector("#google-disconnect").hidden = !connected;
  document.querySelector("#google-disconnect").disabled = calendarSyncInProgress;
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => reject(new Error("O serviço de autorização do Google demorou para responder.")), 10000);
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      if (window.google?.accounts?.oauth2) resolve();
      else reject(new Error("O serviço de autorização do Google não iniciou corretamente."));
    };
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Não foi possível carregar o serviço de autorização do Google."));
    };
    document.head.append(script);
  }).catch((error) => {
    googleIdentityScriptPromise = null;
    throw error;
  });
  return googleIdentityScriptPromise;
}

async function connectGoogleCalendar() {
  if (!googleClientId) {
    document.querySelector("#calendar-status").textContent = "A conexão Google ainda não foi configurada neste site. A agenda de demonstração continua disponível.";
    return;
  }
  if (calendarAuthInProgress) return;
  if (!googleIdentityReady || !window.google?.accounts?.oauth2) {
    document.querySelector("#calendar-status").textContent = "A conexão Google não está pronta. Recarregue a página e tente novamente.";
    return;
  }
  calendarAuthInProgress = true;
  updateCalendarConnection();
  document.querySelector("#calendar-status").textContent = "Aguardando autorização do Google...";
  try {
    googleAccessToken = await new Promise((resolve, reject) => {
      let authorizationTimeout;
      const fail = (error) => {
        clearTimeout(authorizationTimeout);
        reject(error);
      };
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: googleCalendarScope,
        callback: (tokenResponse) => {
          clearTimeout(authorizationTimeout);
          if (tokenResponse.error) reject(new Error(tokenResponse.error_description || tokenResponse.error));
          else if (tokenResponse.access_token) resolve(tokenResponse.access_token);
          else reject(new Error("O Google não retornou um token de acesso."));
        },
        error_callback: (error) => fail(new Error(error.message || error.type || "A autorização foi cancelada.")),
      });
      authorizationTimeout = setTimeout(() => fail(new Error("A autorização não foi concluída. Tente conectar novamente.")), 120000);
      try {
        tokenClient.requestAccessToken();
      } catch (error) {
        fail(error);
      }
    });
  } catch (error) {
    googleAccessToken = null;
    document.querySelector("#calendar-status").textContent = `Não foi possível conectar: ${error.message}`;
  } finally {
    calendarAuthInProgress = false;
    updateCalendarConnection();
  }
  if (googleAccessToken) {
    await loadCalendarEvents();
    await syncTasksToGoogleCalendar();
  }
}

function formatCalendarTime(dateTime) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateTime));
}

function toGoogleDateTime(dateValue) {
  if (!dateValue) return null;
  const date = new Date(`${dateValue}T12:00:00`);
  return date.toISOString();
}

async function createGoogleEvent(task) {
  if (!googleAccessToken || !task.due) return;
  const startDate = toGoogleDateTime(task.due);
  const endDate = new Date(`${task.due}T13:00:00`);
  const event = {
    summary: task.title,
    description: task.details || "Tarefa criada no StudyBuddy.",
    start: { dateTime: startDate },
    end: { dateTime: endDate.toISOString() },
    location: "StudyBuddy",
    attendees: [],
    extendedProperties: { private: { studybuddyTaskId: task.id } },
  };
  const response = await fetch(`${googleCalendarApiUrl}?${new URLSearchParams({ fields: "id,summary,description,start,end,location,attendees" })}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${googleAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error?.message || "Não foi possível criar o evento no Google Calendar.");
  }
  const result = await response.json();
  task.googleEventId = result.id;
  saveTasks();
}

async function syncTasksToGoogleCalendar() {
  if (!googleAccessToken) return;
  await Promise.all(tasks
    .filter((task) => task.due && !task.completed && !task.googleEventId)
    .slice(0, 50)
    .map((task) => createGoogleEvent(task).catch((error) => {
      console.warn(`Não foi possível sincronizar ${task.title}:`, error.message);
    })));
}

async function loadCalendarEvents() {
  if (!googleAccessToken) {
    googleEvents = null;
    renderCalendar();
    return;
  }
  if (calendarSyncInProgress) return;

  calendarSyncInProgress = true;
  updateCalendarConnection();
  const weekEnd = addDays(weekStart, 7);
  document.querySelector("#calendar-status").textContent = "Carregando eventos do Google Calendar...";
  try {
    const calendarItems = [];
    let pageToken = "";
    do {
      const parameters = new URLSearchParams({
        timeMin: weekStart.toISOString(),
        timeMax: weekEnd.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "100",
        fields: "nextPageToken,items(id,summary,description,start(date,dateTime),end(date,dateTime),location,attendees(displayName,email))",
      });
      if (pageToken) parameters.set("pageToken", pageToken);
      const response = await fetch(`${googleCalendarApiUrl}?${parameters}`, {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      const result = await response.json();
      if (!response.ok) {
        const error = new Error(result.error?.message || "Falha ao buscar eventos.");
        error.status = response.status;
        throw error;
      }
      calendarItems.push(...(result.items || []));
      pageToken = result.nextPageToken || "";
    } while (pageToken);

    googleEvents = calendarItems.map((event, index) => {
      const allDay = Boolean(event.start.date);
      const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(`${event.start.date}T00:00:00`);
      const startTime = allDay ? "Dia todo" : formatCalendarTime(event.start.dateTime);
      const endTime = event.end.dateTime ? formatCalendarTime(event.end.dateTime) : "";
      const timeRange = endTime ? `${startTime} - ${endTime}` : startTime;
      const detail = [timeRange, event.location].filter(Boolean).join(" · ");
      return {
        id: event.id,
        date: event.start.date || dateInputValue(start),
        time: startTime,
        title: event.summary || "Evento sem título",
        description: event.description || "",
        detail,
        location: event.location || "",
        attendees: event.attendees || [],
        startDateTime: event.start.dateTime || event.start.date || null,
        endDateTime: event.end.dateTime || event.end.date || null,
        color: ["blue", "green", "yellow"][index % 3],
      };
    });
    const eventCount = googleEvents.length;
    document.querySelector("#calendar-status").textContent = `Google Calendar conectado · ${eventCount} ${eventCount === 1 ? "evento" : "eventos"} nesta semana.`;
    renderCalendar();
  } catch (error) {
    googleEvents = null;
    if (error.status === 401) {
      googleAccessToken = null;
      document.querySelector("#calendar-status").textContent = "Sua autorização expirou. Conecte sua conta novamente; por enquanto, exibimos eventos de exemplo.";
    } else if (error.status === 403) {
      document.querySelector("#calendar-status").textContent = "O Google não autorizou a leitura. Confira se a Calendar API está ativada e aprovada no projeto.";
    } else {
      document.querySelector("#calendar-status").textContent = `Não foi possível atualizar a agenda. Exibindo eventos de exemplo. ${error.message}`;
    }
    renderCalendar();
  } finally {
    calendarSyncInProgress = false;
    updateCalendarConnection();
  }
}

document.querySelector("#current-date").textContent = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
}).format(today);

document.querySelector("#task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  tasks.unshift({
    id: `task-${Date.now()}`,
    title: form.elements.title.value.trim(),
    details: form.elements.details.value.trim(),
    due: form.elements.due.value,
    priority: form.elements.priority.value,
    kind: form.elements.kind.value,
    completed: false,
  });
  saveTasks();
  form.reset();
  form.elements.priority.value = "medium";
  form.elements.kind.value = "deadline";
  if (googleAccessToken) syncTasksToGoogleCalendar();
  renderTasks();
});
document.querySelector("#task-status-filter").addEventListener("change", renderTasks);
document.querySelector("#task-priority-filter").addEventListener("change", renderTasks);
document.querySelector("#task-edit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    document.querySelector("#task-dialog").close();
    return;
  }
  const form = event.currentTarget;
  const task = tasks.find((item) => item.id === activeTaskId);
  if (task) Object.assign(task, {
    title: form.elements.title.value.trim(),
    details: form.elements.details.value.trim(),
    due: form.elements.due.value,
    priority: form.elements.priority.value,
    kind: form.elements.kind.value,
  });
  saveTasks();
  if (googleAccessToken) syncTasksToGoogleCalendar();
  document.querySelector("#task-dialog").close();
  activeTaskId = null;
  renderTasks();
});
document.querySelector("#add-note").addEventListener("click", () => openNoteEditor());
document.querySelector("#note-edit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    document.querySelector("#note-dialog").close();
    return;
  }
  const form = event.currentTarget;
  const noteData = {
    title: form.elements.title.value.trim(),
    body: form.elements.body.value.trim(),
    color: form.elements.color.value,
  };
  if (activeNoteId) {
    const note = notes.find((item) => item.id === activeNoteId);
    if (note) Object.assign(note, noteData);
  } else {
    notes.unshift({ ...noteData, id: `note-${Date.now()}` });
  }
  saveNotes();
  document.querySelector("#note-dialog").close();
  activeNoteId = null;
  renderNotes();
});
document.querySelector("#google-connect").addEventListener("click", connectGoogleCalendar);
document.querySelector("#google-config-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submittedClientId = event.currentTarget.elements.clientId.value.trim();
  if (!googleClientIdPattern.test(submittedClientId)) {
    document.querySelector("#calendar-status").textContent = "Informe um OAuth Client ID válido no formato ...apps.googleusercontent.com.";
    return;
  }

  googleClientId = submittedClientId;
  localStorage.setItem(googleClientIdStorageKey, googleClientId);
  googleIdentityReady = false;
  document.querySelector("#google-connect").disabled = true;
  document.querySelector("#calendar-status").textContent = "Preparando conexão com o Google...";
  try {
    await loadGoogleIdentityScript();
    googleIdentityReady = true;
    document.querySelector("#google-settings").open = false;
    document.querySelector("#calendar-status").textContent = "Client ID salvo neste navegador. Agora você pode conectar sua agenda.";
  } catch (error) {
    document.querySelector("#calendar-status").textContent = `Não foi possível preparar o Google: ${error.message}`;
  }
  updateCalendarConnection();
});
document.querySelector("#google-refresh").addEventListener("click", loadCalendarEvents);
document.querySelector("#google-disconnect").addEventListener("click", () => {
  const token = googleAccessToken;
  if (token && window.google?.accounts?.oauth2?.revoke) window.google.accounts.oauth2.revoke(token, () => {});
  googleAccessToken = null;
  googleEvents = null;
  updateCalendarConnection();
  document.querySelector("#calendar-status").textContent = "Google Calendar desconectado. Exibindo eventos de exemplo.";
  renderCalendar();
});
document.querySelector("#open-auth").addEventListener("click", () => {
  if (currentUser) {
    localStorage.removeItem(sessionStorageKey);
    currentUser = null;
    document.querySelector("#profile-name").textContent = "Ana Ribeiro";
    document.querySelector(".avatar").textContent = "AR";
    document.querySelector("#open-auth").textContent = "Entrar";
    return;
  }
  showAuthDialog("login");
});
document.querySelector("#auth-mode-toggle").addEventListener("click", () => {
  const nextMode = authMode === "login" ? "register" : "login";
  showAuthDialog(nextMode);
});
document.querySelector("#auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (authSubmitInProgress) return;
  const username = formatUserName(event.currentTarget.elements.username.value);
  const password = event.currentTarget.elements.password.value;
  const message = document.querySelector("#auth-message");

  if (username.length < 3 || password.length < 6) {
    message.textContent = "Use um nome com pelo menos 3 caracteres e uma senha com pelo menos 6.";
    return;
  }

  authSubmitInProgress = true;
  document.querySelector("#auth-submit").disabled = true;
  try {
    if (authMode === "register") {
      if (authUsers.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
        message.textContent = "Já existe uma conta com esse nome.";
        return;
      }
      const salt = createAuthSalt();
      const user = {
        username: username.toLowerCase(),
        name: username,
        salt,
        passwordHash: await hashPassword(password, salt),
      };
      authUsers.push(user);
      saveAuthUsers();
      setAuthSession({ username: user.username, name: user.name });
      message.textContent = "Conta criada com sucesso.";
      document.querySelector("#auth-dialog").close();
    } else {
      const user = authUsers.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
      if (!user) {
        message.textContent = "Nome de usuário ou senha incorretos.";
        return;
      }
      const passwordHash = await hashPassword(password, user.salt);
      if (passwordHash !== user.passwordHash) {
        message.textContent = "Nome de usuário ou senha incorretos.";
        return;
      }
      setAuthSession({ username: user.username, name: user.name });
      document.querySelector("#auth-dialog").close();
    }
  } catch (error) {
    message.textContent = `Não foi possível concluir a autenticação: ${error.message}`;
  } finally {
    authSubmitInProgress = false;
    document.querySelector("#auth-submit").disabled = false;
  }
});
document.querySelector("#auth-cancel").addEventListener("click", () => document.querySelector("#auth-dialog").close());
document.querySelector("#add-study-session").addEventListener("click", () => {
  document.querySelector("#study-session-form").reset();
  document.querySelector("#study-session-form").elements.minutes.value = 25;
  document.querySelector("#study-dialog").showModal();
});
document.querySelector("#study-session-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    document.querySelector("#study-dialog").close();
    return;
  }
  const form = event.currentTarget;
  studySessions.unshift({
    id: `session-${Date.now()}`,
    subject: form.elements.subject.value.trim(),
    minutes: Number(form.elements.minutes.value),
    createdAt: new Date().toISOString(),
  });
  saveStudySessions();
  document.querySelector("#study-dialog").close();
  renderProgress();
});
document.querySelector("#previous-week").addEventListener("click", () => {
  weekStart = addDays(weekStart, -7);
  selectedDate = dateInputValue(weekStart);
  googleEvents = null;
  renderCalendar();
  if (googleAccessToken) loadCalendarEvents();
});
document.querySelector("#next-week").addEventListener("click", () => {
  weekStart = addDays(weekStart, 7);
  selectedDate = dateInputValue(weekStart);
  googleEvents = null;
  renderCalendar();
  if (googleAccessToken) loadCalendarEvents();
});

renderTasks();
renderNotes();
renderCalendar();
renderProgress();
loadQuote();
loadCalendarConfiguration();