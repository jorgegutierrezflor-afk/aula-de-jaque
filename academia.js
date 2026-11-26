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
  const ids = ["tablero", "coordenadas", "piezas"];
  const storageKey = "aula-jaque.academia.v1";
  const arrows = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
  const emptyProgress = () => ({ completed: new Set(), resumes: new Map() });
  let storageBlocked = false;
  let progress = readProgress() || emptyProgress();
  let lesson;
  let step = 0;
  let passed = false;

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
    byId("progreso").value = count;
    byId("progreso-texto").textContent = `${count} de ${ids.length} lecciones completadas`;
    const award = byId("insignia");
    if (award) award.hidden = count < ids.length;
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

  function makeBoard(host, settings) {
    const frame = document.createElement("div");
    frame.className = "board-frame academia-tablero";
    frame.setAttribute("role", "group");
    frame.setAttribute("aria-label", "Tablero de ajedrez");
    const grid = document.createElement("div");
    grid.className = "board-grid";
    const files = [...academy.files];
    const buttons = [];

    for (const [row, rank] of academy.ranks.entries()) {
      for (const [column, file] of files.entries()) {
        const value = file + rank;
        const dark = (row + column) % 2 === 1;
        const highlighted = settings.highlight.includes(value);
        const label = `${value}, casilla ${dark ? "oscura" : "clara"}${highlighted ? ", marcada" : ""}`;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "square";
        button.classList.toggle("dark", dark);
        button.classList.toggle("academia-pista-casilla", highlighted);
        button.dataset.academiaCasilla = value;
        button.tabIndex = buttons.length ? -1 : 0;
        button.setAttribute("aria-label", label);
        grid.append(button);
        buttons.push({ node: button, value, label });
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
    host.append(frame);
    return buttons;
  }

  function makePieceChoices(host, activity) {
    const piece = document.createElement("span");
    piece.className = "academia-pieza chess";
    piece.textContent = activity.symbol;
    piece.setAttribute("aria-hidden", "true");
    const clue = document.createElement("p");
    clue.className = "academia-pieza-clave";
    clue.textContent = activity.description;
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
    host.append(piece, clue, choices);
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
    const entries = board ? makeBoard(host, activity.board) : makePieceChoices(host, activity);
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
    const all = progress.completed.size === ids.length;
    byId("resultado-texto").textContent = all
      ? "Has completado las tres lecciones y conseguido la insignia Primeros pasos. Puedes volver a practicarlas cuando quieras."
      : "Has completado esta lección. Puedes practicar de nuevo o elegir otra lección.";
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
  refreshProgress();
  navigate();
})();
