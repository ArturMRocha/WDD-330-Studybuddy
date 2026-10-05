const taskStorageKey = "studybuddy.tasks.v1";
const noteStorageKey = "studybuddy.notes.v1";
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
let activeTaskId = null;
let activeNoteId = null;
let weekStart = new Date(today);
weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
weekStart.setHours(0, 0, 0, 0);
let selectedDate = dateInputValue(today);

const saveTasks = () => localStorage.setItem(taskStorageKey, JSON.stringify(tasks));
const saveNotes = () => localStorage.setItem(noteStorageKey, JSON.stringify(notes));
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
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
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
  const events = sampleEvents.filter((event) => event.day === dayIndex);
  if (events.length === 0) schedule.append(createElement("p", "empty-state", "Sem eventos para este dia."));
  events.forEach((event) => {
    const row = createElement("div", "schedule-row");
    row.append(createElement("time", "", event.time), createElement("span", `event-dot ${event.color}-dot`));
    const details = createElement("div", `event event-${event.color}`);
    details.append(createElement("strong", "", event.title), createElement("small", "", event.detail));
    row.append(details);
    schedule.append(row);
  });
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
    completed: false,
  });
  saveTasks();
  form.reset();
  form.elements.priority.value = "medium";
  renderTasks();
});
document.querySelector("#task-status-filter").addEventListener("change", renderTasks);
document.querySelector("#task-priority-filter").addEventListener("change", renderTasks);
document.querySelector("#task-edit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const task = tasks.find((item) => item.id === activeTaskId);
  if (task) Object.assign(task, {
    title: form.elements.title.value.trim(),
    details: form.elements.details.value.trim(),
    due: form.elements.due.value,
    priority: form.elements.priority.value,
  });
  saveTasks();
  document.querySelector("#task-dialog").close();
  renderTasks();
});
document.querySelector("#add-note").addEventListener("click", () => openNoteEditor());
document.querySelector("#note-edit-form").addEventListener("submit", (event) => {
  event.preventDefault();
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
  renderNotes();
});
document.querySelector("#previous-week").addEventListener("click", () => {
  weekStart.setDate(weekStart.getDate() - 7);
  selectedDate = dateInputValue(weekStart);
  renderCalendar();
});
document.querySelector("#next-week").addEventListener("click", () => {
  weekStart.setDate(weekStart.getDate() + 7);
  selectedDate = dateInputValue(weekStart);
  renderCalendar();
});

renderTasks();
renderNotes();
renderCalendar();