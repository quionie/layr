const stateKey = "layr-board-v1";

const defaultState = {
  todo: [],
  doing: [],
  done: [],
};

const board = document.querySelector(".board");
const addButton = document.getElementById("add-card");
const modal = document.getElementById("card-modal");
const form = document.getElementById("card-form");
const titleInput = document.getElementById("card-title");
const cancelButton = document.getElementById("cancel");
const focusToggle = document.getElementById("focus-toggle");
const columns = Array.from(document.querySelectorAll(".column"));

let boardState = loadState();
let focusMode = false;
let focusIndex = 0;

function loadState() {
  try {
    const raw = localStorage.getItem(stateKey);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      todo: Array.isArray(parsed.todo) ? parsed.todo : [],
      doing: Array.isArray(parsed.doing) ? parsed.doing : [],
      done: Array.isArray(parsed.done) ? parsed.done : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(stateKey, JSON.stringify(boardState));
}

function findCardLocation(cardId) {
  const columnKeys = Object.keys(boardState);
  for (const columnKey of columnKeys) {
    const index = boardState[columnKey].findIndex((c) => c.id === cardId);
    if (index !== -1) {
      return { columnKey, index, card: boardState[columnKey][index] };
    }
  }
  return null;
}

function updateCardState(cardId, updates) {
  const location = findCardLocation(cardId);
  if (!location) return null;
  Object.assign(location.card, updates);
  saveState();
  return location.card;
}

function deleteCard(cardId) {
  const location = findCardLocation(cardId);
  if (!location) return;
  boardState[location.columnKey].splice(location.index, 1);
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
  boardState[columnKey].forEach((card) => {
    column.appendChild(createCardElement(card));
  });
}

function renderBoard() {
  renderColumn("todo");
  renderColumn("doing");
  renderColumn("done");
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
    description: "",
    expanded: false,
  };
  boardState.todo.push(card);
  saveState();
  renderColumn("todo");
}

function moveCard(cardId, targetColumn) {
  let movedCard = null;
  Object.keys(boardState).forEach((columnKey) => {
    const index = boardState[columnKey].findIndex((c) => c.id === cardId);
    if (index !== -1) {
      movedCard = boardState[columnKey].splice(index, 1)[0];
    }
  });
  if (!movedCard) return;
  boardState[targetColumn].push(movedCard);
  saveState();
  renderBoard();
}

addButton.addEventListener("click", openModal);
focusToggle.addEventListener("click", () => toggleFocusMode());

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
