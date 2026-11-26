"use strict";

const { files, ranks, squares, games, round, correct } = window.AulaJaque;
const byId = (id) => document.getElementById(id);
const totalRounds = 5;
const views = [...document.querySelectorAll(".vista")];
const nav = [...document.querySelectorAll(".header-nav a")];
const homeGroups = new Map([...document.querySelectorAll("[data-home-group]")].map((group) => [group.id, group]));
const play = byId("partida");
const result = byId("resultado");
const board = byId("tablero");
const title = byId("nombre-juego");
const instruction = byId("instrucciones");
const prompt = byId("pregunta");
const feedback = byId("mensaje");
const next = byId("siguiente");
const hint = byId("pista");
const hintButton = byId("pista-boton");
const boardButtons = new Map();
const successMessages = [
  "¡Muy bien! Has encontrado una casilla correcta.",
  "¡Acertaste! Buena jugada.",
  "¡Genial! Sigue así.",
  "¡Lo has visto! Una ronda más.",
  "¡Excelente! Has resuelto la última ronda.",
];
const retryMessages = {
  caballo: "¡Sigue intentándolo! Cuenta dos casillas en línea recta y una hacia un lado.",
  torre: "¡Prueba otra casilla! Busca en la misma fila o columna de la torre.",
  coordenadas: "¡Prueba otra vez! Busca la letra abajo y el número a la izquierda.",
};

let state;

function makeBoard() {
  const grid = document.createElement("div");
  grid.className = "board-grid";

  for (const [index, square] of squares.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "square";
    if ((index + Math.floor(index / 8)) % 2 === 1) button.classList.add("dark");
    button.dataset.square = square;
    grid.append(button);
    boardButtons.set(square, button);
  }

  const addLabels = (labels, className) => {
    const group = document.createElement("div");
    group.className = className;
    group.setAttribute("aria-hidden", "true");
    for (const label of labels) {
      const span = document.createElement("span");
      span.textContent = label;
      group.append(span);
    }
    board.append(group);
  };

  board.append(grid);
  addLabels(ranks, "board-ranks");
  addLabels(files, "board-files");
}

function updateFocus(square) {
  boardButtons.get(state.focusSquare).tabIndex = -1;
  state.focusSquare = square;
  boardButtons.get(square).tabIndex = 0;
}

function decorateSquare(square, button) {
  const origin = square === state.question.from;
  const moved = state.question.from && state.answer;
  const hasPiece = moved ? state.answer === square : origin;
  const correctSquare = state.answer === square;
  const wrongSquare = state.tries.has(square);
  const label = [square];

  button.classList.toggle("origin", origin && !moved);
  button.classList.toggle("correct", correctSquare);
  button.classList.toggle("incorrect", wrongSquare);
  button.toggleAttribute("data-origin", origin && !moved);
  button.replaceChildren();
  if (state.answer) {
    button.setAttribute("aria-disabled", "true");
  } else {
    button.removeAttribute("aria-disabled");
  }
  button.tabIndex = !state.answer && square === state.focusSquare ? 0 : -1;

  if (hasPiece) {
    const piece = document.createElement("span");
    piece.className = "piece chess";
    piece.setAttribute("aria-hidden", "true");
    piece.textContent = state.game === "caballo" ? "♞" : "♜";
    button.append(piece);
    label.push(games[state.game].piece);
  }
  if (correctSquare || wrongSquare) {
    const mark = document.createElement("span");
    mark.className = "board-mark";
    mark.setAttribute("aria-hidden", "true");
    if (hasPiece) mark.classList.add("corner-mark");
    mark.textContent = correctSquare ? "✓" : "×";
    button.append(mark);
    label.push(correctSquare ? "respuesta correcta" : "vuelve a intentarlo");
  }
  button.setAttribute("aria-label", label.join(", "));
}

function renderBoard() {
  for (const [square, button] of boardButtons) decorateSquare(square, button);
}

function updateProgress() {
  byId("ronda").textContent = "Ronda " + state.number + " de " + totalRounds;
  const completed = state.number - (state.answer ? 0 : 1);
  byId("progreso").value = completed;
  const steps = byId("pasos");
  steps.replaceChildren();
  for (let index = 1; index <= totalRounds; index += 1) {
    const step = document.createElement("i");
    if (index <= completed) step.className = "done";
    else if (index === state.number) step.className = "current";
    steps.append(step);
  }
}

function setMessage(message, tone = "") {
  feedback.textContent = message;
  feedback.className = tone ? "feedback " + tone : "feedback";
}

function setHint(open) {
  hint.hidden = !open;
  hintButton.textContent = open ? "Ocultar pista" : "Ver pista";
  hintButton.setAttribute("aria-expanded", String(open));
}

function renderRound() {
  const game = games[state.game];
  title.textContent = game.title;
  instruction.textContent = game.instructions;
  hint.textContent = game.hint;
  setHint(false);
  next.hidden = true;
  setMessage("");
  updateProgress();

  const coordinate = document.createElement("strong");
  coordinate.textContent = state.question.target || state.question.from;
  if (state.question.target) {
    prompt.replaceChildren("Encuentra la casilla ", coordinate, ".");
  } else {
    const pieceName = state.game === "caballo" ? "El caballo" : "La torre";
    prompt.replaceChildren(pieceName + " está en ", coordinate, ".");
  }
  renderBoard();
}

function openRound(previous) {
  state.question = round(state.game, previous);
  state.focusSquare = state.question.from || "a8";
  state.answer = null;
  state.tries = new Set();
  renderRound();
}

function start(gameId) {
  state = { game: gameId, number: 1 };
  play.hidden = false;
  result.hidden = true;
  openRound();
}

function submit(square) {
  if (state.answer) return;
  updateFocus(square);
  if (!correct(state.question, square)) {
    state.tries.add(square);
    decorateSquare(square, boardButtons.get(square));
    setMessage(retryMessages[state.game], "retry");
    return;
  }

  state.tries.clear();
  state.answer = square;
  setMessage(successMessages[state.number - 1], "ok");
  renderBoard();
  updateProgress();
  next.innerHTML = state.number === totalRounds
    ? 'Ver resultado <span aria-hidden="true">→</span>'
    : 'Siguiente ronda <span aria-hidden="true">→</span>';
  next.hidden = false;
  next.focus();
}

function navigate(focus = true) {
  const route = location.hash.slice(1).split("?", 1)[0] || "inicio";
  const group = homeGroups.get(route);
  const isGame = Object.hasOwn(games, route);
  const view = isGame ? byId("juego") : views.find((section) => section.id === route && route !== "juego") || byId("inicio");
  const navTarget = group?.id || view.dataset.nav || view.id;

  for (const section of views) section.hidden = section !== view;
  for (const link of nav) {
    if (link.hash === "#" + navTarget) link.setAttribute("aria-current", group ? "location" : "page");
    else link.removeAttribute("aria-current");
  }
  if (isGame) start(route);

  if (group) {
    if (focus) group.querySelector("h2").focus({ preventScroll: true });
    group.scrollIntoView({ block: "start" });
    return;
  }
  if (focus) {
    window.scrollTo(0, 0);
    view.querySelector("h1").focus({ preventScroll: true });
  }
}

makeBoard();
if (location.protocol === "file:") byId("descarga-info").hidden = true;
navigate(false);

window.addEventListener("hashchange", () => navigate());
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  byId("contenido").focus();
});

board.addEventListener("click", (event) => {
  const button = event.target.closest("[data-square]");
  if (button) submit(button.dataset.square);
});

board.addEventListener("keydown", (event) => {
  const button = event.target.closest("[data-square]");
  if (!button || state.answer) return;
  const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const direction = keys[event.key];
  if (!direction) return;
  event.preventDefault();
  const [column, row] = direction;
  const [file, rank] = button.dataset.square;
  const targetFile = files[files.indexOf(file) + column];
  const targetRank = ranks[ranks.indexOf(Number(rank)) + row];
  if (!targetFile || !targetRank) return;
  const target = targetFile + targetRank;
  updateFocus(target);
  boardButtons.get(target).focus();
});

hintButton.addEventListener("click", () => setHint(hint.hidden));
next.addEventListener("click", () => {
  if (state.number === totalRounds) {
    play.hidden = true;
    result.hidden = false;
    window.scrollTo(0, 0);
    result.querySelector("h1").focus({ preventScroll: true });
    return;
  }
  state.number += 1;
  openRound(state.question);
  boardButtons.get(state.focusSquare).focus();
});
byId("reiniciar").addEventListener("click", () => {
  start(state.game);
  title.focus();
});
