(function () {
  "use strict";

  const games = window.AulaArcade?.games;
  const Chess = window.AulaMotor?.Chess;
  const byId = (id) => document.getElementById("arcade-" + id);
  if (!Array.isArray(games) || !Chess || !byId("catalogo")) return;

  const storageKey = "aula-jaque.minijuegos.v1";
  const grid = document.createElement("div");
  const board = byId("tablero");
  const files = [..."abcdefgh"];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
  const squares = ranks.flatMap((rank) => files.map((file) => file + rank));
  const directions = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  const glyphs = { w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" }, b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" } };
  const names = { k: "rey", q: "dama", r: "torre", b: "alfil", n: "caballo", p: "peón" };
  const completed = loadCompleted();
  const badges = new Map();
  const status = byId("mensaje");
  let game, round, index, engine, path, selected, focusSquare, memoryHidden, remembered;
  let marks, solved, expired, promotion, matePart, clock, deadline;

  function loadCompleted() {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey));
      return new Set(Array.isArray(data) ? data.filter((id) => games.some((game) => game.id === id)) : []);
    } catch {
      return new Set();
    }
  }

  function rememberGame() {
    for (const id of loadCompleted()) completed.add(id);
    completed.add(game.id);
    for (const [id, badge] of badges) badge.hidden = !completed.has(id);
    try { localStorage.setItem(storageKey, JSON.stringify([...completed])); } catch { /* Sigue en esta página. */ }
  }

  function textElement(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  function makeCatalog() {
    for (const item of games) {
      const card = document.createElement("a");
      card.className = "tile tile-lavender";
      card.href = "#arcade?juego=" + item.id;
      card.dataset.arcadeJuego = item.id;
      const icon = textElement("span", "tile-icon chess", item.icon || "♟");
      icon.setAttribute("aria-hidden", "true");
      const badge = textElement("span", "arcade-catalogo-logro", "✓ Actividad superada");
      badge.hidden = !completed.has(item.id);
      badges.set(item.id, badge);
      card.append(icon, textElement("span", "tile-title", item.title),
        textElement("span", "tile-desc", item.summary), textElement("span", "tile-action", "Abrir →"), badge);
      byId("catalogo").append(card);
    }
  }

  grid.className = "board-grid";
  board.append(grid);
  for (const [values, className] of [[ranks, "board-ranks"], [files, "board-files"]]) {
    const labels = document.createElement("div");
    labels.className = className;
    labels.setAttribute("aria-hidden", "true");
    for (const value of values) labels.append(textElement("span", "", value));
    board.append(labels);
  }

  function updateMessage(message = "", tone = "") {
    status.textContent = message;
    status.className = tone ? "feedback " + tone : "feedback";
  }

  function clearClock() {
    clearInterval(clock);
    clock = undefined;
  }

  function tick() {
    const value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    byId("tiempo").textContent = "Tiempo restante " + value + " s";
    if (!value) {
      clearClock();
      expired = true;
      promotion = null;
      byId("promocion").hidden = true;
      updateMessage("Se acabó el tiempo. Puedes empezar de nuevo o quitar el reloj.", "retry");
      render();
      byId("reiniciar").focus();
    }
  }

  function startClock() {
    clearClock();
    const active = round.kind !== "free" && byId("contrarreloj").checked;
    byId("tiempo").hidden = !active;
    if (active) {
      deadline = Date.now() + 90000;
      clock = setInterval(tick, 300);
      tick();
    }
  }

  function position() {
    if (engine) {
      const pieces = {};
      for (const piece of engine.board().flat().filter(Boolean)) pieces[piece.square] = piece;
      return pieces;
    }
    if (path) return { ...path.captures, [path.at]: { type: round.piece, color: "w" } };
    if (round.kind === "memory") return memoryHidden ? {} : round.pieces;
    return round.board?.pieces || {};
  }

  function paintBoard() {
    const mode = round.kind;
    const visible = mode !== "choice" || Boolean(round.board);
    board.hidden = !visible;
    const interactive = mode !== "choice" && !(mode === "memory" && !memoryHidden);
    byId("teclado").hidden = !visible || !interactive;
    if (!visible) return;

    const hadFocus = grid.contains(document.activeElement);
    const pieces = position();
    grid.replaceChildren();
    for (const [i, square] of squares.entries()) {
      const piece = pieces[square];
      const blocked = round.blocked?.includes(square);
      const goal = path?.goals.has(square);
      const marked = round.board?.highlight?.includes(square);
      const dark = (i + Math.floor(i / 8)) % 2 === 1;
      const node = document.createElement(interactive ? "button" : "div");
      node.className = "square";
      node.classList.toggle("dark", dark);
      node.classList.toggle("arcade-seleccion", square === selected);
      node.classList.toggle("arcade-obstaculo", Boolean(blocked));
      node.classList.toggle("arcade-pista", Boolean(marked));
      node.classList.toggle("correct", marks.get(square) === "correct");
      node.classList.toggle("incorrect", marks.get(square) === "incorrect");
      node.classList.toggle("arcade-con-simbolo", Boolean(piece));
      const label = [square, dark ? "casilla oscura" : "casilla clara"];
      if (piece) {
        const symbol = typeof piece === "string" ? piece : piece.symbol || glyphs[piece.color]?.[piece.type];
        const kind = Object.entries(glyphs.w).find(([, glyph]) => glyph === symbol)?.[0] ||
          Object.entries(glyphs.b).find(([, glyph]) => glyph === symbol)?.[0];
        const info = typeof piece === "string" ? names[kind] : piece.description || names[piece.type] || names[kind];
        const side = typeof piece === "object" ? piece.color : (Object.values(glyphs.w).includes(symbol) ? "w" : "b");
        const feminine = kind === "q" || kind === "r";
        const color = side === "w" ? (feminine ? "blanca" : "blanco") : (feminine ? "negra" : "negro");
        const drawing = textElement("span", "piece chess", symbol || "");
        drawing.setAttribute("aria-hidden", "true");
        node.append(drawing);
        if (info) label.push([info, color].filter(Boolean).join(" "));
      } else if (goal || blocked || marked) {
        const icon = textElement("span", "arcade-estrella", blocked ? "×" : "✦");
        icon.setAttribute("aria-hidden", "true");
        node.append(icon);
      }
      if (goal) label.push("objetivo");
      if (blocked) label.push("obstáculo");
      if (marked) label.push("marcada");
      if (marks.has(square)) {
        const mark = textElement("span", "board-mark", marks.get(square) === "correct" ? "✓" : "×");
        mark.setAttribute("aria-hidden", "true");
        node.append(mark);
      }
      if (interactive) {
        node.type = "button";
        node.dataset.arcadeCasilla = square;
        node.tabIndex = square === focusSquare ? 0 : -1;
        if (solved || expired || promotion) node.setAttribute("aria-disabled", "true");
      } else {
        node.setAttribute("role", "img");
      }
      node.setAttribute("aria-label", label.join(", "));
      grid.append(node);
    }
    if (hadFocus && interactive) grid.querySelector('[data-arcade-casilla="' + focusSquare + '"]')?.focus();
  }

  function render() {
    paintBoard();
    byId("siguiente").hidden = !solved;
    byId("siguiente").textContent = index + 1 === game.rounds.length ? "Ver resultado" : "Siguiente reto";
    byId("memoria").hidden = round.kind !== "memory" || memoryHidden || expired;
    byId("deshacer").hidden = round.kind !== "free" || !engine?.history().length;
    byId("promocion").hidden = !promotion;
    byId("reloj-control").hidden = round.kind === "free";
  }

  function win(square) {
    solved = true;
    clearClock();
    if (square) marks.set(square, "correct");
    if (index + 1 === game.rounds.length) rememberGame();
    updateMessage(round.success || "¡Muy bien! Has resuelto el reto.", "ok");
    render();
    byId("siguiente").focus();
  }

  function wrong(square, detail) {
    if (square) marks.set(square, "incorrect");
    updateMessage(detail || round.retry || "¡Inténtalo otra vez! Fíjate en la consigna.", "retry");
    render();
  }

  function setupRound(focus = false) {
    clearClock();
    round = game.rounds[index];
    engine = round.kind === "move" || round.kind === "free" ? new Chess(round.fen) : null;
    path = round.kind === "path" ? { at: round.start, goals: new Set(round.goals), captures: { ...round.captures }, moves: 0 } : null;
    selected = null;
    focusSquare = "a8";
    marks = new Map();
    solved = expired = memoryHidden = false;
    remembered = new Set();
    promotion = null;
    matePart = 0;
    byId("ronda").textContent = round.kind === "free" ? "Mueve piezas de ambos colores" : "Reto " + (index + 1) + " de " + game.rounds.length;
    byId("consigna").textContent = round.prompt;
    byId("opciones").replaceChildren();
    if (round.kind === "choice") {
      for (const item of round.options) {
        const button = textElement("button", "button secondary", item.label);
        button.type = "button";
        button.dataset.arcadeOpcion = item.id;
        button.addEventListener("click", () => {
          if (solved || expired) return;
          if (round.answers.includes(item.id)) {
            button.classList.add("correct");
            win();
          } else {
            button.classList.add("incorrect");
            wrong();
          }
        });
        byId("opciones").append(button);
      }
    }
    updateMessage();
    byId("final").hidden = true;
    byId("partida").hidden = false;
    render();
    startClock();
    if (focus) byId("consigna").focus();
  }

  function pathIsLegal(from, to) {
    const x = files.indexOf(from[0]), y = Number(from[1]);
    const dx = files.indexOf(to[0]) - x, dy = Number(to[1]) - y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (!ax && !ay || round.blocked?.includes(to)) return false;
    if (round.piece === "n") return ax * ay === 2;
    if (round.piece === "k") return Math.max(ax, ay) === 1;
    const diagonal = ax === ay;
    const straight = !ax || !ay;
    if ((round.piece === "r" && !straight) || (round.piece === "b" && !diagonal) ||
        (round.piece === "q" && !straight && !diagonal)) return false;
    for (let jump = 1; jump < Math.max(ax, ay); jump++) {
      const square = files[x + jump * Math.sign(dx)] + (y + jump * Math.sign(dy));
      if (round.blocked?.includes(square) || Object.hasOwn(path.captures, square)) return false;
    }
    return true;
  }

  function playPath(square) {
    if (!pathIsLegal(path.at, square)) {
      wrong(square, "Esa pieza no puede llegar ahí desde esta casilla. Busca otro camino.");
      return;
    }
    path.at = square;
    path.goals.delete(square);
    delete path.captures[square];
    path.moves++;
    marks.clear();
    if (!path.goals.size) {
      win(square);
    } else if (round.limit && path.moves >= round.limit) {
      expired = true;
      clearClock();
      wrong(null, "Has usado todos los movimientos. Pulsa Empezar de nuevo para probar otro camino.");
    } else {
      updateMessage("Objetivos que quedan: " + path.goals.size + (round.limit ? " · Jugadas que quedan: " + (round.limit - path.moves) : ""));
      render();
    }
  }

  const uci = (move) => move.from + move.to + (move.promotion || "");

  function playMove(move) {
    promotion = null;
    const firstMate = round.goal === "mate-two" && matePart === 0;
    const mate = round.goal === "mate" || (round.goal === "mate-two" && matePart === 1);
    if ((round.answers && !matePart && !round.answers.includes(uci(move))) || (round.goal === "capture" && !move.captured)) {
      wrong(move.to);
      return;
    }

    const played = engine.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (mate && !engine.isCheckmate()) {
      engine.undo();
      wrong(move.to, "Con esa jugada todavía puede escapar. Busca el jaque mate.");
      return;
    }
    selected = null;
    marks.clear();
    if (round.kind === "free") {
      const turn = engine.turn() === "w" ? "blancas" : "negras";
      const message = engine.isCheckmate() ? "Jaque mate." : engine.isDraw() ? "Tablas." :
        engine.isCheck() ? "Jaque. Turno de " + turn + "." : "Turno de " + turn + ".";
      updateMessage(played.san + " · " + message);
      render();
      return;
    }

    if (firstMate && !engine.isCheckmate()) {
      const replies = engine.moves({ verbose: true });
      if (!replies.length) {
        engine.undo();
        wrong(move.to);
        return;
      }
      const reply = replies.find((answer) => uci(answer) === round.reply) || replies[0];
      engine.move({ from: reply.from, to: reply.to, promotion: reply.promotion });
      matePart = 1;
      byId("consigna").textContent = "Las negras responden " + reply.san + ". Da mate en la siguiente jugada.";
      updateMessage("¡Bien! Ahora busca el mate.", "ok");
      render();
      return;
    }

    win(move.to);
  }

  function chooseSquare(square) {
    if (solved || expired || promotion || (engine && round.kind === "free" && engine.isGameOver())) return;
    focusSquare = square;
    marks.delete(square);
    if (path) {
      playPath(square);
    } else if (engine) {
      const piece = engine.get(square);
      if (piece?.color === engine.turn()) {
        selected = selected === square ? null : square;
        updateMessage(selected ? "Ahora elige la casilla de destino." : "");
        render();
      } else if (selected) {
        const candidates = engine.moves({ square: selected, verbose: true }).filter((move) => move.to === square);
        if (candidates.length > 1) {
          promotion = candidates;
          render();
          byId("promocion").querySelector("button").focus();
        } else if (candidates.length) playMove(candidates[0]);
        else wrong(square, "Esa jugada no está permitida. Elige otro destino.");
      } else {
        updateMessage("Elige primero una pieza del color que tiene el turno.", "retry");
      }
    } else if (round.kind === "memory" && memoryHidden) {
      if (round.answers.includes(square)) {
        remembered.add(square);
        marks.set(square, "correct");
        if (remembered.size === round.answers.length) win(square);
        else {
          updateMessage("Ya has encontrado " + remembered.size + " de " + round.answers.length + " casillas.", "ok");
          render();
        }
      } else wrong(square);
    } else if (round.kind === "target") {
      if (round.answers.includes(square)) win(square);
      else wrong(square);
    }
  }

  function route() {
    const [view, query] = location.hash.slice(1).split("?", 2);
    clearClock();
    if (view !== "arcade") return;
    game = games.find((item) => item.id === new URLSearchParams(query).get("juego"));
    byId("titulo").textContent = game?.title || "Elige un minijuego";
    byId("intro").textContent = game?.instructions || "Vuelve al catálogo para elegir una actividad.";
    byId("final").hidden = true;
    byId("partida").hidden = !game;
    if (!game) return;
    index = 0;
    byId("contrarreloj").checked = false;
    setupRound();
    byId("titulo").focus({ preventScroll: true });
  }

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-arcade-casilla]");
    if (button) chooseSquare(button.dataset.arcadeCasilla);
  });
  grid.addEventListener("keydown", (event) => {
    const button = event.target.closest("[data-arcade-casilla]");
    const delta = directions[event.key];
    if (!button || !delta) return;
    event.preventDefault();
    const i = squares.indexOf(button.dataset.arcadeCasilla);
    const x = i % 8 + delta[0], y = Math.floor(i / 8) + delta[1];
    if (x < 0 || x > 7 || y < 0 || y > 7) return;
    button.tabIndex = -1;
    focusSquare = squares[y * 8 + x];
    const next = grid.querySelector('[data-arcade-casilla="' + focusSquare + '"]');
    next.tabIndex = 0;
    next.focus();
  });
  grid.addEventListener("focusin", (event) => {
    const button = event.target.closest("[data-arcade-casilla]");
    if (!button || focusSquare === button.dataset.arcadeCasilla) return;
    grid.querySelector('[data-arcade-casilla="' + focusSquare + '"]')?.setAttribute("tabindex", "-1");
    focusSquare = button.dataset.arcadeCasilla;
    button.tabIndex = 0;
  });
  byId("siguiente").addEventListener("click", () => {
    if (!solved) return;
    index++;
    if (index < game.rounds.length) setupRound(true);
    else {
      byId("partida").hidden = true;
      byId("final").hidden = false;
      byId("final-titulo").focus();
    }
  });
  byId("memoria").addEventListener("click", () => {
    memoryHidden = true;
    byId("consigna").textContent = "Toca las casillas donde estaban las piezas.";
    render();
    grid.querySelector("[data-arcade-casilla]")?.focus();
  });
  byId("deshacer").addEventListener("click", () => {
    engine?.undo();
    marks.clear();
    selected = null;
    promotion = null;
    updateMessage("Jugada deshecha · Turno de " + (engine.turn() === "w" ? "blancas." : "negras."));
    render();
  });
  byId("promocion").addEventListener("click", (event) => {
    if (expired) return;
    const color = event.target.closest("[data-arcade-promocion]")?.dataset.arcadePromocion;
    const move = promotion?.find((candidate) => candidate.promotion === color);
    if (move) playMove(move);
  });
  byId("contrarreloj").addEventListener("change", () => setupRound(true));
  byId("reiniciar").addEventListener("click", () => setupRound(true));
  byId("repetir").addEventListener("click", () => {
    index = 0;
    setupRound(true);
  });
  makeCatalog();
  route();
  window.addEventListener("hashchange", route);
})();
