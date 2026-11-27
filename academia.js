(function () {
  "use strict";

  const academy = window.AulaAcademia;
  const byId = (name) => document.getElementById(`academia-${name}`);
  const overview = byId("portada");
  const lessonView = byId("leccion");
  if (!academy || !overview || !lessonView) return;

  const practice = byId("practica");
  const result = byId("resultado");
  const nextButton = byId("siguiente");
  const starterIds = ["tablero", "coordenadas", "piezas"];
  const ids = Object.keys(academy.lessons);
  const units = [
    { title: "Movimientos de las piezas", color: "blue", lessons: ["peon", "torre", "alfil", "caballo", "dama", "rey"] },
    { title: "Reglas de juego", color: "orange", lessons: ["capturas", "jaque", "mate", "movimientos-especiales"] },
    { title: "Estrategia y partida", color: "green", lessons: ["estrategias", "primeras-partidas"] },
  ];
  const symbols = {
    peon: "♟", torre: "♜", alfil: "♝", caballo: "♞", dama: "♛", rey: "♚",
    capturas: "×", jaque: "♔", mate: "♚", "movimientos-especiales": "↔", estrategias: "✦", "primeras-partidas": "⚑",
  };
  const storageKey = "aula-jaque.academia.v1";
  const arrows = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
  const emptyProgress = () => ({ completed: new Set(), resumes: new Map() });
  let storageBlocked = false;
  let progress = readProgress() || emptyProgress();
  let lesson;
  let step = 0;
  let passed = false;

  function addText(parent, tag, className, text) {
    const item = document.createElement(tag);
    item.className = className;
    item.textContent = text;
    parent.append(item);
    return item;
  }

  function makeLessonCard(id, color) {
    const entry = academy.lessons[id];
    const card = document.createElement("a");
    card.className = `module-card module-${color} academia-tarjeta`;
    card.href = `#aprende?leccion=${id}`;
    card.dataset.leccion = id;
    addText(card, "span", "module-icon chess", symbols[id]).setAttribute("aria-hidden", "true");
    addText(card, "span", "module-status", "Por hacer").setAttribute("data-estado-leccion", "");
    addText(card, "span", "module-name", `${ids.indexOf(id) + 1}. ${entry.title}`);
    addText(card, "span", "module-description", entry.summary);
    const action = addText(card, "span", "module-action", "Abrir lección ");
    addText(action, "span", "", "→").setAttribute("aria-hidden", "true");
    return card;
  }

  function renderUnits() {
    const target = byId("unidades-nuevas");
    if (!target) return;
    for (const [index, { title, color, lessons }] of units.entries()) {
      const available = lessons.filter((id) => Object.hasOwn(academy.lessons, id));
      if (!available.length) continue;
      const section = document.createElement("section");
      section.className = "academia-bloque";
      const heading = addText(section, "h2", "", title);
      heading.id = `academia-unidad-${index + 2}`;
      section.setAttribute("aria-labelledby", heading.id);
      const grid = document.createElement("div");
      grid.className = "academia-grid";
      for (const id of available) grid.append(makeLessonCard(id, color));
      section.append(grid);
      target.append(section);
    }
  }

  function readProgress() {
    if (storageBlocked) return null;
    let raw;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch {
      storageBlocked = true;
      return null;
    }

    let saved;
    try {
      saved = JSON.parse(raw);
    } catch {
      return null;
    }

    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return null;
    const recovered = emptyProgress();
    for (const id of ids) {
      if (Array.isArray(saved.completed) && saved.completed.includes(id)) recovered.completed.add(id);
      const index = saved.resumes?.[id];
      if (Number.isInteger(index) && index >= 0 && index < academy.lessons[id].activities.length) {
        recovered.resumes.set(id, index);
      }
    }
    return recovered;
  }

  function refreshProgress() {
    const count = progress.completed.size;
    const meter = byId("progreso");
    meter.max = ids.length;
    meter.value = count;
    byId("progreso-texto").textContent = `${count} de ${ids.length} lecciones completadas`;
    const award = byId("insignia");
    if (award) award.hidden = !starterIds.every((id) => progress.completed.has(id));
    const routeAward = byId("insignia-itinerario");
    if (routeAward) routeAward.hidden = count < ids.length || ids.length <= starterIds.length;
    const notice = byId("progreso-aviso");
    if (notice) notice.hidden = !storageBlocked;
    const local = byId("progreso-local");
    if (local) local.hidden = storageBlocked;
    for (const card of overview.querySelectorAll("[data-leccion]")) {
      const status = card.querySelector("[data-estado-leccion]");
      const id = card.dataset.leccion;
      if (!status) continue;
      const tag = progress.completed.has(id) ? "completada" : progress.resumes.has(id) ? "en-curso" : "disponible";
      const label = { completada: "Completada", "en-curso": "En curso", disponible: "Por hacer" };
      status.textContent = label[tag];
      status.dataset.estado = tag;
    }
  }

  function remember(id, index, retry = false) {
    const latest = readProgress() || progress;
    for (const completed of progress.completed) latest.completed.add(completed);
    const total = academy.lessons[id].activities.length;
    if (index === total) {
      latest.completed.add(id);
      latest.resumes.delete(id);
    } else if (retry || !latest.completed.has(id) || latest.resumes.has(id)) {
      const current = latest.resumes.get(id) ?? 0;
      latest.resumes.set(id, retry ? index : Math.max(current, index));
    }
    progress = latest;

    if (!storageBlocked) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({
          completed: [...progress.completed],
          resumes: Object.fromEntries(progress.resumes),
        }));
      } catch {
        storageBlocked = true;
      }
    }
    refreshProgress();
  }

  function showMessage(region, message, tone = "") {
    region.textContent = message;
    region.classList.remove("ok", "retry");
    if (tone) region.classList.add(tone);
  }

  function addLabels(board, labels, className) {
    const group = document.createElement("div");
    group.className = className;
    group.setAttribute("aria-hidden", "true");
    for (const label of labels) {
      const item = document.createElement("span");
      item.textContent = label;
      group.append(item);
    }
    board.append(group);
  }

  function makeBoard(host, settings, interactive = true) {
    const frame = document.createElement("div");
    frame.className = "board-frame academia-tablero";
    frame.setAttribute("role", "group");
    frame.setAttribute("aria-label", "Tablero de ajedrez");
    const grid = document.createElement("div");
    grid.className = "board-grid";
    const files = [...academy.files];
    const buttons = [];
    const occupied = [];
    const marked = [];

    for (const [row, rank] of academy.ranks.entries()) {
      for (const [column, file] of files.entries()) {
        const value = file + rank;
        const dark = (row + column) % 2 === 1;
        const highlighted = settings.highlight?.includes(value);
        const piece = settings.pieces?.[value];
        const parts = [value, `casilla ${dark ? "oscura" : "clara"}`];
        const square = document.createElement(interactive ? "button" : "div");
        square.className = "square";
        square.classList.toggle("dark", dark);
        square.classList.toggle("academia-pista-casilla", Boolean(highlighted));
        if (highlighted) {
          parts.push("marcada");
          marked.push(value);
        }
        if (piece) {
          parts.push(piece.description);
          occupied.push(`${value}, ${piece.description}`);
          square.classList.add("academia-casilla-con-pieza");
          const glyph = addText(square, "span", "academia-pieza-tablero piece chess", piece.symbol);
          glyph.setAttribute("aria-hidden", "true");
        }
        if (interactive) {
          const label = parts.join(", ");
          square.type = "button";
          square.dataset.academiaCasilla = value;
          square.tabIndex = buttons.length ? -1 : 0;
          square.setAttribute("aria-label", label);
          buttons.push({ node: square, value, label });
        } else {
          square.classList.add("academia-casilla-estatica");
        }
        grid.append(square);
      }
    }

    function setFocus(target) {
      for (const { node } of buttons) node.tabIndex = node === target ? 0 : -1;
    }

    grid.addEventListener("focusin", (event) => {
      if (event.target.matches("[data-academia-casilla]")) setFocus(event.target);
    });
    grid.addEventListener("keydown", (event) => {
      const direction = arrows[event.key];
      const index = buttons.findIndex(({ node }) => node === event.target);
      if (!direction || index < 0) return;
      event.preventDefault();
      const row = Math.floor(index / files.length) + direction[0];
      const column = index % files.length + direction[1];
      if (row >= 0 && row < academy.ranks.length && column >= 0 && column < files.length) {
        buttons[row * files.length + column].node.focus();
      }
    });
    frame.append(grid);
    if (settings.labels) {
      addLabels(frame, academy.ranks, "board-ranks");
      addLabels(frame, files, "board-files");
    } else {
      frame.classList.add("academia-tablero-sin-ejes");
    }
    if (!interactive) {
      frame.classList.add("academia-tablero-estatico");
      grid.setAttribute("aria-hidden", "true");
      const description = [occupied.length ? `Posición: ${occupied.join("; ")}.` : "Tablero vacío."];
      if (marked.length) description.push(`Casillas marcadas: ${marked.join(", ")}.`);
      addText(frame, "p", "sr-only", description.join(" "));
    }
    host.append(frame);
    return buttons;
  }

  function makeChoices(host, activity) {
    if (activity.board) makeBoard(host, activity.board, false);
    if (activity.symbol) {
      addText(host, "span", "academia-pieza chess", activity.symbol).setAttribute("aria-hidden", "true");
    }
    if (activity.description) addText(host, "p", "academia-pieza-clave", activity.description);
    const choices = document.createElement("div");
    choices.className = "academia-opciones";

    const buttons = activity.options.map(({ id, label }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button secondary academia-opcion";
      button.dataset.academiaOpcion = id;
      button.textContent = label;
      choices.append(button);
      return { node: button, value: id, label };
    });
    host.append(choices);
    return buttons;
  }

  function markAnswer(entry, state, board) {
    const { node, label } = entry;
    node.classList.toggle("correct", state === "correct");
    node.classList.toggle("incorrect", state === "incorrect");
    node.querySelector(".academia-marca")?.remove();
    if (!state) {
      node.setAttribute("aria-label", label);
      return;
    }
    const mark = document.createElement("span");
    mark.className = board ? "board-mark academia-marca" : "academia-marca";
    mark.textContent = state === "correct" ? "✓" : "×";
    mark.setAttribute("aria-hidden", "true");
    node.append(mark);
    const note = state === "correct" ? "correcta" : "vuelve a intentarlo";
    node.setAttribute("aria-label", `${label}, ${note}`);
  }

  function renderActivity(activity, host, message, onSuccess) {
    host.replaceChildren();
    showMessage(message, "");
    const board = activity.kind === "board";
    const entries = board ? makeBoard(host, activity.board) : makeChoices(host, activity);
    let solved = false;

    for (const entry of entries) {
      entry.node.addEventListener("click", () => {
        if (solved) return;
        if (!academy.isCorrect(activity, entry.value)) {
          markAnswer(entry, "incorrect", board);
          showMessage(message, activity.retry, "retry");
          return;
        }

        solved = true;
        for (const option of entries) {
          markAnswer(option, option === entry ? "correct" : "", board);
          option.node.setAttribute("aria-disabled", "true");
        }
        showMessage(message, activity.success, "ok");
        onSuccess?.();
      });
    }
  }

  function renderQuestion(focus = false) {
    const total = lesson.activities.length;
    const activity = lesson.activities[step];
    passed = false;
    practice.hidden = false;
    result.hidden = true;
    nextButton.hidden = true;
    byId("ronda").textContent = `Actividad ${step + 1} de ${total}`;
    const question = byId("pregunta");
    question.textContent = activity.prompt;
    question.tabIndex = -1;
    renderActivity(activity, byId("respuestas"), byId("mensaje"), () => {
      passed = true;
      remember(lesson.id, step + 1);
      nextButton.textContent = step + 1 === total ? "Ver resultado" : "Siguiente actividad";
      nextButton.hidden = false;
      nextButton.focus();
    });
    if (focus) question.focus();
  }

  function renderResult(focus = false) {
    practice.hidden = true;
    result.hidden = false;
    let summary = "Has completado esta lección. Puedes practicar de nuevo o elegir otra lección.";
    if (progress.completed.size === ids.length && ids.length > starterIds.length) {
      summary = `Has completado las ${ids.length} lecciones y conseguido la insignia Itinerario completado. Puedes volver a practicar cuando quieras.`;
    } else if (starterIds.includes(lesson.id) && starterIds.every((id) => progress.completed.has(id))) {
      summary = "Has completado las tres primeras lecciones y conseguido la insignia Primeros pasos. Sigue descubriendo el ajedrez.";
    }
    byId("resultado-texto").textContent = summary;
    const link = byId("proxima");
    const id = ids[ids.indexOf(lesson.id) + 1];
    link.href = id ? `#aprende?leccion=${id}` : "#aprende";
    link.textContent = id ? "Siguiente lección" : "Volver a la academia";
    if (focus) byId("resultado-titulo").focus();
  }

  function renderLesson(id, focus) {
    lesson = academy.lessons[id];
    overview.hidden = true;
    lessonView.hidden = false;
    byId("titulo").textContent = lesson.title;
    byId("intro").textContent = lesson.summary;
    const explanation = lesson.explanation.map((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      return paragraph;
    });
    const reading = byId("explicacion");
    reading.replaceChildren(...explanation);
    if (id === "piezas") {
      const glossary = document.createElement("ul");
      glossary.className = "academia-glosario";
      for (const { symbol, label } of academy.pieces) {
        const item = document.createElement("li");
        const glyph = document.createElement("span");
        glyph.className = "chess";
        glyph.setAttribute("aria-hidden", "true");
        glyph.textContent = symbol;
        item.append(glyph, document.createTextNode(label));
        glossary.append(item);
      }
      reading.append(glossary);
    }
    byId("ejemplo-consigna").textContent = lesson.example.prompt;
    renderActivity(lesson.example, byId("ejemplo-cuerpo"), byId("ejemplo-mensaje"));
    step = progress.resumes.get(id) ?? 0;
    if (progress.completed.has(id) && !progress.resumes.has(id)) renderResult();
    else renderQuestion();
    if (focus) byId("titulo").focus();
  }

  function navigate(focus = false) {
    const [route, search] = location.hash.slice(1).split("?", 2);
    if (route !== "aprende") return;
    const selected = new URLSearchParams(search).get("leccion");
    if (ids.includes(selected)) {
      renderLesson(selected, focus);
      return;
    }
    lesson = null;
    overview.hidden = false;
    lessonView.hidden = true;
    if (focus) overview.querySelector("h1")?.focus();
  }

  nextButton.addEventListener("click", () => {
    if (!lesson || !passed) return;
    if (step + 1 === lesson.activities.length) renderResult(true);
    else {
      step += 1;
      renderQuestion(true);
    }
  });
  byId("repetir").addEventListener("click", () => {
    if (!lesson) return;
    step = 0;
    remember(lesson.id, step, true);
    renderQuestion(true);
  });
  window.addEventListener("hashchange", () => navigate(true));
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    if (storageBlocked) return;
    progress = readProgress() || emptyProgress();
    refreshProgress();
  });
  renderUnits();
  refreshProgress();
  navigate();
})();
