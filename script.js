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
const effortInput = document.getElementById("card-effort");
const layerToggles = Array.from(document.querySelectorAll(".layer-toggle"));
const cancelButton = document.getElementById("cancel");
const focusToggle = document.getElementById("focus-toggle");
const columns = Array.from(document.querySelectorAll(".column"));
const navLinks = Array.from(document.querySelectorAll(".nav-link"));
const viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
const todayContent = document.getElementById("today-content");

let boardState = loadState();
let focusMode = false;
let focusIndex = 0;
let activeView = "board";
let visibleLayers = loadLayers();

function loadLayers() {
  try {
    const raw = localStorage.getItem("layr-layers");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { status: true, time: false, effort: false };
}

function saveLayers() {
  localStorage.setItem("layr-layers", JSON.stringify(visibleLayers));
}

function applyLayers() {
  document.body.classList.toggle("layer-time", visibleLayers.time);
  document.body.classList.toggle("layer-effort", visibleLayers.effort);
  layerToggles.forEach((btn) => {
    const layer = btn.dataset.layer;
    const isActive = visibleLayers[layer];
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
}

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

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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

  // === HEADER: Title + Actions ===
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

  const completeButton = document.createElement("button");
  completeButton.type = "button";
  completeButton.className = "icon-button complete-btn";
  completeButton.setAttribute("aria-label", "Mark complete");
  completeButton.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>';

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-button delete-btn";
  deleteButton.setAttribute("aria-label", "Delete card");
  deleteButton.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';

  actions.appendChild(completeButton);
  actions.appendChild(deleteButton);

  header.appendChild(title);
  header.appendChild(titleInput);
  header.appendChild(actions);

  // === META ROW: Always visible date & effort chips ===
  const metaRow = document.createElement("div");
  metaRow.className = "card-meta";

  // Helper to update meta display
  function updateMetaDisplay() {
    metaRow.innerHTML = "";

    // Due date chip
    if (card.dueDate) {
      const dueChip = document.createElement("span");
      dueChip.className = "card-chip card-chip-date";
      const dueText = formatRelativeDue(card.dueDate);
      if (card.status !== "done" && isOverdue(card.dueDate)) {
        dueChip.classList.add("is-overdue");
      }
      dueChip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg><span>${dueText}</span>`;
      metaRow.appendChild(dueChip);
    }

    // Effort chip
    if (card.effort) {
      const effortChip = document.createElement("span");
      effortChip.className = "card-chip card-chip-effort";
      effortChip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg><span>${card.effort}</span>`;
      metaRow.appendChild(effortChip);
    }

    // Show meta row only if there's content
    el.classList.toggle("has-meta", card.dueDate || card.effort);
  }

  updateMetaDisplay();

  // === EXPANDABLE BODY: Description + Edit Fields ===
  const body = document.createElement("div");
  body.className = "card-body";

  // Description section
  const descSection = document.createElement("div");
  descSection.className = "card-section";

  const descLabel = document.createElement("label");
  descLabel.className = "card-label";
  descLabel.textContent = "Notes";

  const descInput = document.createElement("textarea");
  descInput.className = "card-input card-desc-input";
  descInput.rows = 2;
  descInput.placeholder = "Add notes, links, context...";
  descInput.value = card.description || "";

  descSection.appendChild(descLabel);
  descSection.appendChild(descInput);

  // Date & Effort row
  const fieldsRow = document.createElement("div");
  fieldsRow.className = "card-fields-row";

  // Date field
  const dateField = document.createElement("div");
  dateField.className = "card-field";

  const dateLabel = document.createElement("label");
  dateLabel.className = "card-label";
  dateLabel.textContent = "Due date";

  const dateInput = document.createElement("input");
  dateInput.className = "card-input card-date-input";
  dateInput.type = "date";
  dateInput.value = toDateInputValue(card.dueDate);

  dateField.appendChild(dateLabel);
  dateField.appendChild(dateInput);

  // Effort field
  const effortField = document.createElement("div");
  effortField.className = "card-field";

  const effortLabel = document.createElement("label");
  effortLabel.className = "card-label";
  effortLabel.textContent = "Effort";

  const effortSelect = document.createElement("select");
  effortSelect.className = "card-input card-effort-select";
  effortSelect.innerHTML = `
    <option value="">No estimate</option>
    <option value="15m">15 min</option>
    <option value="30m">30 min</option>
    <option value="1h">1 hour</option>
    <option value="2h">2+ hours</option>
  `;
  effortSelect.value = card.effort || "";

  effortField.appendChild(effortLabel);
  effortField.appendChild(effortSelect);

  fieldsRow.appendChild(dateField);
  fieldsRow.appendChild(effortField);

  // Toggle button
  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "card-toggle";
  toggleButton.textContent = card.expanded ? "Collapse" : "Edit";

  body.appendChild(descSection);
  body.appendChild(fieldsRow);

  // === ASSEMBLE CARD ===
  el.appendChild(header);
  el.appendChild(metaRow);
  el.appendChild(body);
  el.appendChild(toggleButton);

  // === APPLY INITIAL STATE CLASSES ===
  el.classList.toggle("expanded", Boolean(card.expanded));
  el.classList.toggle("has-desc", Boolean(card.description && card.description.trim()));
  el.classList.toggle("is-done", card.status === "done");
  el.classList.toggle("has-due", Boolean(card.dueDate));
  el.classList.toggle("has-effort", Boolean(card.effort));
  el.classList.toggle("has-meta", Boolean(card.dueDate || card.effort));

  // === EVENT HANDLERS ===

  // Title editing
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

  // Complete/Delete actions
  completeButton.addEventListener("click", () => {
    if (card.status === "done") {
      moveCard(card.id, "todo");
    } else {
      moveCard(card.id, "done");
    }
  });

  deleteButton.addEventListener("click", () => {
    if (confirm("Delete this task?")) {
      deleteCard(card.id);
    }
  });

  // Toggle expand/collapse
  toggleButton.addEventListener("click", () => {
    const nextExpanded = !el.classList.contains("expanded");
    el.classList.toggle("expanded", nextExpanded);
    toggleButton.textContent = nextExpanded ? "Collapse" : "Edit";
    updateCardState(card.id, { expanded: nextExpanded });
    if (nextExpanded) {
      descInput.focus();
    }
  });

  // Description auto-save
  descInput.addEventListener("input", () => {
    const nextDesc = descInput.value.trimEnd();
    el.classList.toggle("has-desc", Boolean(nextDesc.trim()));
    updateCardState(card.id, { description: nextDesc });
  });

  // Date auto-save
  dateInput.addEventListener("change", () => {
    const nextDate = dateInput.value || null;
    card.dueDate = nextDate;
    el.classList.toggle("has-due", Boolean(nextDate));
    updateCardState(card.id, { dueDate: nextDate });
    updateMetaDisplay();
  });

  // Effort auto-save
  effortSelect.addEventListener("change", () => {
    const nextEffort = effortSelect.value || null;
    card.effort = nextEffort;
    el.classList.toggle("has-effort", Boolean(nextEffort));
    updateCardState(card.id, { effort: nextEffort });
    updateMetaDisplay();
  });

  // Drag & Drop
  el.addEventListener("dragstart", (event) => {
    if (
      event.target.closest(".card-actions") ||
      event.target.closest(".card-input") ||
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
  const countEl = document.querySelector(`[data-count="${columnKey}"]`);
  const emptyEl = document.querySelector(`[data-empty="${columnKey}"]`);
  column.innerHTML = "";
  const tasks = boardState.tasks.filter((task) => task.status === columnKey);
  tasks.forEach((task) => {
    column.appendChild(createCardElement(task));
  });
  if (countEl) countEl.textContent = tasks.length;
  if (emptyEl) emptyEl.classList.toggle("show", tasks.length === 0);
}

function updateStats() {
  const total = boardState.tasks.length;
  const totalEl = document.getElementById("stat-total");
  if (totalEl) totalEl.textContent = total;
}

function renderBoard() {
  renderColumn("todo");
  renderColumn("doing");
  renderColumn("done");
  updateStats();
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

function isOverdue(dueDate) {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return dueDay < today;
}

function renderToday() {
  if (!todayContent) return;
  todayContent.innerHTML = "";

  // Get all relevant tasks
  const allTasks = boardState.tasks.filter((task) => task.status !== "done");

  // Categorize tasks
  const inProgress = allTasks.filter((task) => task.status === "doing");
  const dueToday = allTasks.filter((task) => task.status !== "doing" && isDueToday(task.dueDate));
  const overdue = allTasks.filter((task) => task.status !== "doing" && isOverdue(task.dueDate));

  // Check if there are any tasks to show
  const hasAnyTasks = inProgress.length > 0 || dueToday.length > 0 || overdue.length > 0;

  if (!hasAnyTasks) {
    // Render empty state
    const emptyState = document.createElement("div");
    emptyState.className = "today-empty";
    emptyState.innerHTML = `
      <svg class="today-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3>All clear for today</h3>
      <p>No tasks due today or in progress. Enjoy your free time or add new tasks from the Board.</p>
    `;
    todayContent.appendChild(emptyState);
    return;
  }

  // Helper function to create a section
  function createSection(title, tasks, badgeType) {
    if (tasks.length === 0) return null;

    const section = document.createElement("div");
    section.className = "today-section";

    const header = document.createElement("div");
    header.className = "today-section-header";

    const sectionTitle = document.createElement("span");
    sectionTitle.className = "today-section-title";
    sectionTitle.textContent = title;

    const sectionCount = document.createElement("span");
    sectionCount.className = "today-section-count";
    sectionCount.textContent = tasks.length;

    header.appendChild(sectionTitle);
    header.appendChild(sectionCount);

    const list = document.createElement("div");
    list.className = "today-list";

    tasks.forEach((task) => {
      list.appendChild(createTodayItem(task, badgeType));
    });

    section.appendChild(header);
    section.appendChild(list);
    return section;
  }

  // Helper function to create a today item
  function createTodayItem(task, badgeType) {
    const item = document.createElement("div");
    item.className = "today-item";

    // Add state classes
    if (task.status === "doing") item.classList.add("is-doing");
    if (isDueToday(task.dueDate)) item.classList.add("is-due-today");
    if (isOverdue(task.dueDate)) item.classList.add("is-overdue");

    // Content wrapper
    const content = document.createElement("div");
    content.className = "today-item-content";

    const title = document.createElement("div");
    title.className = "today-item-title";
    title.textContent = task.title;
    content.appendChild(title);

    // Add description preview if exists
    if (task.description && task.description.trim()) {
      const desc = document.createElement("div");
      desc.className = "today-item-desc";
      desc.textContent = task.description;
      content.appendChild(desc);
    }

    item.appendChild(content);

    // Footer with badges
    const footer = document.createElement("div");
    footer.className = "today-item-footer";

    // Status badge
    const badge = document.createElement("span");
    badge.className = `today-badge badge-${badgeType}`;

    const dot = document.createElement("span");
    dot.className = "today-badge-dot";
    badge.appendChild(dot);

    const badgeText = document.createElement("span");
    if (badgeType === "doing") {
      badgeText.textContent = "In Progress";
    } else if (badgeType === "overdue") {
      badgeText.textContent = formatRelativeDue(task.dueDate);
    } else {
      badgeText.textContent = "Due Today";
    }
    badge.appendChild(badgeText);
    footer.appendChild(badge);

    // Effort chip if exists
    if (task.effort) {
      const effort = document.createElement("span");
      effort.className = "today-effort";
      effort.textContent = task.effort;
      footer.appendChild(effort);
    }

    item.appendChild(footer);

    // Click to navigate to board and highlight the card
    item.addEventListener("click", () => {
      setActiveView("board");
      // Small delay to let the view switch
      setTimeout(() => {
        const cardEl = document.querySelector(`.card[data-id="${task.id}"]`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
          cardEl.style.animation = "none";
          cardEl.offsetHeight; // Trigger reflow
          cardEl.style.animation = "cardEnter 0.3s ease";
        }
      }, 100);
    });

    return item;
  }

  // Render sections in order: Overdue, In Progress, Due Today
  const overdueSection = createSection("Overdue", overdue, "overdue");
  const inProgressSection = createSection("In Progress", inProgress, "doing");
  const dueTodaySection = createSection("Due Today", dueToday, "due");

  if (overdueSection) todayContent.appendChild(overdueSection);
  if (inProgressSection) todayContent.appendChild(inProgressSection);
  if (dueTodaySection) todayContent.appendChild(dueTodaySection);
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
  focusToggle.classList.toggle("is-active", focusMode);
  focusToggle.textContent = focusMode ? "Exit focus" : "Focus mode";
  if (focusMode) {
    const doingIndex = columns.findIndex(
      (column) => column.dataset.column === "doing"
    );
    setFocusColumn(doingIndex === -1 ? 1 : doingIndex);
  } else {
    columns.forEach((column) => column.classList.remove("is-focus"));
  }
}

function openModal() {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  titleInput.value = "";
  dueDateInput.value = "";
  effortInput.value = "";
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
    effort: effortInput.value || null,
    dueDate: dueDateInput.value ? dueDateInput.value : null,
    createdAt: new Date().toISOString(),
    description: "",
    expanded: false,
  };
  boardState.tasks.push(card);
  saveState();
  renderColumn("todo");
  updateStats();
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

layerToggles.forEach((btn) => {
  btn.addEventListener("click", () => {
    const layer = btn.dataset.layer;
    if (layer === "status") return; // Status is always on
    visibleLayers[layer] = !visibleLayers[layer];
    saveLayers();
    applyLayers();
  });
});

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
  if (event.key === "Escape") toggleFocusMode(false);
});

renderBoard();
renderToday();
setActiveView(activeView);
applyLayers();

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
