(function () {
  "use strict";

  const byId = (id) => document.getElementById("f3-" + id);
  const names = {
    avatar: "Avatares", accesorio: "Accesorios", sombrero: "Sombreros",
    fondo: "Fondos", marco: "Marcos", tablero: "Tableros", piezas: "Piezas", efecto: "Efectos",
  };
  const routes = ["perfil", "tienda"];
  const number = new Intl.NumberFormat("es-ES");
  const aliasPattern = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} -]{1,29}$/u;
  let page = null;
  let version = 0;
  let busy = null;
  let model = null;
  let selectedItem = null;
  let editingAlias = false;

  const call = (method, path, data) => window.AulaFase3.request(method, path, data);
  const label = (category) => names[category] || "Artículo";
  const format = (amount) => number.format(amount ?? 0);

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function message(route, text = "", error = false) {
    const output = byId(route + "-mensaje");
    output.className = error ? "feedback retry" : "feedback";
    output.textContent = text;
  }

  function button(text, className, action) {
    const element = node("button", "button " + className, text);
    element.type = "button";
    element.addEventListener("click", action);
    return element;
  }

  function listRow(title, value) {
    const row = node("div");
    row.append(node("dt", "", title), node("dd", "", value));
    return row;
  }

  function thumbnail(article, detailed = false) {
    const icon = node("span", "f3-miniatura chess", article.simbolo || "✦");
    icon.dataset.tipo = article.categoria;
    icon.setAttribute("aria-hidden", "true");
    if (detailed && article.categoria === "piezas") icon.textContent = "♘ ♟";
    return icon;
  }

  function owned(id) { return model.inventario.includes(id); }
  function equipped(article) { return model.equipados[article.categoria] === article.id; }

  function decorateAvatar() {
    const avatar = byId("avatar");
    const appearance = model.equipados;
    const articleById = (id) => model.articulos.find((article) => article.id === id);
    const base = articleById(appearance.avatar);
    const ornament = articleById(appearance.sombrero || appearance.accesorio);
    avatar.replaceChildren(node("span", "", base?.simbolo || "♙"));
    if (ornament) avatar.append(node("span", "f3-avatar-adorno", ornament.simbolo));
    avatar.classList.toggle("f3-avatar-fondo", Boolean(appearance.fondo));
    avatar.classList.toggle("f3-avatar-marco", Boolean(appearance.marco));
  }

  function equipmentButton(article) {
    const active = equipped(article);
    const control = button(active ? "Desequipar" : "Equipar", "secondary", () => {
      const articuloId = active ? null : article.id;
      return change("PUT", "/api/perfil/equipo", { categoria: article.categoria, articuloId },
        (active ? "Has desequipado " : "Has equipado ") + article.nombre + ".", article.id);
    });
    control.dataset.f3Equipar = article.id;
    control.setAttribute("aria-label", (active ? "Desequipar " : "Equipar ") + article.nombre);
    control.disabled = Boolean(busy);
    return control;
  }

  function aliasEditor() {
    const first = !model.perfil.alias;
    const form = byId("alias-form");
    const wasHidden = form.hidden;
    form.hidden = !first && !editingAlias;
    byId("perfil-detalles").hidden = first;
    byId("alias-titulo").textContent = first ? "Elige tu alias" : "Cambia tu alias";
    byId("alias-cancelar").hidden = first;
    byId("alias-editar").setAttribute("aria-expanded", String(!form.hidden));
    for (const name of ["alias-editar", "alias-campo", "alias-guardar", "alias-cancelar"]) {
      byId(name).disabled = Boolean(busy);
    }
    if (wasHidden && !form.hidden) {
      const input = byId("alias-campo");
      input.value = model.perfil.alias || "";
      input.focus();
    }
  }

  function showProfile() {
    const profile = model.perfil;
    aliasEditor();
    byId("alias").textContent = profile.alias;
    byId("grupo").textContent = profile.grupo;
    decorateAvatar();
    byId("estadisticas").replaceChildren(
      listRow("Monedas de Jaque", format(profile.monedas)),
      listRow("Experiencia", format(profile.experiencia) + " XP"),
      listRow("Puntos de competición", format(profile.puntos)),
    );
    byId("progreso").replaceChildren(listRow("Actividades completadas", format(profile.completadas)));
    const badges = (profile.insignias || []).map((item) => node("li", "", "✦ " + item));
    byId("insignias").replaceChildren(...(badges.length ? badges : [
      node("li", "f3-vacio", "Tus insignias aparecerán aquí al completar actividades."),
    ]));

    const inventory = model.articulos.filter((article) => owned(article.id));
    byId("inventario-lista").replaceChildren(...(inventory.length ? inventory.map((article) => {
      const tile = node("article", "f3-articulo");
      tile.append(thumbnail(article), node("h3", "", article.nombre),
        node("p", "", equipped(article) ? "Equipado" : label(article.categoria)), equipmentButton(article));
      return tile;
    }) : [node("p", "f3-vacio", "Tus artículos de la tienda aparecerán aquí.")]));
  }

  function showPreview(moveFocus = false) {
    const content = byId("vista-previa-contenido");
    const box = byId("vista-previa-acciones");
    const title = byId("vista-previa-titulo");
    const article = model.articulos.find(({ id }) => id === selectedItem);
    title.textContent = article?.nombre || "Vista previa";
    box.replaceChildren();
    if (!article) {
      content.replaceChildren(node("p", "", "Elige un artículo para verlo de cerca."));
      return;
    }

    content.replaceChildren(thumbnail(article, true), node("p", "", article.descripcion));
    if (owned(article.id)) {
      content.append(node("p", "", equipped(article) ? "Equipado en tu inventario" : "En tu inventario"));
      box.append(equipmentButton(article));
    } else {
      const price = format(article.precio);
      const buy = button("Comprar por " + price + " monedas", "primary", () =>
        change("POST", "/api/tienda/compras", { articuloId: article.id },
          "Has comprado " + article.nombre + ". Ya está en tu inventario.", article.id)
      );
      buy.dataset.f3Comprar = article.id;
      const shortfall = article.precio - model.perfil.monedas;
      buy.disabled = shortfall > 0 || Boolean(busy);
      box.append(buy);
      if (shortfall > 0) content.append(node("p", "", "Te faltan " + format(shortfall) + " Monedas de Jaque."));
    }
    if (moveFocus) title.focus();
  }

  function shopCatalog() {
    const filter = byId("categoria").value;
    const displayed = model.articulos.filter((item) => !filter || item.categoria === filter);
    byId("tienda-catalogo").replaceChildren(...(displayed.length ? displayed.map((article) => {
      const card = node("article", "f3-articulo");
      const preview = button("Ver artículo", "secondary", () => {
        selectedItem = article.id;
        showPreview(true);
      });
      preview.dataset.f3Ver = article.id;
      preview.setAttribute("aria-label", "Ver " + article.nombre);
      card.append(thumbnail(article), node("h3", "", article.nombre),
        node("p", "f3-precio", owned(article.id) ? "En tu inventario" : format(article.precio) + " monedas"), preview);
      return card;
    }) : [node("p", "f3-vacio", "Aquí aparecerán los artículos de esta categoría.")]));
  }

  function showShop() {
    byId("tienda-saldo").textContent = format(model.perfil.monedas);
    const select = byId("categoria");
    const selected = select.value;
    const categories = [...new Set(model.articulos.map((article) => article.categoria))];
    select.replaceChildren(new Option("Todas las categorías", ""), ...categories.map((value) => new Option(label(value), value)));
    if (categories.includes(selected)) select.value = selected;
    shopCatalog();
    showPreview();
  }

  function render() {
    if (page === "perfil") showProfile();
    if (page === "tienda") showShop();
  }

  async function refresh(revision, paint = true) {
    const [profile, catalog] = await Promise.all([call("GET", "/api/perfil"), call("GET", "/api/tienda")]);
    if (revision !== version) return false;
    model = { ...profile, articulos: catalog.articulos };
    if (page === "tienda" && !profile.perfil.alias) {
      byId("tienda-contenido").hidden = true;
      location.hash = "#perfil";
      return false;
    }
    byId(page + "-sin-acceso").hidden = true;
    byId(page + "-contenido").hidden = false;
    if (paint) render();
    return true;
  }

  async function change(method, path, payload, success, articleId) {
    if (busy || !model || !page) return;
    const route = page;
    const revision = version;
    const changesAlias = path === "/api/perfil/alias";
    message(route, "Guardando…");
    const operation = call(method, path, payload);
    busy = operation;
    if (route === "perfil") aliasEditor();
    for (const control of document.getElementById(route).querySelectorAll("[data-f3-equipar], [data-f3-comprar]")) {
      control.disabled = true;
    }
    try {
      await operation;
      if (revision !== version) return;
      if (!await refresh(revision, false)) return;
      busy = null;
      if (changesAlias) {
        editingAlias = false;
        const { id, alias } = model.perfil;
        window.dispatchEvent(new CustomEvent("aula-alias-actualizado", { detail: { id, alias } }));
      }
      render();
      message(route, success);
      restoreFocus(route, articleId, changesAlias);
    } catch (error) {
      if (revision !== version) return;
      busy = null;
      render();
      message(route, error.message || "Vuelve a intentarlo.", true);
      restoreFocus(route, articleId, changesAlias);
    } finally {
      if (busy === operation) busy = null;
    }
  }

  function restoreFocus(route, articleId, changesAlias = false) {
    if (changesAlias) {
      byId(byId("alias-form").hidden ? "alias-editar" : "alias-campo").focus();
      return;
    }
    if (route === "tienda") {
      byId("vista-previa-titulo").focus();
      return;
    }
    const control = [...byId("inventario-lista").querySelectorAll("[data-f3-equipar]")]
      .find((item) => item.dataset.f3Equipar === articleId);
    control?.focus();
  }

  async function mostrar(route) {
    if (!routes.includes(route)) return;
    const revision = ++version;
    if (page !== route) {
      editingAlias = false;
      byId("alias-form").hidden = true;
      byId("alias-campo").value = "";
    }
    page = route;
    message(route);
    if (busy) await busy.catch(() => {});
    if (revision !== version) return;
    await refresh(revision);
  }

  function ocultar() {
    version += 1;
    page = null;
    model = null;
    selectedItem = null;
    editingAlias = false;
    byId("alias-form").hidden = true;
    byId("alias-editar").setAttribute("aria-expanded", "false");
    byId("alias-campo").value = "";
    byId("perfil-detalles").hidden = true;
    for (const route of routes) {
      byId(route + "-contenido").hidden = true;
      byId(route + "-sin-acceso").hidden = false;
      message(route);
    }
    byId("categoria").value = "";
    byId("alias").textContent = "";
    byId("grupo").textContent = "";
    byId("tienda-saldo").textContent = "";
    ["avatar", "estadisticas", "progreso", "insignias", "inventario-lista",
      "tienda-catalogo", "vista-previa-contenido", "vista-previa-acciones"].forEach((id) => byId(id).replaceChildren());
  }

  byId("alias-editar").addEventListener("click", () => {
    if (busy || page !== "perfil" || !model) return;
    editingAlias = true;
    message("perfil");
    aliasEditor();
    byId("alias-campo").focus();
  });
  byId("alias-cancelar").addEventListener("click", () => {
    if (busy || !model?.perfil.alias) return;
    editingAlias = false;
    message("perfil");
    aliasEditor();
    byId("alias-editar").focus();
  });
  byId("alias-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (busy || page !== "perfil" || !model || byId("alias-form").hidden) return;
    const input = byId("alias-campo");
    const alias = input.value.trim().normalize("NFC").replace(/ +/g, " ");
    if (alias.length < 2 || alias.length > 30 || !aliasPattern.test(alias)) {
      message("perfil", "Escribe un alias de 2 a 30 caracteres con letras, números, espacios o guiones.", true);
      input.focus();
      return;
    }
    if (alias === model.perfil.alias) {
      editingAlias = false;
      message("perfil");
      aliasEditor();
      byId("alias-editar").focus();
      return;
    }
    change("PATCH", "/api/perfil/alias", { alias }, "Alias guardado.");
  });

  byId("categoria").addEventListener("change", () => {
    if (!model || page !== "tienda") return;
    shopCatalog();
  });
  window.AulaAlumno = { mostrar, ocultar };
})();
