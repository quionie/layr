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
const navLinks = Array.from(document.querySelectorAll("[data-view]"));
const viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
const todayContent = document.getElementById("today-content");
const todayTitleEl = document.getElementById("today-title");
const todayCountOverdue = document.getElementById("today-count-overdue");
const todayCountDue = document.getElementById("today-count-due");
const todayCountDoing = document.getElementById("today-count-doing");
const todayCountTotal = document.getElementById("today-count-total");
const todayPulse = document.getElementById("today-pulse");
const backlogContent = document.getElementById("backlog-content");
const backlogSearchInput = document.getElementById("backlog-search-input");
const backlogCountEl = document.getElementById("backlog-count");
const viewModeBtns = Array.from(document.querySelectorAll(".view-mode-btn"));
const defaultViewSelect = document.getElementById("default-view");
const defaultTimelineSelect = document.getElementById("default-timeline-mode");
const defaultBacklogGroupSelect = document.getElementById("default-backlog-group");
const deleteBehaviorSelect = document.getElementById("delete-behavior");
const autoArchiveDaysInput = document.getElementById("auto-archive-days");
const defaultDueDateSelect = document.getElementById("default-due-date");
const showTopPickToggle = document.getElementById("show-top-pick");
const compactModeToggle = document.getElementById("compact-mode");
const showMetaChipsToggle = document.getElementById("show-meta-chips");
const reduceMotionToggle = document.getElementById("reduce-motion");
const exportDataBtn = document.getElementById("export-data");
const importDataBtn = document.getElementById("import-data");
const importFileInput = document.getElementById("import-file");
const restoreArchivedBtn = document.getElementById("restore-archived");
const clearArchiveSettingsBtn = document.getElementById("clear-archive-settings");
const resetDataBtn = document.getElementById("reset-data");

// Timeline elements
const timelineGrid = document.getElementById("timeline-grid");
const timelineDateRange = document.getElementById("timeline-date-range");
const timelineUnscheduledList = document.getElementById("timeline-unscheduled-list");
const timelineUnscheduledCount = document.getElementById("timeline-unscheduled-count");
const timelineModeBtns = Array.from(document.querySelectorAll(".timeline-mode-btn"));
const timelinePrevBtn = document.getElementById("timeline-prev");
const timelineNextBtn = document.getElementById("timeline-next");
const timelineTodayBtn = document.getElementById("timeline-today");
const archiveList = document.getElementById("archive-list");
const archiveCountEl = document.getElementById("archive-count");
const archiveSearchInput = document.getElementById("archive-search-input");
const archiveFilterBtns = Array.from(document.querySelectorAll(".archive-filter-btn"));
const archiveClearBtn = document.getElementById("archive-clear");

let boardState = loadState();
let backlogGroupMode = "schedule"; // "schedule" or "effort"
let backlogSearchQuery = "";
let timelineMode = "week"; // "week" or "month"
let timelineStartDate = getWeekStart(new Date());
let focusMode = false;
let focusIndex = 0;
let settings = loadSettings();
let activeView = settings.defaultView || "board";
let visibleLayers = loadLayers();
let archiveSearchQuery = "";
let archiveRange = "all";
let suppressTopPick = false;

backlogGroupMode = settings.defaultBacklogGroup || backlogGroupMode;
timelineMode = settings.defaultTimelineMode || timelineMode;

function applySettings() {
  document.body.classList.toggle("compact-mode", Boolean(settings.compactMode));
  document.body.classList.toggle("hide-meta", !settings.showMetaChips);
  document.body.classList.toggle("reduce-motion", Boolean(settings.reduceMotion));
}

function syncSettingsControls() {
  if (defaultViewSelect) defaultViewSelect.value = settings.defaultView || "board";
  if (defaultTimelineSelect) defaultTimelineSelect.value = settings.defaultTimelineMode || "week";
  if (defaultBacklogGroupSelect) defaultBacklogGroupSelect.value = settings.defaultBacklogGroup || "schedule";
  if (deleteBehaviorSelect) deleteBehaviorSelect.value = settings.deleteBehavior || "archive";
  if (autoArchiveDaysInput) autoArchiveDaysInput.value = Number(settings.autoArchiveDays || 0);
  if (defaultDueDateSelect) defaultDueDateSelect.value = settings.defaultDueDate || "none";
  if (showTopPickToggle) showTopPickToggle.checked = Boolean(settings.showTopPick);
  if (compactModeToggle) compactModeToggle.checked = Boolean(settings.compactMode);
  if (showMetaChipsToggle) showMetaChipsToggle.checked = Boolean(settings.showMetaChips);
  if (reduceMotionToggle) reduceMotionToggle.checked = Boolean(settings.reduceMotion);
}

function getDefaultDueDateValue() {
  const mode = settings.defaultDueDate || "none";
  if (mode === "today") return toLocalDateString(new Date());
  if (mode === "tomorrow") return toLocalDateString(addDays(new Date(), 1));
  return "";
}

function applyAutoArchive() {
  const days = Number(settings.autoArchiveDays || 0);
  if (!days || days <= 0) return;
  const now = new Date();
  const cutoffMs = days * 86400000;
  let changed = false;
  boardState.tasks.forEach((task) => {
    if (task.status !== "done" || !task.completedAt) return;
    const completed = new Date(task.completedAt);
    if (Number.isNaN(completed.getTime())) return;
    if (now - completed >= cutoffMs) {
      setTaskStatus(task, "archived");
      task.archivedAt = task.archivedAt || new Date().toISOString();
      changed = true;
    }
  });
  if (changed) saveState();
}

function loadSettings() {
  const defaults = {
    defaultView: "board",
    defaultTimelineMode: "week",
    defaultBacklogGroup: "schedule",
    deleteBehavior: "archive",
    autoArchiveDays: 0,
    defaultDueDate: "none",
    showTopPick: true,
    compactMode: false,
    showMetaChips: true,
    reduceMotion: false,
  };
  try {
    const raw = localStorage.getItem("layr-settings");
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
}

function saveSettings() {
  localStorage.setItem("layr-settings", JSON.stringify(settings));
}

function loadLayers() {
  try {
    const raw = localStorage.getItem("layr-layers");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { status: true, time: false, effort: false, weight: false };
}

function saveLayers() {
  localStorage.setItem("layr-layers", JSON.stringify(visibleLayers));
}

function applyLayers() {
  document.body.classList.toggle("layer-time", visibleLayers.time);
  document.body.classList.toggle("layer-effort", visibleLayers.effort);
  document.body.classList.toggle("layer-weight", visibleLayers.weight);
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
  const due = parseLocalDate(dueDate);
  if (!due) return "";
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

function formatShortDate(dateValue) {
  if (!dateValue) return "";
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatLongDate(dateValue) {
  if (!dateValue) return "";
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function toDateInputValue(dateValue) {
  if (!dateValue) return "";
  const date = parseLocalDate(dateValue);
  if (!date) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDateString(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateValue) {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) return null;
    return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
  }
  if (typeof dateValue === "string") {
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const parsed = new Date(year, month, day);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  const fallback = new Date(dateValue);
  if (Number.isNaN(fallback.getTime())) return null;
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

function setTaskStatus(task, nextStatus) {
  const prevStatus = task.status;
  task.status = nextStatus;
  if (nextStatus !== "archived") {
    task.archivedAt = null;
  }
  if (nextStatus === "done") {
    task.completedAt = task.completedAt || new Date().toISOString();
  } else if (prevStatus === "done") {
    task.completedAt = null;
  }
}

function isArchived(task) {
  return task.status === "archived";
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

function archiveCard(cardId) {
  const found = findTask(cardId);
  if (!found) return;
  setTaskStatus(found.task, "archived");
  found.task.archivedAt = found.task.archivedAt || new Date().toISOString();
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

    // Impact chip (weight layer)
    if (card.impact) {
      const impactChip = document.createElement("span");
      impactChip.className = `card-chip card-chip-impact impact-${card.impact}`;
      const impactLabels = { high: "High Impact", medium: "Medium", low: "Low" };
      impactChip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg><span>${impactLabels[card.impact]}</span>`;
      metaRow.appendChild(impactChip);
    }

    // Urgency chip (weight layer)
    if (card.urgency) {
      const urgencyChip = document.createElement("span");
      urgencyChip.className = `card-chip card-chip-urgency urgency-${card.urgency}`;
      const urgencyLabels = { high: "Urgent", medium: "Soon", low: "Later" };
      urgencyChip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg><span>${urgencyLabels[card.urgency]}</span>`;
      metaRow.appendChild(urgencyChip);
    }

    // Blocked indicator (weight layer)
    if (card.blockedBy) {
      const blockerTask = boardState.tasks.find(t => t.id === card.blockedBy);
      if (blockerTask) {
        const blockedChip = document.createElement("span");
        blockedChip.className = "card-chip card-chip-blocked";
        const blockerName = blockerTask.title.length > 20 ? blockerTask.title.slice(0, 20) + "..." : blockerTask.title;
        blockedChip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.902 7.902 0 014 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.902 7.902 0 0120 12c0 4.42-3.58 8-8 8z"/></svg><span>Blocked: ${blockerName}</span>`;
        metaRow.appendChild(blockedChip);
      }
    }

    // Show meta row only if there's content
    const hasMeta = card.dueDate || card.effort || card.impact || card.urgency || card.blockedBy;
    el.classList.toggle("has-meta", hasMeta);
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

  // Weight fields row (Impact & Urgency)
  const weightRow = document.createElement("div");
  weightRow.className = "card-fields-row card-weight-row";

  // Impact field
  const impactField = document.createElement("div");
  impactField.className = "card-field";

  const impactLabel = document.createElement("label");
  impactLabel.className = "card-label";
  impactLabel.textContent = "Impact";

  const impactSelect = document.createElement("select");
  impactSelect.className = "card-input card-weight-select";
  impactSelect.innerHTML = `
    <option value="">Not set</option>
    <option value="high">High - Moves the needle</option>
    <option value="medium">Medium - Important</option>
    <option value="low">Low - Nice to have</option>
  `;
  impactSelect.value = card.impact || "";

  impactField.appendChild(impactLabel);
  impactField.appendChild(impactSelect);

  // Urgency field
  const urgencyField = document.createElement("div");
  urgencyField.className = "card-field";

  const urgencyLabel = document.createElement("label");
  urgencyLabel.className = "card-label";
  urgencyLabel.textContent = "Urgency";

  const urgencySelect = document.createElement("select");
  urgencySelect.className = "card-input card-weight-select";
  urgencySelect.innerHTML = `
    <option value="">Not set</option>
    <option value="high">High - Decays fast</option>
    <option value="medium">Medium - Has deadline</option>
    <option value="low">Low - Can wait</option>
  `;
  urgencySelect.value = card.urgency || "";

  urgencyField.appendChild(urgencyLabel);
  urgencyField.appendChild(urgencySelect);

  weightRow.appendChild(impactField);
  weightRow.appendChild(urgencyField);

  // Blocked by field
  const blockedSection = document.createElement("div");
  blockedSection.className = "card-section card-blocked-section";

  const blockedLabel = document.createElement("label");
  blockedLabel.className = "card-label";
  blockedLabel.textContent = "Blocked by";

  const blockedSelect = document.createElement("select");
  blockedSelect.className = "card-input card-blocked-select";

  // Populate with other tasks (not self, not done)
  function updateBlockedOptions() {
    const currentValue = blockedSelect.value;
    blockedSelect.innerHTML = '<option value="">Nothing - Ready to work</option>';
    boardState.tasks
      .filter(t => t.id !== card.id && t.status !== "done" && t.status !== "archived")
      .forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.title.length > 40 ? t.title.slice(0, 40) + "..." : t.title;
        blockedSelect.appendChild(opt);
      });
    blockedSelect.value = currentValue || "";
  }
  updateBlockedOptions();
  blockedSelect.value = card.blockedBy || "";

  blockedSection.appendChild(blockedLabel);
  blockedSection.appendChild(blockedSelect);

  // Toggle button
  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "card-toggle";
  toggleButton.textContent = card.expanded ? "Collapse" : "Edit";

  body.appendChild(descSection);
  body.appendChild(fieldsRow);
  body.appendChild(weightRow);
  body.appendChild(blockedSection);

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
  el.classList.toggle("has-impact", Boolean(card.impact));
  el.classList.toggle("has-urgency", Boolean(card.urgency));
  el.classList.toggle("is-blocked", Boolean(card.blockedBy));
  el.dataset.impact = card.impact || "";
  el.dataset.urgency = card.urgency || "";
  const hasMeta = card.dueDate || card.effort || card.impact || card.urgency || card.blockedBy;
  el.classList.toggle("has-meta", Boolean(hasMeta));

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
    if (settings.deleteBehavior === "delete") {
      if (!confirm("Delete this task permanently?")) return;
      deleteCard(card.id);
    } else {
      if (!confirm("Archive this task? You can restore it later.")) return;
      archiveCard(card.id);
      renderArchive();
      renderBacklog();
      renderToday();
      renderTimeline();
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

  // Helper to collapse card
  function collapseCard() {
    el.classList.remove("expanded");
    toggleButton.textContent = "Edit";
    updateCardState(card.id, { expanded: false });
  }

  // Enter key collapses card (Shift+Enter for new line in textarea)
  descInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      collapseCard();
    }
  });

  // Date auto-save
  dateInput.addEventListener("change", () => {
    const nextDate = dateInput.value || null;
    card.dueDate = nextDate;
    el.classList.toggle("has-due", Boolean(nextDate));
    updateCardState(card.id, { dueDate: nextDate });
    updateMetaDisplay();
  });

  // Enter on date collapses card
  dateInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      collapseCard();
    }
  });

  // Effort auto-save
  effortSelect.addEventListener("change", () => {
    const nextEffort = effortSelect.value || null;
    card.effort = nextEffort;
    el.classList.toggle("has-effort", Boolean(nextEffort));
    updateCardState(card.id, { effort: nextEffort });
    updateMetaDisplay();
  });

  // Enter on effort collapses card
  effortSelect.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      collapseCard();
    }
  });

  // Impact auto-save
  impactSelect.addEventListener("change", () => {
    const nextImpact = impactSelect.value || null;
    card.impact = nextImpact;
    el.classList.toggle("has-impact", Boolean(nextImpact));
    el.dataset.impact = nextImpact || "";
    updateCardState(card.id, { impact: nextImpact });
    updateMetaDisplay();
  });

  // Urgency auto-save
  urgencySelect.addEventListener("change", () => {
    const nextUrgency = urgencySelect.value || null;
    card.urgency = nextUrgency;
    el.classList.toggle("has-urgency", Boolean(nextUrgency));
    el.dataset.urgency = nextUrgency || "";
    updateCardState(card.id, { urgency: nextUrgency });
    updateMetaDisplay();
  });

  // Blocked by auto-save
  blockedSelect.addEventListener("change", () => {
    const nextBlocked = blockedSelect.value || null;
    card.blockedBy = nextBlocked;
    el.classList.toggle("is-blocked", Boolean(nextBlocked));
    updateCardState(card.id, { blockedBy: nextBlocked });
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
  const tasks = boardState.tasks.filter((task) => task.status === columnKey && task.status !== "archived");
  tasks.forEach((task) => {
    column.appendChild(createCardElement(task));
  });
  if (countEl) countEl.textContent = tasks.length;
  if (emptyEl) emptyEl.classList.toggle("show", tasks.length === 0);
}

function updateStats() {
  const total = boardState.tasks.filter((task) => task.status !== "archived").length;
  const totalEl = document.getElementById("stat-total");
  if (totalEl) totalEl.textContent = total;
}

function renderBoard() {
  applyAutoArchive();
  renderColumn("todo");
  renderColumn("doing");
  renderColumn("done");
  updateStats();
}

function isDueToday(dueDate) {
  if (!dueDate) return false;
  const due = parseLocalDate(dueDate);
  if (!due) return false;
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  const due = parseLocalDate(dueDate);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

// ==================== PRIORITY SCORING ====================
// Answers: "What should I actually work on right now?"

function calculatePriorityScore(task) {
  // Base scores for impact and urgency (0-3 scale)
  const impactScores = { high: 3, medium: 2, low: 1 };
  const urgencyScores = { high: 3, medium: 2, low: 1 };

  const impact = impactScores[task.impact] || 0;
  const urgency = urgencyScores[task.urgency] || 0;

  // Core score: Impact × Urgency (max 9)
  let score = impact * urgency;

  // Boost for tasks with both set (shows intention)
  if (task.impact && task.urgency) {
    score += 1;
  }

  // Penalty for blocked tasks (can't work on them anyway)
  if (task.blockedBy) {
    const blocker = boardState.tasks.find(t => t.id === task.blockedBy);
    if (blocker && blocker.status !== "done" && blocker.status !== "archived") {
      score -= 5; // Significant penalty for blocked
    }
  }

  // Boost for overdue tasks (urgency override)
  if (isOverdue(task.dueDate)) {
    score += 3;
  }

  // Boost for due today
  if (isDueToday(task.dueDate)) {
    score += 2;
  }

  // Small boost for tasks in progress (momentum)
  if (task.status === "doing") {
    score += 1;
  }

  return score;
}

function sortByPriority(tasks) {
  return [...tasks].sort((a, b) => {
    const scoreA = calculatePriorityScore(a);
    const scoreB = calculatePriorityScore(b);
    // Higher score = more important = should come first
    return scoreB - scoreA;
  });
}

function getTopPick(tasks) {
  // Get the single most important task to work on right now
  const sorted = sortByPriority(
    tasks.filter((t) => {
      if (!t.blockedBy) return true;
      const blocker = boardState.tasks.find((b) => b.id === t.blockedBy);
      return blocker?.status === "done" || blocker?.status === "archived";
    })
  );
  return sorted[0] || null;
}

function renderToday() {
  if (!todayContent) return;
  todayContent.innerHTML = "";

  // Get all relevant tasks
  const allTasks = boardState.tasks.filter((task) => task.status !== "done" && task.status !== "archived");

  // Categorize tasks
  const inProgress = allTasks.filter((task) => task.status === "doing");
  const dueToday = allTasks.filter((task) => task.status !== "doing" && isDueToday(task.dueDate));
  const overdue = allTasks.filter((task) => task.status !== "doing" && isOverdue(task.dueDate));
  const totalRelevant = inProgress.length + dueToday.length + overdue.length;

  if (todayTitleEl) {
    todayTitleEl.textContent = formatLongDate(new Date());
  }
  if (todayCountOverdue) todayCountOverdue.textContent = overdue.length;
  if (todayCountDue) todayCountDue.textContent = dueToday.length;
  if (todayCountDoing) todayCountDoing.textContent = inProgress.length;
  if (todayCountTotal) todayCountTotal.textContent = totalRelevant;
  if (todayPulse) {
    if (overdue.length > 0) {
      todayPulse.textContent = `${overdue.length} overdue. Clear these first.`;
    } else if (dueToday.length > 0) {
      todayPulse.textContent = `${dueToday.length} due today. Protect time to finish.`;
    } else if (inProgress.length > 0) {
      todayPulse.textContent = `${inProgress.length} in progress. Keep momentum.`;
    } else {
      todayPulse.textContent = "All clear. Enjoy the buffer or pull from Backlog.";
    }
  }

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

  // Sort each category by priority
  const sortedOverdue = sortByPriority(overdue);
  const sortedInProgress = sortByPriority(inProgress);
  const sortedDueToday = sortByPriority(dueToday);

  // Get the top pick for "What should I work on?"
  const allRelevantTasks = [...sortedInProgress, ...sortedDueToday, ...sortedOverdue];
  const topPick = getTopPick(allRelevantTasks);

  // Create Top Pick banner if enabled, we have weight data and a clear winner
  if (settings.showTopPick && topPick && visibleLayers.weight && (topPick.impact || topPick.urgency)) {
    const topPickBanner = document.createElement("div");
    topPickBanner.className = "today-top-pick";

    const score = calculatePriorityScore(topPick);
    const scoreLabel = score >= 8 ? "Critical" : score >= 5 ? "High Priority" : "Suggested";

    topPickBanner.innerHTML = `
      <div class="top-pick-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <span>Work on this next</span>
        <span class="top-pick-score">${scoreLabel}</span>
      </div>
      <div class="top-pick-title">${topPick.title}</div>
      ${topPick.description ? `<div class="top-pick-desc">${topPick.description.slice(0, 100)}${topPick.description.length > 100 ? "..." : ""}</div>` : ""}
    `;

    topPickBanner.addEventListener("click", () => {
      setActiveView("board");
      setTimeout(() => {
        const cardEl = document.querySelector(".card[data-id=\"" + topPick.id + "\"]");
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
          cardEl.classList.add("highlight");
          setTimeout(() => cardEl.classList.remove("highlight"), 1500);
        }
      }, 100);
    });

    todayContent.appendChild(topPickBanner);
  }

  // Render sections in order: Overdue, In Progress, Due Today
  const overdueSection = createSection("Overdue", sortedOverdue, "overdue");
  const inProgressSection = createSection("In Progress", sortedInProgress, "doing");
  const dueTodaySection = createSection("Due Today", sortedDueToday, "due");

  if (overdueSection) todayContent.appendChild(overdueSection);
  if (inProgressSection) todayContent.appendChild(inProgressSection);
  if (dueTodaySection) todayContent.appendChild(dueTodaySection);
}

// ==================== BACKLOG VIEW ====================

function getBacklogTasks() {
  // Backlog = todo tasks that aren't due today or overdue (those show in Today view)
  return boardState.tasks.filter((task) => {
    if (task.status !== "todo") return false;
    if (task.status === "archived") return false;
    if (isDueToday(task.dueDate)) return false;
    if (isOverdue(task.dueDate)) return false;
    return true;
  });
}

function isThisWeek(dueDate) {
  if (!dueDate) return false;
  const due = parseLocalDate(dueDate);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  return due > today && due <= endOfWeek;
}

function isNextWeek(dueDate) {
  if (!dueDate) return false;
  const due = parseLocalDate(dueDate);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfThisWeek = new Date(today);
  endOfThisWeek.setDate(today.getDate() + (7 - today.getDay()));
  const endOfNextWeek = new Date(endOfThisWeek);
  endOfNextWeek.setDate(endOfThisWeek.getDate() + 7);
  return due > endOfThisWeek && due <= endOfNextWeek;
}

function isLater(dueDate) {
  if (!dueDate) return false;
  const due = parseLocalDate(dueDate);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfNextWeek = new Date(today);
  endOfNextWeek.setDate(today.getDate() + (14 - today.getDay()));
  return due > endOfNextWeek;
}

function renderBacklog() {
  if (!backlogContent) return;
  backlogContent.innerHTML = "";

  const allBacklogTasks = getBacklogTasks();

  // Apply search filter
  const searchTerm = backlogSearchQuery.toLowerCase().trim();
  const filteredTasks = searchTerm
    ? allBacklogTasks.filter((task) =>
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description && task.description.toLowerCase().includes(searchTerm))
      )
    : allBacklogTasks;

  // Update count
  if (backlogCountEl) {
    backlogCountEl.textContent = `${filteredTasks.length} item${filteredTasks.length !== 1 ? "s" : ""}`;
  }

  // Empty state
  if (filteredTasks.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "backlog-empty";
    emptyState.innerHTML = searchTerm
      ? `
        <div class="backlog-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
        </div>
        <h3 class="backlog-empty-title">No matches found</h3>
        <p class="backlog-empty-text">Try adjusting your search terms</p>
      `
      : `
        <div class="backlog-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h3 class="backlog-empty-title">Backlog is empty</h3>
        <p class="backlog-empty-text">Tasks without urgent due dates will appear here for planning</p>
      `;
    backlogContent.appendChild(emptyState);
    return;
  }

  // Group tasks based on mode
  if (backlogGroupMode === "schedule") {
    renderBacklogBySchedule(filteredTasks);
  } else if (backlogGroupMode === "effort") {
    renderBacklogByEffort(filteredTasks);
  } else if (backlogGroupMode === "priority") {
    renderBacklogByPriority(filteredTasks);
  }
}

function renderBacklogBySchedule(tasks) {
  // Sort each category by priority
  const thisWeek = sortByPriority(tasks.filter((t) => isThisWeek(t.dueDate)));
  const nextWeek = sortByPriority(tasks.filter((t) => isNextWeek(t.dueDate)));
  const later = sortByPriority(tasks.filter((t) => isLater(t.dueDate)));
  const unscheduled = sortByPriority(tasks.filter((t) => !t.dueDate));

  const sections = [
    { title: "This Week", tasks: thisWeek, icon: "this-week", iconSvg: calendarIcon() },
    { title: "Next Week", tasks: nextWeek, icon: "next-week", iconSvg: calendarNextIcon() },
    { title: "Later", tasks: later, icon: "later", iconSvg: calendarLaterIcon() },
    { title: "Unscheduled", tasks: unscheduled, icon: "unscheduled", iconSvg: inboxIcon() },
  ];

  sections.forEach((section) => {
    if (section.tasks.length > 0) {
      backlogContent.appendChild(createBacklogSection(section));
    }
  });
}

function renderBacklogByEffort(tasks) {
  // Sort each category by priority
  const quickWins = sortByPriority(tasks.filter((t) => t.effort === "15m" || t.effort === "30m"));
  const medium = sortByPriority(tasks.filter((t) => t.effort === "1h"));
  const deepWork = sortByPriority(tasks.filter((t) => t.effort === "2h"));
  const noEstimate = sortByPriority(tasks.filter((t) => !t.effort));

  const sections = [
    { title: "Quick Wins", tasks: quickWins, icon: "quick-wins", iconSvg: boltIcon() },
    { title: "Medium Tasks", tasks: medium, icon: "medium", iconSvg: clockIcon() },
    { title: "Deep Work", tasks: deepWork, icon: "deep-work", iconSvg: flameIcon() },
    { title: "No Estimate", tasks: noEstimate, icon: "no-estimate", iconSvg: questionIcon() },
  ];

  sections.forEach((section) => {
    if (section.tasks.length > 0) {
      backlogContent.appendChild(createBacklogSection(section));
    }
  });
}

function renderBacklogByPriority(tasks) {
  // Sort all tasks by priority score
  const sorted = sortByPriority(tasks);

  // Group into priority tiers based on score
  const critical = sorted.filter(t => calculatePriorityScore(t) >= 8);
  const high = sorted.filter(t => {
    const score = calculatePriorityScore(t);
    return score >= 5 && score < 8;
  });
  const normal = sorted.filter(t => {
    const score = calculatePriorityScore(t);
    return score >= 1 && score < 5;
  });
  const unranked = sorted.filter(t => calculatePriorityScore(t) < 1);

  const sections = [
    { title: "Critical Priority", tasks: critical, icon: "quick-wins", iconSvg: flameIcon() },
    { title: "High Priority", tasks: high, icon: "this-week", iconSvg: starIcon() },
    { title: "Normal", tasks: normal, icon: "medium", iconSvg: clockIcon() },
    { title: "Unranked", tasks: unranked, icon: "no-estimate", iconSvg: questionIcon() },
  ];

  sections.forEach((section) => {
    if (section.tasks.length > 0) {
      backlogContent.appendChild(createBacklogSection(section));
    }
  });
}

function starIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
}

function createBacklogSection({ title, tasks, icon, iconSvg }) {
  const section = document.createElement("div");
  section.className = "backlog-section";

  const header = document.createElement("div");
  header.className = "backlog-section-header";
  header.innerHTML = `
    <div class="backlog-section-icon ${icon}">${iconSvg}</div>
    <span class="backlog-section-title">${title}</span>
    <span class="backlog-section-count">${tasks.length}</span>
  `;

  const list = document.createElement("div");
  list.className = "backlog-list";

  tasks.forEach((task) => {
    list.appendChild(createBacklogItem(task));
  });

  section.appendChild(header);
  section.appendChild(list);
  return section;
}

function createBacklogItem(task) {
  const item = document.createElement("div");
  item.className = "backlog-item";
  item.dataset.taskId = task.id;

  // Build meta info
  let metaHtml = "";
  if (task.dueDate) {
    metaHtml += `<span class="due-chip">${formatRelativeDue(task.dueDate)}</span>`;
  }
  if (task.effort) {
    const effortLabels = { "15m": "15 min", "30m": "30 min", "1h": "1 hour", "2h": "2+ hours" };
    metaHtml += `<span class="effort-chip">${effortLabels[task.effort] || task.effort}</span>`;
  }

  item.innerHTML = `
    <div class="backlog-item-main">
      <div class="backlog-item-checkbox" title="Mark as done">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="backlog-item-content">
        <span class="backlog-item-title">${escapeHtml(task.title)}</span>
        ${metaHtml ? `<div class="backlog-item-meta">${metaHtml}</div>` : ""}
      </div>
    </div>
    <div class="backlog-item-actions">
      <button class="backlog-action-btn start-btn" title="Start working">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </button>
      <button class="backlog-action-btn schedule-btn" title="Set due date">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
          <line x1="16" x2="16" y1="2" y2="6"></line>
          <line x1="8" x2="8" y1="2" y2="6"></line>
          <line x1="3" x2="21" y1="10" y2="10"></line>
        </svg>
      </button>
    </div>
  `;

  // Event: Complete task
  const checkbox = item.querySelector(".backlog-item-checkbox");
  checkbox.addEventListener("click", (e) => {
    e.stopPropagation();
    const found = findTask(task.id);
    if (found) {
      setTaskStatus(found.task, "done");
      saveState();
      renderBacklog();
      renderBoard();
      updateStats();
    }
  });

  // Event: Start task (move to doing)
  const startBtn = item.querySelector(".start-btn");
  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const found = findTask(task.id);
    if (found) {
      setTaskStatus(found.task, "doing");
      saveState();
      renderBacklog();
      renderBoard();
      updateStats();
    }
  });

  // Event: Schedule task (set due to today)
  const scheduleBtn = item.querySelector(".schedule-btn");
  scheduleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const found = findTask(task.id);
    if (found) {
      const today = new Date();
      found.task.dueDate = toLocalDateString(today);
      saveState();
      renderBacklog();
      renderBoard();
      if (activeView === "today") renderToday();
    }
  });

  // Event: Click to go to board
  item.addEventListener("click", () => {
    setActiveView("board");
    setTimeout(() => {
      const cardEl = document.querySelector(`[data-card-id="${task.id}"]`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
        cardEl.classList.add("highlight");
        setTimeout(() => cardEl.classList.remove("highlight"), 1500);
      }
    }, 100);
  });

  return item;
}

// Backlog icon helpers
function calendarIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>`;
}

function calendarNextIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line><path d="m9 16 3-3 3 3"></path></svg>`;
}

function calendarLaterIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line><line x1="12" x2="12" y1="14" y2="18"></line><line x1="12" x2="12.01" y1="14" y2="14"></line></svg>`;
}

function inboxIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>`;
}

function boltIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
}

function clockIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
}

function flameIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`;
}

function questionIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" x2="12.01" y1="17" y2="17"></line></svg>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==================== TIMELINE VIEW ====================

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function formatDateRange(startDate, numDays) {
  const endDate = addDays(startDate, numDays - 1);
  const options = { month: "short", day: "numeric" };
  const startStr = startDate.toLocaleDateString("en-US", options);
  const endStr = endDate.toLocaleDateString("en-US", { ...options, year: "numeric" });
  return `${startStr} - ${endStr}`;
}

function getTimelineDays() {
  const days = [];
  const numDays = timelineMode === "week" ? 7 : 28;

  for (let i = 0; i < numDays; i++) {
    const date = addDays(timelineStartDate, i);
    days.push({
      date,
      dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: date.getDate(),
      isToday: isSameDay(date, new Date()),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    });
  }
  return days;
}

function getTasksForTimeline() {
  // Get tasks that have due dates (for display on timeline)
  return boardState.tasks.filter(task => task.dueDate && task.status !== "done" && task.status !== "archived");
}

function getUnscheduledTasks() {
  // Tasks without due dates that are not done
  return boardState.tasks.filter(task => !task.dueDate && task.status !== "done" && task.status !== "archived");
}

function getTaskDayIndex(task, days) {
  if (!task.dueDate) return -1;
  const taskDate = parseLocalDate(task.dueDate);
  if (!taskDate) return -1;

  for (let i = 0; i < days.length; i++) {
    if (isSameDay(days[i].date, taskDate)) {
      return i;
    }
  }
  return -1;
}

function renderTimeline() {
  if (!timelineGrid) return;

  timelineGrid.dataset.mode = timelineMode;
  timelineGrid.classList.remove("is-animating");
  void timelineGrid.offsetHeight;
  timelineGrid.classList.add("is-animating");

  const days = getTimelineDays();
  const scheduledTasks = getTasksForTimeline();
  const unscheduledTasks = getUnscheduledTasks();
  const numDays = days.length;

  // Update date range display
  if (timelineDateRange) {
    timelineDateRange.textContent = formatDateRange(timelineStartDate, numDays);
  }

  // Update unscheduled count
  if (timelineUnscheduledCount) {
    timelineUnscheduledCount.textContent = unscheduledTasks.length;
  }

  // Build grid columns style
  const gridCols = timelineMode === "week"
    ? "repeat(7, 1fr)"
    : "repeat(7, 1fr)"; // Show weeks in rows for month view

  // Clear grid
  timelineGrid.innerHTML = "";

  // Create days header
  const daysHeader = document.createElement("div");
  daysHeader.className = "timeline-days-header";
  daysHeader.style.gridTemplateColumns = gridCols;

  // For month view, we show 4 weeks
  const displayDays = timelineMode === "week" ? days : days.slice(0, 7);

  displayDays.forEach(day => {
    const col = document.createElement("div");
    col.className = "timeline-day-col";
    if (day.isToday) col.classList.add("is-today");
    if (day.isWeekend) col.classList.add("is-weekend");

    col.innerHTML = `
      <span class="timeline-day-name">${day.dayName}</span>
      <span class="timeline-day-num">${day.dayNum}</span>
    `;
    daysHeader.appendChild(col);
  });

  timelineGrid.appendChild(daysHeader);

  // Create rows container
  const rowsContainer = document.createElement("div");
  rowsContainer.className = "timeline-rows";

  if (timelineMode === "week") {
    const todayIndex = days.findIndex((day) => day.isToday);
    if (todayIndex !== -1) {
      const todayLine = document.createElement("div");
      todayLine.className = "timeline-today-line";
      todayLine.style.left = `calc(${((todayIndex + 0.5) * (100 / numDays))}% - 1px)`;
      rowsContainer.appendChild(todayLine);
    }

    // Week view: each task gets its own row
    const tasksInView = scheduledTasks.filter(task => {
      const idx = getTaskDayIndex(task, days);
      return idx !== -1;
    });

    // Sort by date, then by status (doing first)
    tasksInView.sort((a, b) => {
      if (a.status === "doing" && b.status !== "doing") return -1;
      if (b.status === "doing" && a.status !== "doing") return 1;
      const aDate = parseLocalDate(a.dueDate);
      const bDate = parseLocalDate(b.dueDate);
      if (!aDate || !bDate) return 0;
      return aDate - bDate;
    });

    if (tasksInView.length === 0) {
      // Empty state
      const emptyState = document.createElement("div");
      emptyState.className = "timeline-empty";
      emptyState.innerHTML = `
        <div class="timeline-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
            <line x1="16" x2="16" y1="2" y2="6"></line>
            <line x1="8" x2="8" y1="2" y2="6"></line>
            <line x1="3" x2="21" y1="10" y2="10"></line>
          </svg>
        </div>
        <h3>No scheduled tasks this week</h3>
        <p>Drag tasks from below or set due dates on the Board to see them here</p>
      `;
      rowsContainer.appendChild(emptyState);
    } else {
      tasksInView.forEach((task, rowIndex) => {
        const row = document.createElement("div");
        row.className = "timeline-row";
        row.style.gridTemplateColumns = gridCols;
        row.style.setProperty("--row-delay", `${rowIndex * 40}ms`);

        // Create cells for each day
        days.forEach((day) => {
          const cell = document.createElement("div");
          cell.className = "timeline-cell";
          if (day.isToday) cell.classList.add("is-today");
          if (day.isWeekend) cell.classList.add("is-weekend");
          cell.dataset.date = toLocalDateString(day.date);

          // Add drop zone behavior
          cell.addEventListener("dragover", (e) => {
            e.preventDefault();
            cell.classList.add("drop-target");
          });
          cell.addEventListener("dragleave", () => {
            cell.classList.remove("drop-target");
          });
          cell.addEventListener("drop", (e) => {
            e.preventDefault();
            cell.classList.remove("drop-target");
            const taskId = e.dataTransfer.getData("text/plain");
            if (taskId) {
              const found = findTask(taskId);
              if (found) {
                found.task.dueDate = cell.dataset.date;
                saveState();
                renderTimeline();
                renderBoard();
              }
            }
          });

          row.appendChild(cell);
        });

        // Add task bar
        const taskDayIndex = getTaskDayIndex(task, days);
        if (taskDayIndex !== -1) {
          const taskBar = document.createElement("div");
          taskBar.className = "timeline-task-bar";
          taskBar.draggable = true;
          taskBar.dataset.taskId = task.id;
          if (task.status === "doing") taskBar.classList.add("status-doing");
          if (task.status === "done") taskBar.classList.add("status-done");
          if (isOverdue(task.dueDate) && task.status !== "done") {
            taskBar.classList.add("is-overdue");
          }

          // Position the bar
          const cellWidth = 100 / numDays;
          taskBar.style.left = `calc(${taskDayIndex * cellWidth}% + 4px)`;
          taskBar.style.width = `calc(${cellWidth}% - 8px)`;

          taskBar.innerHTML = `<span class="timeline-task-title">${escapeHtml(task.title)}</span>`;

          // Drag to reschedule
          taskBar.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", task.id);
            e.dataTransfer.effectAllowed = "move";
            // Use setTimeout to add classes after drag image is captured
            setTimeout(() => {
              taskBar.classList.add("dragging");
              document.body.classList.add("is-dragging-timeline");
            }, 0);
          });

          taskBar.addEventListener("dragend", () => {
            taskBar.classList.remove("dragging");
            document.body.classList.remove("is-dragging-timeline");
            // Clear all drop targets
            document.querySelectorAll(".drop-target").forEach(el => el.classList.remove("drop-target"));
          });

          // Click to navigate to board
          taskBar.addEventListener("click", (e) => {
            // Don't navigate if we just finished dragging
            if (e.defaultPrevented) return;
            setActiveView("board");
            setTimeout(() => {
              const cardEl = document.querySelector(`.card[data-id="${task.id}"]`);
              if (cardEl) {
                cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
                cardEl.classList.add("highlight");
                setTimeout(() => cardEl.classList.remove("highlight"), 1500);
              }
            }, 100);
          });

          row.appendChild(taskBar);
        }

        rowsContainer.appendChild(row);
      });
    }
  } else {
    // Month view: show 4 weeks
    for (let week = 0; week < 4; week++) {
      const weekDays = days.slice(week * 7, (week + 1) * 7);
      const row = document.createElement("div");
      row.className = "timeline-row";
      row.style.gridTemplateColumns = gridCols;
      row.style.setProperty("--row-delay", `${week * 60}ms`);

      weekDays.forEach((day) => {
        const cell = document.createElement("div");
        cell.className = "timeline-cell";
        if (day.isToday) cell.classList.add("is-today");
        if (day.isWeekend) cell.classList.add("is-weekend");
        cell.dataset.date = toLocalDateString(day.date);

        // Show day number in month view
        const dayLabel = document.createElement("span");
        dayLabel.style.cssText = "position: absolute; top: 4px; left: 6px; font-size: 10px; color: var(--text-faint);";
        dayLabel.textContent = day.dayNum;
        cell.appendChild(dayLabel);

        // Add drop zone behavior
        cell.addEventListener("dragover", (e) => {
          e.preventDefault();
          cell.classList.add("drop-target");
        });
        cell.addEventListener("dragleave", () => {
          cell.classList.remove("drop-target");
        });
        cell.addEventListener("drop", (e) => {
          e.preventDefault();
          cell.classList.remove("drop-target");
          const taskId = e.dataTransfer.getData("text/plain");
          if (taskId) {
            const found = findTask(taskId);
            if (found) {
              found.task.dueDate = cell.dataset.date;
              saveState();
              renderTimeline();
              renderBoard();
            }
          }
        });

        // Find tasks for this day
        const dayTasks = scheduledTasks.filter(t => {
          const tDate = parseLocalDate(t.dueDate);
          if (!tDate) return false;
          return isSameDay(tDate, day.date);
        });

        dayTasks.forEach(task => {
          const dot = document.createElement("div");
          dot.className = "timeline-milestone";
          dot.draggable = true;
          dot.dataset.taskId = task.id;
          if (task.status === "doing") {
            dot.style.background = "var(--warning)";
          } else if (isOverdue(task.dueDate)) {
            dot.style.background = "var(--error)";
          }
          dot.title = task.title;
          dot.style.left = "50%";

          // Drag to reschedule
          dot.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", task.id);
            e.dataTransfer.effectAllowed = "move";
            setTimeout(() => {
              dot.classList.add("dragging");
              document.body.classList.add("is-dragging-timeline");
            }, 0);
          });

          dot.addEventListener("dragend", () => {
            dot.classList.remove("dragging");
            document.body.classList.remove("is-dragging-timeline");
            document.querySelectorAll(".drop-target").forEach(el => el.classList.remove("drop-target"));
          });

          dot.addEventListener("click", (e) => {
            if (e.defaultPrevented) return;
            setActiveView("board");
            setTimeout(() => {
              const cardEl = document.querySelector(`.card[data-id="${task.id}"]`);
              if (cardEl) {
                cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
                cardEl.classList.add("highlight");
                setTimeout(() => cardEl.classList.remove("highlight"), 1500);
              }
            }, 100);
          });
          cell.appendChild(dot);
        });

        row.appendChild(cell);
      });

      rowsContainer.appendChild(row);
    }
  }

  timelineGrid.appendChild(rowsContainer);

  // Render unscheduled tasks
  renderTimelineUnscheduled(unscheduledTasks);
}

function renderTimelineUnscheduled(tasks) {
  if (!timelineUnscheduledList) return;
  timelineUnscheduledList.innerHTML = "";

  if (tasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "timeline-unscheduled-empty";
    empty.textContent = "All tasks are scheduled — drop here to unschedule";
    timelineUnscheduledList.appendChild(empty);
    return;
  }

  tasks.forEach(task => {
    const item = document.createElement("div");
    item.className = "timeline-unscheduled-item";
    item.draggable = true;
    item.textContent = task.title;
    item.dataset.taskId = task.id;

    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", task.id);
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => {
        item.classList.add("dragging");
        document.body.classList.add("is-dragging-timeline");
      }, 0);
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      document.body.classList.remove("is-dragging-timeline");
      document.querySelectorAll(".drop-target").forEach(el => el.classList.remove("drop-target"));
    });

    // Click to go to board
    item.addEventListener("click", () => {
      setActiveView("board");
      setTimeout(() => {
        const cardEl = document.querySelector(`.card[data-id="${task.id}"]`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
          cardEl.classList.add("highlight");
          setTimeout(() => cardEl.classList.remove("highlight"), 1500);
        }
      }, 100);
    });

    timelineUnscheduledList.appendChild(item);
  });
}

function navigateTimeline(direction) {
  const amount = timelineMode === "week" ? 7 : 28;
  if (direction === "prev") {
    timelineStartDate = addDays(timelineStartDate, -amount);
  } else {
    timelineStartDate = addDays(timelineStartDate, amount);
  }
  renderTimeline();
}

function goToTimelineToday() {
  timelineStartDate = timelineMode === "week"
    ? getWeekStart(new Date())
    : getMonthStart(new Date());
  renderTimeline();
}

// ==================== ARCHIVE VIEW ====================

function getArchiveTasks() {
  return boardState.tasks.filter(task => task.status === "done" || task.status === "archived");
}

function getCompletionDate(task) {
  if (task.status === "archived" && task.archivedAt) {
    const date = new Date(task.archivedAt);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (task.completedAt) {
    const date = new Date(task.completedAt);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (task.createdAt) {
    const date = new Date(task.createdAt);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function renderArchive() {
  if (!archiveList) return;
  archiveList.innerHTML = "";

  const allArchived = getArchiveTasks();
  const now = new Date();
  const rangeDays = archiveRange === "all" ? null : Number(archiveRange);

  const searchTerm = archiveSearchQuery.toLowerCase().trim();
  const filtered = allArchived.filter(task => {
    if (searchTerm) {
      const haystack = `${task.title} ${task.description || ""}`.toLowerCase();
      if (!haystack.includes(searchTerm)) return false;
    }
    if (rangeDays) {
      const completion = getCompletionDate(task);
      if (!completion) return false;
      const diffDays = Math.floor((now - completion) / 86400000);
      if (diffDays > rangeDays) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const aDate = getCompletionDate(a);
    const bDate = getCompletionDate(b);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return bDate - aDate;
  });

  if (archiveCountEl) {
    archiveCountEl.textContent = `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`;
  }

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "archive-empty";
    empty.innerHTML = `
      <div class="archive-empty-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect width="18" height="14" x="3" y="5" rx="2"></rect>
          <path d="M7 5V3h10v2"></path>
          <path d="M9 12h6"></path>
        </svg>
      </div>
      <h3>No archived tasks yet</h3>
      <p>Completed or archived tasks will appear here with restore and delete actions.</p>
    `;
    archiveList.appendChild(empty);
    return;
  }

  filtered.forEach(task => {
    const completion = getCompletionDate(task);
    const isTaskArchived = task.status === "archived";
    const completionText = completion
      ? formatRelativeTime(completion.toISOString())
      : isTaskArchived
        ? "Archived"
        : "Completed";
    const completionDate = completion ? formatShortDate(completion) : "";
    const dueDate = task.dueDate ? formatShortDate(parseLocalDate(task.dueDate)) : "";

    const item = document.createElement("div");
    item.className = "archive-item";
    item.innerHTML = `
      <div class="archive-item-main">
        <div class="archive-item-title">${escapeHtml(task.title)}</div>
        <div class="archive-item-meta">
          <span class="archive-meta-chip">${completionText}</span>
          ${isTaskArchived ? `<span class="archive-meta-chip subtle">Deleted</span>` : ""}
          ${completionDate ? `<span class="archive-meta-chip subtle">${isTaskArchived ? "Archived" : "Completed"} ${completionDate}</span>` : ""}
          ${dueDate ? `<span class="archive-meta-chip subtle">Due ${dueDate}</span>` : ""}
        </div>
      </div>
      <div class="archive-item-actions">
        <button class="icon-button archive-restore-btn" title="Restore task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 14 4 9 9 4"></polyline>
            <path d="M20 20a8 8 0 0 0-8-8H4"></path>
          </svg>
        </button>
        <button class="icon-button archive-delete-btn" title="Delete task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
          </svg>
        </button>
      </div>
    `;

    const restoreBtn = item.querySelector(".archive-restore-btn");
    restoreBtn.addEventListener("click", () => {
      const found = findTask(task.id);
      if (!found) return;
      setTaskStatus(found.task, "todo");
      saveState();
      renderArchive();
      renderBoard();
      renderBacklog();
      renderToday();
      renderTimeline();
    });

    const deleteBtn = item.querySelector(".archive-delete-btn");
    deleteBtn.addEventListener("click", () => {
      if (!confirm("Delete this task permanently?")) return;
      deleteCard(task.id);
      renderArchive();
    });

    archiveList.appendChild(item);
  });
}

// Timeline event handlers
if (timelinePrevBtn) {
  timelinePrevBtn.addEventListener("click", () => navigateTimeline("prev"));
}

if (timelineNextBtn) {
  timelineNextBtn.addEventListener("click", () => navigateTimeline("next"));
}

if (timelineTodayBtn) {
  timelineTodayBtn.addEventListener("click", goToTimelineToday);
}

// Unscheduled drop zone - drag here to remove due date
if (timelineUnscheduledList) {
  timelineUnscheduledList.addEventListener("dragover", (e) => {
    e.preventDefault();
    timelineUnscheduledList.classList.add("drop-target");
  });

  timelineUnscheduledList.addEventListener("dragleave", (e) => {
    if (!timelineUnscheduledList.contains(e.relatedTarget)) {
      timelineUnscheduledList.classList.remove("drop-target");
    }
  });

  timelineUnscheduledList.addEventListener("drop", (e) => {
    e.preventDefault();
    timelineUnscheduledList.classList.remove("drop-target");
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      const found = findTask(taskId);
      if (found && found.task.dueDate) {
        found.task.dueDate = null;
        saveState();
        renderTimeline();
        renderBoard();
      }
    }
  });
}

timelineModeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    if (mode === timelineMode) return;
    timelineMode = mode;
    timelineModeBtns.forEach(b => b.classList.toggle("is-active", b.dataset.mode === mode));

    // Reset to current week/month
    timelineStartDate = mode === "week"
      ? getWeekStart(new Date())
      : getMonthStart(new Date());
    renderTimeline();
  });
});

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
  dueDateInput.value = getDefaultDueDateValue();
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
    completedAt: null,
    archivedAt: null,
    description: "",
    expanded: false,
    // Weight fields for priority scoring
    impact: null,    // "high" | "medium" | "low" | null
    urgency: null,   // "high" | "medium" | "low" | null
    blockedBy: null, // task ID or null
  };
  boardState.tasks.push(card);
  saveState();
  renderColumn("todo");
  updateStats();
}

function moveCard(cardId, targetColumn) {
  const found = findTask(cardId);
  if (!found) return;
  setTaskStatus(found.task, targetColumn);
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

if (defaultViewSelect) {
  defaultViewSelect.value = settings.defaultView || "board";
  defaultViewSelect.addEventListener("change", () => {
    settings.defaultView = defaultViewSelect.value;
    saveSettings();
  });
}

if (defaultTimelineSelect) {
  defaultTimelineSelect.value = settings.defaultTimelineMode || "week";
  defaultTimelineSelect.addEventListener("change", () => {
    settings.defaultTimelineMode = defaultTimelineSelect.value;
    timelineMode = settings.defaultTimelineMode;
    timelineModeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.mode === timelineMode));
    timelineStartDate = timelineMode === "week" ? getWeekStart(new Date()) : getMonthStart(new Date());
    saveSettings();
  });
}

if (defaultBacklogGroupSelect) {
  defaultBacklogGroupSelect.value = settings.defaultBacklogGroup || "schedule";
  defaultBacklogGroupSelect.addEventListener("change", () => {
    settings.defaultBacklogGroup = defaultBacklogGroupSelect.value;
    backlogGroupMode = settings.defaultBacklogGroup;
    viewModeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.group === backlogGroupMode));
    saveSettings();
    renderBacklog();
  });
}

if (deleteBehaviorSelect) {
  deleteBehaviorSelect.value = settings.deleteBehavior || "archive";
  deleteBehaviorSelect.addEventListener("change", () => {
    settings.deleteBehavior = deleteBehaviorSelect.value;
    saveSettings();
  });
}

if (autoArchiveDaysInput) {
  autoArchiveDaysInput.value = Number(settings.autoArchiveDays || 0);
  autoArchiveDaysInput.addEventListener("change", () => {
    settings.autoArchiveDays = Number(autoArchiveDaysInput.value || 0);
    saveSettings();
    applyAutoArchive();
    renderArchive();
    renderBoard();
  });
}

if (defaultDueDateSelect) {
  defaultDueDateSelect.value = settings.defaultDueDate || "none";
  defaultDueDateSelect.addEventListener("change", () => {
    settings.defaultDueDate = defaultDueDateSelect.value;
    saveSettings();
  });
}

if (showTopPickToggle) {
  showTopPickToggle.checked = Boolean(settings.showTopPick);
  showTopPickToggle.addEventListener("change", () => {
    settings.showTopPick = showTopPickToggle.checked;
    saveSettings();
    renderToday();
  });
}

if (compactModeToggle) {
  compactModeToggle.checked = Boolean(settings.compactMode);
  compactModeToggle.addEventListener("change", () => {
    settings.compactMode = compactModeToggle.checked;
    saveSettings();
    applySettings();
  });
}

if (showMetaChipsToggle) {
  showMetaChipsToggle.checked = Boolean(settings.showMetaChips);
  showMetaChipsToggle.addEventListener("change", () => {
    settings.showMetaChips = showMetaChipsToggle.checked;
    saveSettings();
    applySettings();
  });
}

if (reduceMotionToggle) {
  reduceMotionToggle.checked = Boolean(settings.reduceMotion);
  reduceMotionToggle.addEventListener("change", () => {
    settings.reduceMotion = reduceMotionToggle.checked;
    saveSettings();
    applySettings();
  });
}

if (exportDataBtn) {
  exportDataBtn.addEventListener("click", () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      state: boardState,
      settings,
      layers: visibleLayers,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `layr-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

if (importDataBtn && importFileInput) {
  importDataBtn.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", async () => {
    const file = importFileInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.state?.tasks) {
        alert("Invalid file format.");
        return;
      }
      boardState = parsed.state;
      if (parsed.settings) settings = { ...settings, ...parsed.settings };
      if (parsed.layers) visibleLayers = parsed.layers;
      backlogGroupMode = settings.defaultBacklogGroup || backlogGroupMode;
      timelineMode = settings.defaultTimelineMode || timelineMode;
      saveState();
      saveSettings();
      saveLayers();
      syncSettingsControls();
      applySettings();
      viewModeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.group === backlogGroupMode));
      timelineModeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.mode === timelineMode));
      renderBoard();
      renderToday();
      renderBacklog();
      renderTimeline();
      renderArchive();
    } catch {
      alert("Could not import file.");
    } finally {
      importFileInput.value = "";
    }
  });
}

if (restoreArchivedBtn) {
  restoreArchivedBtn.addEventListener("click", () => {
    const archived = boardState.tasks.filter((task) => task.status === "archived");
    if (archived.length === 0) return;
    if (!confirm(`Restore ${archived.length} archived task${archived.length !== 1 ? "s" : ""}?`)) return;
    archived.forEach((task) => setTaskStatus(task, "todo"));
    saveState();
    renderArchive();
    renderBoard();
    renderBacklog();
    renderToday();
    renderTimeline();
  });
}

if (clearArchiveSettingsBtn) {
  clearArchiveSettingsBtn.addEventListener("click", () => {
    if (!confirm("Clear all archived and completed tasks? This cannot be undone.")) return;
    boardState.tasks = boardState.tasks.filter((task) => task.status !== "done" && task.status !== "archived");
    saveState();
    renderArchive();
    renderBoard();
    renderBacklog();
    renderToday();
    renderTimeline();
  });
}

if (resetDataBtn) {
  resetDataBtn.addEventListener("click", () => {
    if (!confirm("Reset all data and settings? This cannot be undone.")) return;
    localStorage.removeItem(stateKey);
    localStorage.removeItem("layr-settings");
    localStorage.removeItem("layr-layers");
    boardState = structuredClone(defaultState);
    settings = loadSettings();
    visibleLayers = loadLayers();
    backlogGroupMode = settings.defaultBacklogGroup || backlogGroupMode;
    timelineMode = settings.defaultTimelineMode || timelineMode;
    saveState();
    saveSettings();
    saveLayers();
    syncSettingsControls();
    applySettings();
    renderBoard();
    renderToday();
    renderBacklog();
    renderTimeline();
    renderArchive();
  });
}

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

// Backlog view mode toggle
viewModeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.group;
    if (mode === backlogGroupMode) return;
    backlogGroupMode = mode;
    viewModeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.group === mode));
    renderBacklog();
  });
});

// Backlog search
if (backlogSearchInput) {
  backlogSearchInput.addEventListener("input", () => {
    backlogSearchQuery = backlogSearchInput.value;
    renderBacklog();
  });
}

if (archiveSearchInput) {
  archiveSearchInput.addEventListener("input", () => {
    archiveSearchQuery = archiveSearchInput.value;
    renderArchive();
  });
}

archiveFilterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const range = btn.dataset.range || "all";
    if (range === archiveRange) return;
    archiveRange = range;
    archiveFilterBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.range === range));
    renderArchive();
  });
});

if (archiveClearBtn) {
  archiveClearBtn.addEventListener("click", () => {
    if (!confirm("Clear all archived tasks? This cannot be undone.")) return;
    boardState.tasks = boardState.tasks.filter((task) => task.status !== "done" && task.status !== "archived");
    saveState();
    renderArchive();
    renderBoard();
    renderBacklog();
    renderToday();
    renderTimeline();
  });
}

syncSettingsControls();
applySettings();
viewModeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.group === backlogGroupMode));
timelineModeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.mode === timelineMode));
applyAutoArchive();
renderBoard();
renderToday();
renderBacklog();
setActiveView(activeView);
applyLayers();

function setActiveView(view) {
  activeView = view;
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.view === activeView);
  });
  viewPanels.forEach((panel) => {
    const panelView = panel.dataset.viewPanel;
    const matches =
      panelView === activeView ||
      (panelView === "board-header" && activeView === "board");
    panel.classList.toggle("is-active", matches);
  });
  if (activeView === "today") {
    renderToday();
  }
  if (activeView === "backlog") {
    renderBacklog();
  }
  if (activeView === "timeline") {
    if (settings.defaultTimelineMode && timelineMode !== settings.defaultTimelineMode) {
      timelineMode = settings.defaultTimelineMode;
      timelineModeBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.mode === timelineMode));
      timelineStartDate = timelineMode === "week" ? getWeekStart(new Date()) : getMonthStart(new Date());
    }
    renderTimeline();
  }
  if (activeView === "archive") {
    renderArchive();
  }
  if (activeView === "settings" && defaultViewSelect) {
    defaultViewSelect.value = settings.defaultView || "board";
  }
  focusToggle.classList.toggle("is-hidden", activeView !== "board");
}
