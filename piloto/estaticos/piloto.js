(function () {
  "use strict";

  const at = (id) => document.getElementById("fase3-" + id);
  const views = [...document.querySelectorAll(".vista")];
  const links = [...at("nav").querySelectorAll("[data-fase3-rol]")];
  const roles = { "gestion-docente": "docente", perfil: "alumno", tienda: "alumno" };
  let session = null;
  let available = false;
  let busy = true;
  let revision = 0;
  let visibleView = "inicio";

  async function request(method, path, body) {
    const headers = { Accept: "application/json" };
    const options = { method, credentials: "same-origin", headers, cache: "no-store" };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    let response;
    try { response = await fetch(path, options); }
    catch { throw new Error("Ahora mismo no podemos conectar. Puedes volver a las actividades y probar más tarde."); }
    const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && path !== "/api/sesion" && session) {
        session = null;
        location.hash = "#inicio";
      }
      throw new Error(result.error || "No se pudo completar la operación. Inténtalo de nuevo.");
    }
    return result;
  }
  window.AulaFase3 = { request };

  function message(text = "", tone = "") {
    const status = at("mensaje");
    status.textContent = text;
    status.className = tone ? "feedback " + tone : "feedback";
  }

  function setBusy(value) {
    busy = value;
    at("entrar").disabled = value || !available;
    at("salir").disabled = value;
  }

  function updateSessionChrome(target) {
    at("nav").hidden = !session;
    at("accesos").hidden = Boolean(session) || !available;
    at("sesion").hidden = !session;
    for (const link of links) {
      link.hidden = link.dataset.fase3Rol !== session?.rol;
      if (link.hash === "#" + target) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    if (!session) {
      at("sesion-titulo").textContent = "";
      at("sesion-ir").href = "#inicio";
      return;
    }
    const teacher = session.rol === "docente";
    at("sesion-titulo").textContent = session.alias ? "Sesión de " + session.alias : "Tu sesión está abierta";
    at("sesion-ir").href = teacher ? "#gestion-docente" : "#perfil";
    at("sesion-ir").textContent = teacher ? "Ir al panel docente" : "Ir a mi perfil";
  }

  async function route(focus = true) {
    const current = ++revision;
    const requested = location.hash.slice(1) || "inicio";
    const role = roles[requested];
    const target = role && role === session?.rol ? requested : "inicio";
    visibleView = target;
    if (target !== "gestion-docente") window.AulaDocente?.ocultar?.();
    if (!["perfil", "tienda"].includes(target)) window.AulaAlumno?.ocultar?.();
    const selected = document.getElementById(target);
    for (const view of views) view.hidden = view !== selected;
    updateSessionChrome(target);
    if (focus) {
      window.scrollTo(0, 0);
      selected.querySelector("h1")?.focus({ preventScroll: true });
    }
    if (role && target === "inicio" && available) {
      message(session ? "Tu perfil no tiene acceso a ese apartado." : "Introduce tu código para acceder.");
    }
    try {
      if (target === "gestion-docente") await window.AulaDocente.mostrar();
      if (["perfil", "tienda"].includes(target)) await window.AulaAlumno.mostrar(target);
    } catch (error) {
      if (current === revision) message(error.message, "retry");
    }
  }

  at("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !available) return;
    setBusy(true);
    message();
    const code = at("codigo").value.trim();
    try {
      const result = await request("POST", "/api/sesion", { codigo: code });
      if (!result.perfil) throw new Error("El código no abrió una sesión.");
      session = result.perfil;
      at("form").reset();
      const hash = session.rol === "docente" ? "#gestion-docente" : location.hash === "#tienda" ? "#tienda" : "#perfil";
      if (location.hash !== hash) location.hash = hash;
      else await route();
    } catch (error) {
      message(error.message, "retry");
      at("codigo").focus();
    } finally {
      setBusy(false);
    }
  });
  at("salir").addEventListener("click", async () => {
    if (busy) return;
    setBusy(true);
    try {
      await request("DELETE", "/api/sesion");
      session = null;
      message("Sesión cerrada.");
      if (location.hash === "#inicio") await route();
      else location.hash = "#inicio";
    } catch (error) { message(error.message, "retry"); }
    finally { setBusy(false); }
  });
  at("salto").addEventListener("click", (event) => {
    event.preventDefault();
    at("contenido").focus();
  });
  window.addEventListener("aula-alias-actualizado", ({ detail }) => {
    if (session?.rol !== "alumno" || session.id !== detail?.id) return;
    session.alias = detail.alias;
    updateSessionChrome(visibleView);
  });
  window.addEventListener("hashchange", () => route());
  window.addEventListener("DOMContentLoaded", async () => {
    setBusy(true);
    try {
      available = (await request("GET", "/api/estado")).activo === true;
      if (available) session = (await request("GET", "/api/sesion")).perfil || null;
    } catch (error) { message(error.message, "retry"); }
    at("sin-servicio").hidden = available;
    try { await route(false); }
    finally { setBusy(false); }
  });
})();
