const dateLabel = document.querySelector("#current-date");

if (dateLabel) {
  dateLabel.textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());
}