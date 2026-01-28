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

let boardState = loadState();

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

function createCardElement(card) {
  const el = document.createElement("div");
  el.className = "card";
  el.textContent = card.title;
  el.draggable = true;
  el.dataset.id = card.id;

  el.addEventListener("dragstart", () => {
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

renderBoard();
