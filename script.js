const stateKey = "layr-board-v1";

const defaultState = {
  tasks: [],
};

const board = document.querySelector(".board");
const addButton = document.getElementById("add-card");
const modal = document.getElementById("card-modal");
const form = document.getElementById("card-form");
const titleInput = document.getElementById("card-title");
const dueDateInput = document.getElementById("card-due");
const cancelButton = document.getElementById("cancel");
const focusToggle = document.getElementById("focus-toggle");
const columns = Array.from(document.querySelectorAll(".column"));
const navLinks = Array.from(document.querySelectorAll(".nav-link"));
const viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
const todayList = document.getElementById("today-list");

let boardState = loadState();
let focusMode = false;
let focusIndex = 0;
let activeView = "board";

function loadState() {
  try {
    const raw = localStorage.getItem(stateKey);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.tasks)) {
      return { tasks: parsed.tasks };
    }
    const tasks = [];
    ["todo", "doing", "done"].forEach((status) => {
      const column = Array.isArray(parsed[status]) ? parsed[status] : [];
      column.forEach((card) => {
        tasks.push({
          id: card.id,
          title: card.title,
          status,
          dueDate: card.dueDate || null,
          createdAt: card.createdAt || new Date().toISOString(),
          description: card.description || "",
          expanded: Boolean(card.expanded),
        });
      });
    });
    return { tasks };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(stateKey, JSON.stringify(boardState));
}

function formatRelativeDue(dueDate) {
  if (!dueDate) return "";
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "";
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((target - start) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === -1) return "Yesterday";
  return `${Math.abs(diffDays)} days ago`;
}

function toDateInputValue(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function findTask(cardId) {
  const index = boardState.tasks.findIndex((task) => task.id === cardId);
  if (index === -1) return null;
  return { index, task: boardState.tasks[index] };
}

function updateCardState(cardId, updates) {
  const found = findTask(cardId);
  if (!found) return null;
  Object.assign(found.task, updates);
  saveState();
  return found.task;
}

function deleteCard(cardId) {
  const found = findTask(cardId);
  if (!found) return;
  boardState.tasks.splice(found.index, 1);
  saveState();
  renderBoard();
}

function createCardElement(card) {
  const el = document.createElement("div");
  el.className = "card";
  el.draggable = true;
  el.dataset.id = card.id;

  const header = document.createElement("div");
  header.className = "card-header";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = card.title;
  title.setAttribute("role", "button");
  title.setAttribute("tabindex", "0");

  const titleInput = document.createElement("input");
  titleInput.className = "card-title-input";
  titleInput.type = "text";
  titleInput.maxLength = 80;
  titleInput.value = card.title;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "icon-button";
  editButton.setAttribute("aria-label", "Edit title");
  editButton.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.75V20h3.25l9.58-9.58-3.25-3.25L4 16.75zm15.71-9.04a1.003 1.003 0 0 0 0-1.42l-2-2a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.25 3.25 1.99-1.66z"/></svg>';

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-button";
  deleteButton.setAttribute("aria-label", "Delete card");
  deleteButton.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8z"/></svg>';

  actions.appendChild(editButton);
  actions.appendChild(deleteButton);

  header.appendChild(title);
  header.appendChild(titleInput);
  header.appendChild(actions);

  const body = document.createElement("div");
  body.className = "card-body";

  const dueRow = document.createElement("div");
  dueRow.className = "card-due";

  const dueLabel = document.createElement("span");
  dueLabel.className = "card-due-label";
  dueLabel.textContent = formatRelativeDue(card.dueDate);

  const dueInput = document.createElement("input");
  dueInput.className = "card-due-input";
  dueInput.type = "date";
  dueInput.value = toDateInputValue(card.dueDate);

  dueRow.appendChild(dueLabel);
  dueRow.appendChild(dueInput);

  const descText = document.createElement("p");
  descText.className = "card-desc-text";
  descText.textContent = card.description || "";

  const descInput = document.createElement("textarea");
  descInput.className = "card-desc-input";
  descInput.rows = 3;
  descInput.placeholder = "Add a description...";
  descInput.value = card.description || "";

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "card-toggle";
  toggleButton.textContent = card.expanded ? "Collapse" : "Details";

  body.appendChild(dueRow);
  body.appendChild(descText);
  body.appendChild(descInput);
  body.appendChild(toggleButton);

  el.appendChild(header);
  el.appendChild(body);

  el.classList.toggle("expanded", Boolean(card.expanded));
  el.classList.toggle("has-desc", Boolean(card.description && card.description.trim()));

  function startTitleEdit() {
    el.classList.add("editing-title");
    titleInput.value = card.title;
    titleInput.focus();
    titleInput.select();
  }

  function finishTitleEdit(save) {
    if (!el.classList.contains("editing-title")) return;
    if (save) {
      const nextTitle = titleInput.value.trim();
      if (nextTitle) {
        card.title = nextTitle;
        title.textContent = nextTitle;
        updateCardState(card.id, { title: nextTitle });
      }
    }
    el.classList.remove("editing-title");
  }

  title.addEventListener("click", startTitleEdit);
  title.addEventListener("keydown", (event) => {
    if (event.key === "Enter") startTitleEdit();
  });
  editButton.addEventListener("click", startTitleEdit);
  titleInput.addEventListener("blur", () => finishTitleEdit(true));
  titleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finishTitleEdit(true);
    }
    if (event.key === "Escape") {
      titleInput.value = card.title;
      finishTitleEdit(false);
    }
  });

  deleteButton.addEventListener("click", () => {
    deleteCard(card.id);
  });

  toggleButton.addEventListener("click", () => {
    const nextExpanded = !el.classList.contains("expanded");
    el.classList.toggle("expanded", nextExpanded);
    toggleButton.textContent = nextExpanded ? "Collapse" : "Details";
    updateCardState(card.id, { expanded: nextExpanded });
  });

  descInput.addEventListener("input", () => {
    const nextDesc = descInput.value.trimEnd();
    descText.textContent = nextDesc;
    el.classList.toggle("has-desc", Boolean(nextDesc.trim()));
    updateCardState(card.id, { description: nextDesc });
  });

  dueInput.addEventListener("change", () => {
    const nextDue = dueInput.value ? dueInput.value : null;
    dueLabel.textContent = formatRelativeDue(nextDue);
    updateCardState(card.id, { dueDate: nextDue });
  });

  el.addEventListener("dragstart", (event) => {
    if (
      event.target.closest(".card-actions") ||
      event.target.closest(".card-title-input") ||
      event.target.closest(".card-desc-input") ||
      event.target.closest(".card-toggle")
    ) {
      event.preventDefault();
      return;
    }
    el.classList.add("dragging");
    el.style.transform = "scale(1.03)";
    el.style.boxShadow = "0 18px 40px rgba(15, 23, 42, 0.18)";
  });

  el.addEventListener("dragend", () => {
    el.classList.remove("dragging");
    el.style.transform = "";
    el.style.boxShadow = "";
  });

  return el;
}

function renderColumn(columnKey) {
  const column = document.querySelector(`[data-cards="${columnKey}"]`);
  column.innerHTML = "";
  boardState.tasks
    .filter((task) => task.status === columnKey)
    .forEach((task) => {
      column.appendChild(createCardElement(task));
    });
}

function renderBoard() {
  renderColumn("todo");
  renderColumn("doing");
  renderColumn("done");
}

function isDueToday(dueDate) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

function renderToday() {
  if (!todayList) return;
  todayList.innerHTML = "";
  const tasks = boardState.tasks
    .filter((task) => task.status !== "done")
    .filter((task) => isDueToday(task.dueDate) || task.status === "doing");

  const sorted = tasks.sort((a, b) => {
    const aDue = isDueToday(a.dueDate);
    const bDue = isDueToday(b.dueDate);
    if (aDue !== bDue) return aDue ? -1 : 1;
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (a.status !== b.status) {
      return a.status === "doing" ? -1 : 1;
    }
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  sorted.forEach((task) => {
    const item = document.createElement("div");
    item.className = "today-item";

    const title = document.createElement("div");
    title.className = "today-item-title";
    title.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "today-item-meta";
    meta.textContent = task.status === "doing" ? "Doing" : "Due today";

    item.appendChild(title);
    item.appendChild(meta);
    todayList.appendChild(item);
  });
}

function setFocusColumn(index) {
  focusIndex = Math.max(0, Math.min(index, columns.length - 1));
  columns.forEach((column, columnIndex) => {
    column.classList.toggle("is-focus", columnIndex === focusIndex);
  });
}

function toggleFocusMode(force) {
  focusMode = typeof force === "boolean" ? force : !focusMode;
  document.body.classList.toggle("focus-mode", focusMode);
  focusToggle.setAttribute("aria-pressed", String(focusMode));
  focusToggle.textContent = focusMode ? "Exit focus" : "Focus mode";
  if (focusMode) {
    setFocusColumn(focusIndex);
  } else {
    columns.forEach((column) => column.classList.remove("is-focus"));
  }
}

function openModal() {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  titleInput.value = "";
  dueDateInput.value = "";
  titleInput.focus();
}

function closeModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function addCard(title) {
  const card = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    status: "todo",
    dueDate: dueDateInput.value ? dueDateInput.value : null,
    createdAt: new Date().toISOString(),
    description: "",
    expanded: false,
  };
  boardState.tasks.push(card);
  saveState();
  renderColumn("todo");
}

function moveCard(cardId, targetColumn) {
  const found = findTask(cardId);
  if (!found) return;
  found.task.status = targetColumn;
  saveState();
  renderBoard();
}

addButton.addEventListener("click", openModal);
focusToggle.addEventListener("click", () => toggleFocusMode());

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const nextView = link.dataset.view;
    if (!nextView) return;
    setActiveView(nextView);
  });
});

cancelButton.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;
  addCard(title);
  closeModal();
});

board.addEventListener("dragover", (event) => {
  event.preventDefault();
  const column = event.target.closest("[data-column]");
  if (!column) return;
  const cards = column.querySelector(".cards");
  const dragging = document.querySelector(".card.dragging");
  if (dragging && cards) {
    cards.appendChild(dragging);
  }
});

board.addEventListener("drop", (event) => {
  event.preventDefault();
  const column = event.target.closest("[data-column]");
  const dragging = document.querySelector(".card.dragging");
  if (!column || !dragging) return;
  moveCard(dragging.dataset.id, column.dataset.column);
});

document.addEventListener("keydown", (event) => {
  if (!focusMode) return;
  if (event.target.matches("input, textarea")) return;
  if (event.key === "1") setFocusColumn(0);
  if (event.key === "2") setFocusColumn(1);
  if (event.key === "3") setFocusColumn(2);
});

renderBoard();
renderToday();
setActiveView(activeView);

function setActiveView(view) {
  activeView = view;
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.view === activeView);
  });
  viewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.viewPanel === activeView);
  });
  if (activeView === "today") {
    renderToday();
  }
}
