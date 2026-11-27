(function () {
  "use strict";

  const byId = (name) => document.getElementById("ia-" + name);
  const form = byId("configuracion");
  if (!form) return;

  const Chess = window.AulaMotor?.Chess;
  const engine = window.AulaIA;
  if (!Chess || !engine) {
    form.hidden = true;
    byId("sin-motor").hidden = false;
    return;
  }

  const boardHost = byId("tablero");
  const status = byId("estado");
  const ranksWhite = [8, 7, 6, 5, 4, 3, 2, 1];
  const filesWhite = [..."abcdefgh"];
  const pieceNames = { p: "peón", n: "caballo", b: "alfil", r: "torre", q: "dama", k: "rey" };
  const symbols = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" };
  const arrows = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
  const other = (color) => color === "w" ? "b" : "w";
  const elapsed = () => window.performance.now();
  const adaptiveKey = "aula-jaque.ia.nivel.v1";
  const difficulty = Object.keys(engine.levels);
  const positions = new Map();
  const history = [];
  let match;
  let human = "w";
  let level = "principiante";
  let adaptive = false;
  let learning = true;
  let finished = false;
  let active = false;
  let time = null;
  let since = null;
  let timer = null;
  let scheduled = null;
  let search = null;
  let cells = new Map();
  let ordered = [];
  let keyboardSquare;
  let selected = "";
  let legal = [];
  let hint = null;
  let promotion = null;
  let claiming = false;

  function readAdaptive() {
    try {
      const stored = localStorage.getItem(adaptiveKey);
      const index = Number(stored);
      if (stored !== null && Number.isInteger(index) && index >= 0 && index < difficulty.length) return index;
    } catch {
      // Practice remains available when the browser blocks storage.
    }
    return 1;
  }
  let adaptiveIndex = readAdaptive();

  function adjustAdaptive(winner) {
    if (!adaptive || history.length < 8) return;
    const increment = winner === human ? 1 : winner === null ? 0 : -1;
    adaptiveIndex = Math.max(0, Math.min(difficulty.length - 1, adaptiveIndex + increment));
    try { localStorage.setItem(adaptiveKey, String(adaptiveIndex)); } catch {
      // The adjusted level is still used until the page closes.
    }
  }

  function message(text, tone = "") {
    status.textContent = text;
    status.className = "feedback" + (tone ? " " + tone : "");
  }

  function advise(text = "") {
    const note = byId("aviso");
    note.hidden = !text;
    note.textContent = text;
  }

  function turnText() {
    byId("turno").textContent = match.turn() === human ? "Tu turno" : "Turno del ordenador";
  }

  function clearSelection() {
    selected = "";
    legal = [];
    hint = null;
    promotion = null;
    byId("promocion").hidden = true;
  }

  function abortWork() {
    window.clearTimeout(scheduled);
    scheduled = null;
    search?.abort();
    search = null;
  }

  function paintClocks() {
    if (!time) return;
    const turn = match.turn();
    const pending = since !== null ? elapsed() - since : 0;
    for (const side of ["w", "b"]) {
      const milliseconds = Math.max(0, time[side] - (side === turn ? pending : 0));
      const seconds = Math.ceil(milliseconds / 1000);
      const display = byId("tiempo-" + side);
      display.textContent = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
      display.parentElement.classList.toggle("ia-activo", !finished && active && side === turn);
      display.parentElement.classList.toggle("ia-urgente", seconds <= 30);
    }
  }

  function canMate(side) {
    const own = match.board().flat().filter((piece) => piece?.color === side && piece.type !== "k");
    if (!own.length || match.isInsufficientMaterial()) return false;
    const opposing = match.board().flat().some((piece) => piece && piece.color !== side && piece.type !== "k");
    return opposing || own.length > 1 || !["b", "n"].includes(own[0].type);
  }

  function suspendClock() {
    if (!time || since === null) return;
    time[match.turn()] = Math.max(0, time[match.turn()] - (elapsed() - since));
    since = null;
  }

  function finish(winner, reason) {
    window.clearInterval(timer);
    suspendClock();
    finished = true;
    abortWork();
    clearSelection();
    claiming = false;
    adjustAdaptive(winner);
    byId("turno").textContent = winner === human ? "¡Has ganado!" : winner === null ? "Tablas" : "Gana el ordenador";
    message(reason, winner === human ? "ok" : "");
    paint();
    if (active) byId("turno").focus({ preventScroll: true });
  }

  function checkClock() {
    if (!time || finished) return finished;
    const side = match.turn();
    if (time[side] > (since === null ? 0 : elapsed() - since)) return false;
    const winner = other(side);
    if (canMate(winner)) finish(winner, side === human ? "Se ha agotado tu tiempo." : "Se ha agotado el tiempo del ordenador.");
    else finish(null, "Se ha agotado el tiempo. El otro bando no tiene piezas para dar mate.");
    return true;
  }

  function tick() {
    checkClock();
    paintClocks();
  }

  function restartClock() {
    if (time && active && !finished) since = elapsed();
  }

  function changeOccurrences(hash, difference) {
    const count = (positions.get(hash) || 0) + difference;
    if (count > 0) positions.set(hash, count);
    else positions.delete(hash);
  }

  function halfMoves() {
    return Number(match.fen().split(" ")[4]);
  }

  function drawClaim() {
    if (match.isThreefoldRepetition()) return "La misma posición se ha repetido tres veces.";
    if (match.isDrawByFiftyMoves()) return "Se han jugado cincuenta movimientos por bando sin capturas ni avances de peón.";
    return "";
  }

  function possibleDrawClaim() {
    return halfMoves() >= 99 || [...positions.values()].some((count) => count >= 2);
  }

  function finishByRules(movedBy) {
    if (match.isCheckmate()) finish(movedBy, "Jaque mate.");
    else if (match.isStalemate()) finish(null, "Rey ahogado. El bando al turno no está en jaque y no tiene jugadas legales.");
    else if (match.isInsufficientMaterial()) finish(null, "La posición no tiene material suficiente para dar mate.");
    else if ((positions.get(match.hash()) || 0) >= 5) finish(null, "La misma posición se ha repetido cinco veces.");
    else if (halfMoves() >= 150) finish(null, "Se han jugado setenta y cinco movimientos por bando sin capturas ni avances de peón.");
    return finished;
  }

  function squareColor(square) {
    return (filesWhite.indexOf(square[0]) + Number(square[1])) % 2 === 1 ? "oscura" : "clara";
  }

  function focusSquare(square = keyboardSquare, moveFocus = false) {
    if (!cells.has(square)) return;
    cells.get(keyboardSquare)?.setAttribute("tabindex", "-1");
    keyboardSquare = square;
    const element = cells.get(square);
    element.tabIndex = 0;
    if (moveFocus) element.focus({ preventScroll: true });
  }

  function createBoard() {
    boardHost.replaceChildren();
    cells = new Map();
    const files = human === "w" ? filesWhite : [...filesWhite].reverse();
    const ranks = human === "w" ? ranksWhite : [...ranksWhite].reverse();
    ordered = ranks.flatMap((rank) => files.map((file) => file + rank));
    const grid = document.createElement("div");
    grid.className = "board-grid";
    for (const square of ordered) {
      const button = document.createElement("button");
      button.className = "square";
      button.classList.toggle("dark", squareColor(square) === "oscura");
      button.type = "button";
      button.tabIndex = -1;
      button.dataset.iaCasilla = square;
      cells.set(square, button);
      grid.append(button);
    }
    boardHost.append(grid);
    for (const [className, values] of [["board-ranks", ranks], ["board-files", files]]) {
      const labels = document.createElement("div");
      labels.className = className;
      labels.setAttribute("aria-hidden", "true");
      for (const value of values) {
        const label = document.createElement("span");
        label.textContent = value;
        labels.append(label);
      }
      boardHost.append(labels);
    }
    focusSquare(human === "w" ? "e2" : "e7");
  }

  function paint() {
    if (!match) return;
    const turn = match.turn();
    const canMove = !finished && turn === human;
    const highlight = learning && byId("legales").checked;
    const showTargets = learning && byId("amenazas").checked;
    const targets = new Set(highlight ? legal.map(({ to }) => to) : []);
    const previous = history[history.length - 1]?.move;
    const inCheck = match.isCheck();
    for (const [square, element] of cells) {
      const piece = match.get(square);
      const threatened = showTargets && piece?.color === human && match.isAttacked(square, other(human));
      const checking = inCheck && piece?.color === turn && piece.type === "k";
      element.classList.toggle("ia-ocupada", Boolean(piece));
      element.classList.toggle("ia-elegida", selected === square);
      element.classList.toggle("ia-ultima", square === previous?.from || square === previous?.to);
      element.classList.toggle("ia-legal", targets.has(square));
      element.classList.toggle("ia-amenazada", threatened);
      element.classList.toggle("ia-jaque", checking);
      element.classList.toggle("ia-pista", square === hint?.from || square === hint?.to);
      element.setAttribute("aria-disabled", String(!canMove || Boolean(promotion)));
      element.setAttribute("aria-pressed", String(selected === square));
      const label = ["casilla " + square];
      if (piece) label.push(pieceNames[piece.type] + (piece.color === "w" ? " de las blancas" : " de las negras"));
      if (checking) label.push("en jaque");
      if (threatened) label.push("amenazada");
      if (targets.has(square)) label.push("destino legal");
      if (selected === square) label.push("seleccionada");
      if (square === hint?.from || square === hint?.to) label.push("pista");
      element.setAttribute("aria-label", label.join(", "));
      element.replaceChildren();
      if (piece) {
        const glyph = document.createElement("span");
        glyph.className = "piece chess ia-pieza" + (piece.color === "w" ? " ia-pieza-blanca" : "");
        glyph.setAttribute("aria-hidden", "true");
        glyph.textContent = symbols[piece.type];
        element.append(glyph);
      }
    }
    byId("ayudas").hidden = !learning || finished;
    byId("pista").disabled = !canMove || Boolean(search) || Boolean(promotion) || claiming;
    byId("deshacer").disabled = finished || !history.some(({ move }) => move.color === human);
    byId("tablas").hidden = !canMove || !possibleDrawClaim() || Boolean(promotion);
    byId("tablas").textContent = claiming ? "Cancelar reclamación" : "Reclamar tablas";
    byId("rendir").hidden = finished;
    byId("nueva").hidden = !finished;
    paintClocks();
  }

  function scheduleComputer() {
    if (!active || finished || match.turn() === human) return;
    window.clearTimeout(scheduled);
    scheduled = window.setTimeout(async () => {
      scheduled = null;
      if (!active || finished || match.turn() === human || checkClock()) return;
      const canClaim = drawClaim();
      if (canClaim) {
        finish(null, "El ordenador reclama tablas. " + canClaim);
        return;
      }
      const controller = new AbortController();
      search = controller;
      let move;
      try {
        move = await engine.choose(Chess, match.fen(), level, { signal: controller.signal });
      } catch {
        // The rules library still provides a legal move if the search fails.
        if (search === controller) move = match.moves({ verbose: true })[0];
      }
      if (search !== controller || controller.signal.aborted) return;
      search = null;
      if (!move || checkClock() || !active || finished) return;
      playMove(move, false);
    }, 45);
  }

  function explainCapture(move) {
    if (!learning || !move.captured) return;
    const previous = history[history.length - 2]?.move;
    if (previous?.color === human && previous.to === move.to
      && engine.pieceValue[move.captured] > (engine.pieceValue[previous.captured] || 0)) {
      advise("El ordenador pudo capturar la pieza que acababas de mover. Antes de elegir una casilla, comprueba qué piezas rivales pueden llegar a ella.");
    }
  }

  function playMove(move, fromHuman) {
    if (checkClock() || finished) return;
    abortWork();
    if (claiming && fromHuman) {
      match.move(move);
      const reason = drawClaim();
      match.undo();
      if (reason) {
        finish(null, "Has reclamado tablas. " + reason);
        return;
      }
      clearSelection();
      message("Con esa jugada la posición todavía no permite reclamar tablas. Prueba otro destino o cancela la reclamación.", "retry");
      paint();
      return;
    }

    if (fromHuman) advise();
    suspendClock();
    const recorded = match.move(move);
    history.push({ move: recorded, time: time ? { ...time } : null });
    changeOccurrences(match.hash(), 1);
    clearSelection();
    if (!fromHuman) explainCapture(recorded);
    if (finishByRules(recorded.color)) return;

    restartClock();
    turnText();
    message(describeMove(recorded, fromHuman) + (match.isCheck() ? " ¡Jaque!" : ""), fromHuman ? "ok" : "");
    paint();
    scheduleComputer();
  }

  function describeMove(move, fromHuman) {
    const journey = " de " + move.from + " a " + move.to + ".";
    if (move.promotion) {
      return (fromHuman ? "Has coronado tu peón en " : "El ordenador corona su peón en ")
        + move.to + ". Ahora juega como " + pieceNames[move.promotion] + ".";
    }
    if (move.isKingsideCastle() || move.isQueensideCastle()) {
      return (fromHuman ? "Has enrocado por el lado " : "El ordenador enroca por el lado ")
        + (move.isKingsideCastle() ? "del rey." : "de la dama.");
    }
    if (move.isEnPassant()) return (fromHuman ? "Has capturado al paso" : "El ordenador captura al paso") + journey;
    return (fromHuman ? "Has movido tu " : "El ordenador mueve su ") + pieceNames[move.piece] + journey;
  }

  function select(square) {
    hint = null;
    selected = square;
    legal = match.moves({ square, verbose: true });
    const piece = match.get(square);
    message("Has seleccionado tu " + pieceNames[piece.type] + " de " + square + ". " +
      (legal.length ? "Elige su destino." : "No puede moverse en este turno."), legal.length ? "" : "retry");
    paint();
  }

  function clickSquare(square) {
    if (!match || finished || promotion || match.turn() !== human || checkClock()) return;
    abortWork();
    focusSquare(square);
    if (match.get(square)?.color === human) {
      select(square);
      return;
    }
    if (!selected) {
      message("Primero elige una de tus piezas.", "retry");
      paint();
      return;
    }
    const options = legal.filter(({ to }) => to === square);
    if (!options.length) {
      message(match.isCheck() ? "Tu rey debe quedar a salvo del jaque." : "Esa pieza no puede ir a " + square + ".", "retry");
      paint();
      return;
    }
    if (options.some(({ promotion }) => promotion)) {
      promotion = options;
      byId("promocion").hidden = false;
      message("Elige en qué pieza coronar el peón.");
      paint();
      byId("promocion").querySelector("button").focus();
      return;
    }
    playMove(options[0], true);
  }

  function cancelPromotion() {
    promotion = null;
    byId("promocion").hidden = true;
    message("Elige el destino de tu peón.");
    paint();
    focusSquare(keyboardSquare, true);
  }

  function undo() {
    if (!learning || finished || checkClock() || !history.some(({ move }) => move.color === human)) return;
    abortWork();
    suspendClock();
    let entry;
    do {
      changeOccurrences(match.hash(), -1);
      entry = history.pop();
      match.undo();
    } while (entry.move.color !== human);
    time = entry.time;
    claiming = false;
    clearSelection();
    advise();
    restartClock();
    turnText();
    message("Has vuelto al momento anterior a tu jugada. Prueba otro movimiento.");
    paint();
    focusSquare(entry.move.from, true);
  }

  async function askHint() {
    if (!learning || finished || promotion || claiming || match.turn() !== human || checkClock()) return;
    abortWork();
    const controller = new AbortController();
    search = controller;
    message("Estoy buscando una pista…");
    paint();
    let move;
    try {
      move = await engine.choose(Chess, match.fen(), "avanzado", { signal: controller.signal, random: () => 0 });
    } catch {
      if (search === controller) move = match.moves({ verbose: true })[0];
    }
    if (search !== controller || controller.signal.aborted) return;
    search = null;
    if (!move || checkClock() || finished) return;
    hint = move;
    selected = move.from;
    legal = match.moves({ square: selected, verbose: true });
    message("Prueba mover tu " + pieceNames[match.get(move.from).type] + " de " + move.from + " a " + move.to + ".");
    paint();
    focusSquare(move.from, true);
  }

  function changeRoute() {
    const isCurrent = location.hash.slice(1).split("?", 1)[0] === "inteligencia";
    if (isCurrent === active) return;
    if (!isCurrent) {
      window.clearInterval(timer);
      if (match) {
        checkClock();
        suspendClock();
      }
      abortWork();
      active = false;
    } else {
      active = true;
      if (match && !finished) {
        restartClock();
        if (time) timer = window.setInterval(tick, 200);
        scheduleComputer();
      }
    }
    if (match) paint();
  }

  function start(event) {
    event.preventDefault();
    abortWork();
    window.clearInterval(timer);
    match = new Chess();
    human = byId("color").value === "b" ? "b" : "w";
    learning = byId("modo").value !== "competicion";
    const chosen = byId("nivel").value;
    adaptive = chosen === "adaptativo";
    level = adaptive ? difficulty[adaptiveIndex] : engine.levels[chosen] ? chosen : "principiante";
    const minutes = +byId("reloj").value;
    time = minutes ? { w: minutes * 60000, b: minutes * 60000 } : null;
    since = null;
    finished = false;
    claiming = false;
    active = true;
    history.length = 0;
    positions.clear();
    changeOccurrences(match.hash(), 1);
    clearSelection();
    advise();
    form.hidden = true;
    byId("partida").hidden = false;
    byId("relojes").hidden = !time;
    byId("detalle").textContent = [human === "w" ? "Juegas con blancas" : "Juegas con negras", adaptive ? "Adaptativo (" + engine.levels[level].label + ")" : engine.levels[level].label,
      learning ? "Aprendizaje" : "Competición"].join(" · ");
    createBoard();
    restartClock();
    if (time) timer = window.setInterval(tick, 200);
    turnText();
    message(human === "w" ? "Elige una de tus piezas para empezar." : "El ordenador abre la partida con blancas.");
    paint();
    focusSquare(keyboardSquare, true);
    scheduleComputer();
  }

  form.addEventListener("submit", start);
  boardHost.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ia-casilla]");
    if (button) clickSquare(button.dataset.iaCasilla);
  });
  boardHost.addEventListener("focusin", (event) => {
    if (event.target.dataset.iaCasilla) focusSquare(event.target.dataset.iaCasilla);
  });
  boardHost.addEventListener("keydown", (event) => {
    const index = ordered.indexOf(event.target.dataset.iaCasilla);
    if (index < 0) return;
    if (event.key === "Escape") {
      if (promotion) cancelPromotion();
      else if (selected) {
        clearSelection();
        message("Elige una de tus piezas.");
        paint();
      }
      return;
    }
    const direction = arrows[event.key];
    if (!direction) return;
    event.preventDefault();
    const row = Math.floor(index / 8) + direction[0];
    const column = index % 8 + direction[1];
    if (row >= 0 && row < 8 && column >= 0 && column < 8) focusSquare(ordered[row * 8 + column], true);
  });
  byId("promocion").addEventListener("click", (event) => {
    const choice = event.target.closest("[data-ia-promocion]")?.dataset.iaPromocion;
    const move = promotion?.find((option) => option.promotion === choice);
    if (move) {
      playMove(move, true);
      if (!finished) focusSquare(move.to, true);
    }
  });
  byId("promocion").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelPromotion();
    }
  });
  byId("cancelar").addEventListener("click", cancelPromotion);
  for (const id of ["legales", "amenazas"]) byId(id).addEventListener("change", paint);
  byId("pista").addEventListener("click", askHint);
  byId("deshacer").addEventListener("click", undo);
  byId("rendir").addEventListener("click", () => {
    if (match && !finished && !checkClock()) finish(other(human), "Has terminado la partida. Puedes intentarlo otra vez.");
  });
  byId("tablas").addEventListener("click", () => {
    if (!match || finished || match.turn() !== human || checkClock()) return;
    const reason = drawClaim();
    if (reason && !claiming) {
      finish(null, "Has reclamado tablas. " + reason);
      return;
    }
    abortWork();
    claiming = !claiming;
    clearSelection();
    message(claiming
      ? "Elige la jugada con la que reclamarías tablas por repetición o por cincuenta movimientos."
      : "Has cancelado la reclamación. Elige una de tus piezas para continuar.");
    paint();
  });
  byId("nueva").addEventListener("click", () => {
    abortWork();
    window.clearInterval(timer);
    match = null;
    time = null;
    since = null;
    byId("partida").hidden = true;
    form.hidden = false;
    byId("nivel").focus();
  });
  window.addEventListener("hashchange", changeRoute);
})();
