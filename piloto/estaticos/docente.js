(function () {
  "use strict";

  const section = document.getElementById("gestion-docente");
  if (!section) return;

  const field = (suffix) => document.getElementById("docente-" + suffix);
  const ruleNames = {
    leccion: "Lección",
    minijuego: "Minijuego",
    partida: "Partida completada",
    victoria: "Victoria",
    reto: "Reto",
    etapa: "Etapa de la academia",
  };
  const issued = new Map();
  const courses = new Intl.Collator("es", { numeric: true });
  let data = null;
  let groupId = "";
  let selectedCourse = "";
  let confirmation = null;
  let working = false;
  let generation = 0;

  function report(message, tone = "") {
    field("estado").textContent = message;
    field("estado").dataset.tone = tone;
  }

  function request(method, path, body) {
    return window.AulaFase3.request(method, path, body);
  }

  function options(select, values, empty) {
    const selected = select.value;
    const choices = values.length ? values : [{ value: "", label: empty }];
    select.replaceChildren(...choices.map(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    }));
    if (choices.some(({ value }) => String(value) === selected)) select.value = selected;
  }

  function chip(label, ariaLabel, callback) {
    const button = document.createElement("button");
    button.className = "button secondary";
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
    button.addEventListener("click", callback);
    return button;
  }

  function labelText(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  function accessName(student) {
    return Number.isInteger(student.numero) && student.numero > 0 ? "Acceso " + student.numero : "Acceso existente";
  }

  function courseName(student) {
    return student.curso || "Grupo piloto";
  }

  function fullName(student) {
    return accessName(student) + (student.alias ? " · " + student.alias : "");
  }

  function renderRule(name, value) {
    const row = document.createElement("div");
    row.className = "docente-importe";
    const label = labelText("label", ruleNames[name] + " (monedas)");
    label.htmlFor = "docente-importe-" + name;
    const amount = document.createElement("input");
    amount.id = label.htmlFor;
    amount.name = name;
    amount.type = "number";
    amount.min = "0";
    amount.max = "1000";
    amount.step = "1";
    amount.value = value;
    amount.required = true;
    row.append(label, amount);
    return row;
  }

  function askConfirmation(student, kind, opener) {
    confirmation = { student, kind, opener };
    const destructive = kind === "delete";
    field("confirmacion").toggleAttribute("data-destructiva", destructive);
    field("confirmacion-titulo").textContent = (destructive ? "Eliminar el perfil de " : "Pausar ") + fullName(student);
    field("confirmacion-detalle").textContent = destructive
      ? "Se borrarán el acceso, el progreso, las monedas y el inventario de este perfil. El borrado es permanente."
      : "El código dejará de dar acceso al perfil hasta que lo reactives. El progreso se conserva.";
    field("confirmar").textContent = destructive ? "Eliminar definitivamente" : "Confirmar pausa";
    field("confirmacion").hidden = false;
    field("cancelar").focus();
  }

  function clearConfirmation(restoreFocus = false) {
    const opener = confirmation?.opener;
    confirmation = null;
    field("confirmacion").hidden = true;
    field("confirmacion").removeAttribute("data-destructiva");
    field("confirmacion-titulo").textContent = "";
    field("confirmacion-detalle").textContent = "";
    if (restoreFocus) opener?.focus();
  }

  function issuedList() {
    return [...issued.values()]
      .filter(({ alumno }) => !selectedCourse || courseName(alumno) === selectedCourse)
      .sort((left, right) => courses.compare(courseName(left.alumno), courseName(right.alumno)) || left.alumno.numero - right.alumno.numero);
  }

  function codeCourses(list) {
    const grouped = new Map();
    for (const access of list) {
      const course = courseName(access.alumno);
      if (!grouped.has(course)) grouped.set(course, []);
      grouped.get(course).push(access);
    }
    return [...grouped.entries()];
  }

  function codeSections(list, headingTag) {
    return codeCourses(list).map(([course, accesses]) => {
      const group = document.createElement("section");
      group.className = "docente-codigos-curso";
      const cards = document.createElement("ol");
      cards.className = "docente-lista-codigos";
      for (const { alumno, codigo } of accesses) {
        const item = document.createElement("li");
        item.append(labelText("strong", accessName(alumno)), labelText("code", codigo));
        if (!alumno.activo) item.append(labelText("span", "En pausa"));
        cards.append(item);
      }
      group.append(labelText(headingTag, course), cards);
      return group;
    });
  }

  function codeLines(list) {
    return codeCourses(list).flatMap(([course, accesses]) => [
      "Curso o grupo: " + course,
      ...accesses.map(({ alumno, codigo }) => accessName(alumno) + "  " + codigo + (alumno.activo ? "" : "  (en pausa)")),
    ]);
  }

  function csvCell(value) {
    const text = String(value);
    // Treat values that spreadsheet apps could interpret as formulas as text.
    const safe = /^[\s\u200b-\u200f\u2060]*[=+@＝＋－＠-]/u.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  }

  function downloadCodes() {
    const list = issuedList();
    if (!list.length) return;
    const rows = [
      ["Curso o grupo", "Acceso", "Código", "Estado"],
      ...list.map(({ alumno, codigo }) => [courseName(alumno), alumno.numero, codigo, alumno.activo ? "Activo" : "En pausa"]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
    try {
      const file = new Blob(["\ufeff", csv, "\r\n"], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      const courseSlug = selectedCourse.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      link.download = "aula-de-jaque-codigos" + (courseSlug ? "-" + courseSlug : "") + ".csv";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      report("No se ha podido descargar el archivo. Puedes copiar o imprimir la lista.", "error");
    }
  }

  function renderIssuedCodes(focus = false) {
    const list = issuedList();
    field("codigo").hidden = !list.length;
    field("codigo-lista").replaceChildren(...codeSections(list, "h4"));
    field("codigo-detalle").textContent = list.length === 1
      ? "1 código disponible en esta sesión del panel."
      : list.length + " códigos disponibles en esta sesión del panel.";
    field("codigo-valor").value = field("copia-manual").hidden ? "" : codeLines(list).join("\n");
    if (!list.length) field("copia-manual").hidden = true;
    if (list.length && focus) field("codigo-titulo").focus();
  }

  function presentCodes(accesses) {
    for (const access of accesses) issued.set(access.alumno.id, access);
    field("copia-manual").hidden = true;
    renderIssuedCodes(true);
  }

  function hideCodes() {
    issued.clear();
    field("copia-manual").hidden = true;
    field("codigo-valor").value = "";
    renderIssuedCodes();
    field("codigo-detalle").textContent = "";
  }

  function clearPrint() {
    document.body.classList.remove("docente-modo-impresion");
    field("hoja-impresion")?.remove();
  }

  function printCodes() {
    const list = issuedList();
    if (!list.length) return;
    clearPrint();

    const sheet = document.createElement("section");
    sheet.id = "docente-hoja-impresion";
    sheet.append(
      labelText("h1", "Aula de Jaque · Lista privada de códigos"),
      labelText("p", "Entrega a cada alumno su código en privado y guarda la lista en un lugar seguro."),
      ...codeSections(list, "h2")
    );
    document.body.append(sheet);
    document.body.classList.add("docente-modo-impresion");
    try {
      window.print();
    } catch {
      clearPrint();
      report("No se ha podido abrir la impresión. Puedes copiar la lista.", "error");
    }
  }

  function focusStudent(id) {
    const row = [...field("aliases").children].find((entry) => entry.dataset.alumno === String(id));
    (row?.querySelector("button") || field("grupos-titulo")).focus();
  }

  function toggleStudent(student, active) {
    return change(async () => {
      await request("PATCH", "/api/docente/alumnos/" + encodeURIComponent(student.id), { activo: active });
      if (issued.has(student.id)) issued.get(student.id).alumno.activo = active;
      return {
        message: accessName(student) + (active ? " activado." : " en pausa."),
        after: () => focusStudent(student.id),
      };
    });
  }

  function generateCode(student) {
    return change(async () => {
      const result = await request("POST", "/api/docente/alumnos/" + encodeURIComponent(student.id) + "/acceso");
      return {
        course: courseName(student),
        message: "Código renovado para " + fullName(student) + ". El código anterior ha quedado invalidado.",
        after: () => presentCodes([{ alumno: student, codigo: result.codigo }]),
      };
    });
  }

  function deleteStudent(student) {
    return change(async () => {
      await request("DELETE", "/api/docente/alumnos/" + encodeURIComponent(student.id));
      if (issued.delete(student.id)) renderIssuedCodes();
      return {
        message: "Perfil de " + fullName(student) + " eliminado.",
        after: () => field("grupos-titulo").focus(),
      };
    });
  }

  function renderStudent(student) {
    const row = document.createElement("article");
    row.className = "docente-alias";
    row.dataset.alumno = student.id;
    const copy = document.createElement("div");
    const balance = student.monedas === 1 ? "1 moneda" : student.monedas + " monedas";
    copy.append(
      labelText("h4", accessName(student)),
      labelText("p", courseName(student)),
      labelText("p", student.alias || "Alias por elegir"),
      labelText("p", (student.activo ? "Acceso activo" : "Acceso en pausa") + " · " + balance)
    );
    const buttons = document.createElement("div");
    buttons.className = "docente-acciones";
    if (student.activo) {
      buttons.append(chip("Renovar código", "Renovar código de " + fullName(student), () => generateCode(student)));
      buttons.append(chip("Pausar", "Pausar " + fullName(student), (event) => askConfirmation(student, "pause", event.currentTarget)));
    } else {
      buttons.append(chip("Activar", "Activar " + fullName(student), () => toggleStudent(student, true)));
    }
    const remove = chip("Eliminar perfil", "Eliminar el perfil de " + fullName(student),
      (event) => askConfirmation(student, "delete", event.currentTarget));
    remove.classList.add("docente-eliminar");
    buttons.append(remove);
    row.append(copy, buttons);
    return row;
  }

  function renderGroup() {
    const group = data.alumnos.filter((student) => student.grupoId === groupId);
    const knownCourses = [...new Set(group.map(courseName))].sort(courses.compare);
    if (!knownCourses.includes(selectedCourse)) selectedCourse = "";
    field("cursos-sugeridos").replaceChildren(...knownCourses.map((course) => new Option(course, course)));
    options(field("filtro-curso"), [
      { value: "", label: "Todos los cursos y grupos" },
      ...knownCourses.map((course) => ({ value: course, label: course })),
    ]);
    field("filtro-curso").value = selectedCourse;
    const students = selectedCourse ? group.filter((student) => courseName(student) === selectedCourse) : group;
    field("cuenta-accesos").textContent = students.length === 1 ? "1 acceso" : students.length + " accesos";
    field("aliases").replaceChildren(...(students.length
      ? students.map(renderStudent)
      : [labelText("p", "Todavía no hay códigos de acceso.")]));
    options(field("reconocer-alias"), students.filter(({ activo }) => activo)
      .map((student) => ({ value: student.id, label: fullName(student) + " · " + courseName(student) })), "Sin perfiles activos");
  }

  function updateButtons() {
    field("recargar").disabled = working;
    field("generar").disabled = working || !groupId;
    field("cantidad").disabled = working || !groupId;
    field("curso").disabled = working || !groupId;
    field("filtro-curso").disabled = working || !groupId;
    field("reconocer-boton").disabled = working || !field("reconocer-alias").value || !field("actividad").value;
    field("guardar").disabled = working;
    field("confirmar").disabled = working;
    for (const button of field("aliases").querySelectorAll("button")) button.disabled = working;
    for (const input of field("importes").querySelectorAll("input")) input.disabled = working;
    field("consola").setAttribute("aria-busy", String(working));
  }

  function render(values) {
    data = values;
    groupId = data.grupos.find(({ nombre }) => nombre === "Grupo piloto")?.id ?? "";
    const students = new Map(data.alumnos.map((student) => [student.id, student]));
    for (const id of issued.keys()) {
      const student = students.get(id);
      if (student) issued.get(id).alumno = student;
      else issued.delete(id);
    }
    renderGroup();
    renderIssuedCodes();
    options(field("actividad"), data.actividades.map(({ id, nombre }) => ({ value: id, label: nombre })), "Sin actividades");
    field("importes").replaceChildren(...Object.keys(ruleNames).map((name) => renderRule(name, data.reglas[name])));
    field("consola").hidden = false;
    updateButtons();
  }

  async function change(work, loading = "Guardando cambios…") {
    if (working) return;
    const revision = generation;
    working = true;
    clearConfirmation();
    report(loading);
    updateButtons();
    let operation;
    try {
      operation = await work();
      if (revision !== generation) return;
      if (operation?.course) selectedCourse = operation.course;
      const next = await request("GET", "/api/docente");
      if (revision !== generation) return;
      render(next);
      const success = typeof operation?.message === "function" ? operation.message(next) : operation?.message;
      report(success || "Datos del grupo actualizados.", "ok");
    } catch (error) {
      if (revision === generation) {
        const detail = operation
          ? "El cambio se ha guardado. Pulsa Actualizar para volver a cargar el grupo."
          : error?.message || "Esta acción no se ha podido guardar.";
        report(detail, operation ? "ok" : "error");
      }
    } finally {
      if (revision === generation) {
        working = false;
        updateButtons();
      }
    }
    if (revision === generation) operation?.after?.();
  }

  function show() {
    return change(() => Promise.resolve(), "Cargando el panel docente…");
  }

  function hide() {
    generation++;
    working = false;
    data = null;
    groupId = "";
    selectedCourse = "";
    clearPrint();
    hideCodes();
    clearConfirmation();
    field("consola").hidden = true;
    field("aliases").replaceChildren();
    field("cuenta-accesos").textContent = "";
    field("curso").value = "";
    field("cursos-sugeridos").replaceChildren();
    field("filtro-curso").replaceChildren();
    field("cantidad").value = "";
    field("reconocer-alias").replaceChildren();
    field("actividad").replaceChildren();
    field("importes").replaceChildren();
    report("");
  }

  field("recargar").addEventListener("click", show);
  field("cancelar").addEventListener("click", () => clearConfirmation(true));
  field("confirmar").addEventListener("click", () => {
    if (!confirmation) return;
    const { student, kind } = confirmation;
    if (kind === "delete") deleteStudent(student);
    else toggleStudent(student, false);
  });
  field("copiar").addEventListener("click", async () => {
    const list = issuedList();
    const revision = generation;
    if (!list.length) return;
    const text = codeLines(list).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      if (revision === generation) report("Lista de códigos copiada.", "ok");
    } catch {
      if (revision !== generation) return;
      const input = field("codigo-valor");
      field("copia-manual").hidden = false;
      input.value = text;
      input.focus();
      input.select();
      report("Lista seleccionada. Pulsa Ctrl+C o usa la opción Copiar de tu dispositivo.");
    }
  });
  field("imprimir").addEventListener("click", printCodes);
  field("descargar").addEventListener("click", downloadCodes);
  window.addEventListener("afterprint", clearPrint);
  field("filtro-curso").addEventListener("change", () => {
    if (working || !data) return;
    selectedCourse = field("filtro-curso").value;
    clearConfirmation();
    renderGroup();
    renderIssuedCodes();
    updateButtons();
  });
  field("crear-lote").addEventListener("submit", (event) => {
    event.preventDefault();
    const cantidad = field("cantidad").valueAsNumber;
    const curso = field("curso").value.normalize("NFC").trim().replace(/\s+/gu, " ");
    if (!groupId) return;
    if (!curso || curso.length > 40) {
      report("Escribe el curso o grupo con hasta 40 caracteres.", "error");
      field("curso").focus();
      return;
    }
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 500) {
      report("Elige una cantidad entera entre 1 y 500.", "error");
      field("cantidad").focus();
      return;
    }
    change(async () => {
      const result = await request("POST", "/api/docente/codigos", { cantidad, curso });
      return {
        course: courseName(result.accesos[0].alumno),
        message: result.accesos.length === 1 ? "Se ha generado 1 código de acceso." : "Se han generado " + result.accesos.length + " códigos de acceso.",
        after: () => presentCodes(result.accesos),
      };
    }, "Generando códigos…");
  });
  field("reconocer").addEventListener("submit", (event) => {
    event.preventDefault();
    const student = data?.alumnos.find(({ id }) => String(id) === field("reconocer-alias").value);
    const activity = data?.actividades.find(({ id }) => String(id) === field("actividad").value);
    if (!student || !activity) return;
    change(async () => {
      await request("POST", "/api/docente/recompensas", { alumnoId: student.id, actividadId: activity.id });
      return {
        message: (current) => {
          const balance = current.alumnos.find(({ id }) => id === student.id)?.monedas;
          return "Actividad reconocida. " + accessName(student) + " tiene " + balance + " monedas.";
        },
      };
    });
  });
  field("recompensas").addEventListener("submit", (event) => {
    event.preventDefault();
    const body = Object.fromEntries(Object.keys(ruleNames).map((name) => [name, field("importe-" + name).valueAsNumber]));
    if (Object.values(body).some((value) => !Number.isInteger(value) || value < 0 || value > 1000)) {
      report("Usa cantidades enteras entre 0 y 1000 monedas.", "error");
      return;
    }
    change(async () => {
      await request("PUT", "/api/docente/reglas", body);
      return { message: "Importes guardados para los próximos reconocimientos." };
    });
  });

  window.AulaDocente = { mostrar: show, ocultar: hide };
})();
