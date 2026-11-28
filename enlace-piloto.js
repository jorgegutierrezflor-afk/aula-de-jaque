(function () {
  "use strict";

  const setting = window.AULA_JAQUE_PORTAL;
  if (location.protocol !== "https:" || typeof setting !== "string" || !setting.trim()) return;
  let portal;
  try {
    portal = new URL(setting.trim());
    if (portal.protocol !== "https:" || portal.username || portal.password || portal.search || portal.hash) return;
  } catch {
    return;
  }

  for (const link of document.querySelectorAll("[data-piloto-destino]")) {
    const target = new URL(portal);
    target.hash = link.dataset.pilotoDestino;
    link.href = target.href;
    link.hidden = false;
  }
  for (const section of document.querySelectorAll("[data-piloto-pendiente]")) section.hidden = true;
  for (const section of document.querySelectorAll("[data-piloto-activo]")) section.hidden = false;
  for (const tile of document.querySelectorAll("[data-piloto-tarjeta]")) {
    tile.dataset.availability = "disponible";
    tile.querySelector(".module-status").textContent = "Grupo piloto";
    tile.querySelector(".module-action").textContent = tile.dataset.pilotoTarjeta === "perfil" ? "Abrir mi perfil →" : "Abrir la tienda →";
  }
})();
