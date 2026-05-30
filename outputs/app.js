const STORAGE_KEY = "uw-life-informatics-tracker-v1";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const today = new Date();
const todayKey = formatDateKey(today);
let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDateKey = todayKey;

const form = document.getElementById("trackerForm");
const clearDayBtn = document.getElementById("clearDayBtn");
const recordStatus = document.getElementById("recordStatus");
const currentDateChip = document.getElementById("currentDateChip");
const todayHeading = document.getElementById("todayHeading");
const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");
const recordPreview = document.getElementById("recordPreview");

let state = loadState();

function loadState() {
  const fallback = { records: {}, lastOpenedDate: todayKey };

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }
    return {
      records: parsed.records || {},
      lastOpenedDate: parsed.lastOpenedDate || todayKey
    };
  } catch (error) {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function prettyDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function monthTitle(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function getFormData() {
  const formData = new FormData(form);

  return {
    sleepHours: formData.get("sleepHours") || "",
    energy: formData.get("energy") || "",
    mood: formData.get("mood") || "",
    water: formData.get("water") || "",
    mainClass: formData.get("mainClass") || "",
    infoFocus: formData.get("infoFocus") || "",
    studyTasks: formData.get("studyTasks") || "",
    habits: formData.getAll("habits"),
    nextCourse: formData.get("nextCourse") || "",
    studyMinutes: formData.get("studyMinutes") || "",
    reflection: formData.get("reflection") || "",
    savedAt: new Date().toISOString()
  };
}

function fillForm(data = {}) {
  if (!form) {
    return;
  }

  form.reset();

  Object.entries(data).forEach(([key, value]) => {
    if (key === "habits" || key === "savedAt") {
      return;
    }

    const field = form.elements.namedItem(key);
    if (field) {
      field.value = value;
    }
  });

  const selectedHabits = Array.isArray(data.habits) ? data.habits : [];
  Array.from(form.querySelectorAll('input[name="habits"]')).forEach((checkbox) => {
    checkbox.checked = selectedHabits.includes(checkbox.value);
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function updateNavActiveState() {
  const page = document.body.dataset.page;
  document.querySelectorAll(".site-link[data-page]").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === page);
  });
}

function handleNewDayReset() {
  const recordForToday = state.records[todayKey];

  if (state.lastOpenedDate !== todayKey && !recordForToday) {
    fillForm();
  } else if (recordForToday) {
    fillForm(recordForToday);
  }

  state.lastOpenedDate = todayKey;
  saveState();
}

function renderStatus() {
  if (!recordStatus || !currentDateChip || !todayHeading) {
    return;
  }

  currentDateChip.textContent = prettyDate(todayKey);
  todayHeading.textContent = `Daily record for ${prettyDate(todayKey)}`;

  if (state.records[todayKey]) {
    recordStatus.textContent = "Saved for today";
  } else if (state.lastOpenedDate !== todayKey) {
    recordStatus.textContent = "New day, clean slate";
  } else {
    recordStatus.textContent = "Fresh day";
  }
}

function renderCalendar() {
  if (!calendarGrid || !calendarTitle) {
    return;
  }

  calendarGrid.innerHTML = "";
  calendarTitle.textContent = monthTitle(currentMonth);

  WEEKDAYS.forEach((day) => {
    const weekday = document.createElement("div");
    weekday.className = "weekday";
    weekday.textContent = day;
    calendarGrid.appendChild(weekday);
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < startWeekday; i += 1) {
    const spacer = document.createElement("button");
    spacer.className = "calendar-day muted";
    spacer.type = "button";
    spacer.disabled = true;
    calendarGrid.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;

    if (state.records[dateKey]) {
      button.classList.add("saved");
      const dot = document.createElement("span");
      dot.className = "dot";
      button.appendChild(dot);
    }

    if (dateKey === todayKey) {
      button.classList.add("today");
    }

    if (dateKey === selectedDateKey) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      selectedDateKey = dateKey;
      renderCalendar();
      renderPreview(dateKey);
    });

    calendarGrid.appendChild(button);
  }
}

function renderPreview(dateKey) {
  if (!recordPreview) {
    return;
  }

  const record = state.records[dateKey];

  if (!record) {
    recordPreview.innerHTML = `
      <h3>${prettyDate(dateKey)}</h3>
      <p>No saved record for this day yet.</p>
    `;
    return;
  }

  const habits = record.habits && record.habits.length ? record.habits.join(", ") : "None logged";

  recordPreview.innerHTML = `
    <h3>${prettyDate(dateKey)}</h3>
    <p><strong>Main class:</strong> ${escapeHtml(record.mainClass || "Not entered")}</p>
    <p><strong>Informatics focus:</strong> ${escapeHtml(record.infoFocus || "Not entered")}</p>
    <p><strong>Study minutes:</strong> ${escapeHtml(record.studyMinutes || "0")}</p>
    <p><strong>Habits:</strong> ${escapeHtml(habits)}</p>
    <p><strong>Reflection:</strong> ${escapeHtml(record.reflection || "No reflection saved")}</p>
  `;
}

function renderHomeSummary() {
  const statusTitle = document.getElementById("homeStatusTitle");
  const statusText = document.getElementById("homeStatusText");
  const savedDaysCount = document.getElementById("savedDaysCount");

  if (!statusTitle || !statusText || !savedDaysCount) {
    return;
  }

  const savedCount = Object.keys(state.records).length;
  const todayRecord = state.records[todayKey];

  savedDaysCount.textContent = String(savedCount);

  if (todayRecord) {
    statusTitle.textContent = "Today is saved";
    statusText.textContent = `${todayRecord.mainClass || "Your record"} is already logged for ${prettyDate(todayKey)}.`;
  } else {
    statusTitle.textContent = "Fresh day";
    statusText.textContent = "Open the tracker page to log today's record.";
  }
}

function initTrackerPage() {
  handleNewDayReset();
  renderStatus();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.records[todayKey] = getFormData();
    state.lastOpenedDate = todayKey;
    saveState();
    renderStatus();
    renderHomeSummary();
  });

  clearDayBtn.addEventListener("click", () => {
    delete state.records[todayKey];
    fillForm();
    saveState();
    renderStatus();
    renderHomeSummary();
  });
}

function initCalendarPage() {
  const prevMonthBtn = document.getElementById("prevMonthBtn");
  const nextMonthBtn = document.getElementById("nextMonthBtn");

  renderCalendar();
  renderPreview(todayKey);

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      renderCalendar();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      renderCalendar();
    });
  }
}

updateNavActiveState();
renderHomeSummary();

if (form) {
  initTrackerPage();
}

if (calendarGrid) {
  initCalendarPage();
}
