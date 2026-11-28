import { avanceAcademia, corregirActividad } from "./academia-servidor.mjs";

const rules = ["leccion", "minijuego", "partida", "victoria", "reto", "etapa"];
const catalogue = [
  { id: "caballo-lila", nombre: "Caballo lila", categoria: "avatar", precio: 15, simbolo: "♞", descripcion: "Un caballo para tu perfil." },
  { id: "torre-menta", nombre: "Torre menta", categoria: "avatar", precio: 20, simbolo: "♜", descripcion: "Una torre para tu perfil." },
  { id: "corona", nombre: "Corona dorada", categoria: "accesorio", precio: 25, simbolo: "♛", descripcion: "Una corona decorativa." },
  { id: "noche", nombre: "Noche estrellada", categoria: "fondo", precio: 30, simbolo: "✦", descripcion: "Un fondo para tu perfil." },
  { id: "madera", nombre: "Tablero de madera", categoria: "tablero", precio: 40, simbolo: "▦", descripcion: "Un diseño para tu inventario." },
];
const activities = [
  ["tablero", "El tablero", "leccion"], ["coordenadas", "Las coordenadas", "leccion"],
  ["piezas", "Las piezas", "leccion"], ["caballo", "El salto del caballo", "minijuego"],
  ["torre", "El camino de la torre", "minijuego"], ["reto-semanal", "Reto de la semana", "reto"],
  ["primeros-pasos", "Etapa Primeros pasos", "etapa"],
].map(([id, nombre, tipo]) => ({ id, nombre, tipo }));

const sessionDuration = 8 * 60 * 60 * 1000;
const cookie = "__Host-aula_jaque_piloto";
const pilotGroup = { id: "grupo-piloto", nombre: "Grupo piloto" };
const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
const validText = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} -]{1,29}$/u;
const codeAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const reusableFormat = /^[0-9A-HJKMNP-TV-Z]{16}$/;
const invalidCode = "Revisa el código o pide ayuda a tu profe.";
const pupilFields = "id,numero,alias_publico AS alias,grupo_id AS grupoId,curso,activo,monedas";
const courseFormat = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .–-]{0,39}$/u;
const encoder = new TextEncoder();

class PublicError extends Error {
  constructor(status, reason) {
    super(reason);
    this.status = status;
  }
}

function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ...headers } });
}

const reject = (status, reason) => { throw new PublicError(status, reason); };
const notFound = () => reject(404, "Esta opción no está disponible.");
const prepare = (db, sql, ...values) => db.prepare(sql).bind(...values);
const rows = async (db, sql, ...values) => (await prepare(db, sql, ...values).all()).results;
const first = (db, sql, ...values) => prepare(db, sql, ...values).first();
const exec = (db, sql, ...values) => prepare(db, sql, ...values).run();
const statusView = (row) => ({ ...row, activo: Boolean(row.activo) });

function hex(bytes) { return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function random(bytes) { return hex(crypto.getRandomValues(new Uint8Array(bytes))); }
async function hash(value) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

const reusableHash = (compact) => hash("aula-jaque-piloto:codigo-v2:" + compact);

async function newAccess() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const compact = Array.from(bytes, (byte) => codeAlphabet[byte & 31]).join("");
  return { codigo: compact.match(/.{4}/g).join("-"), huella: await reusableHash(compact) };
}

async function privateHash(secret, value) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

const sessionHash = (env, token) => privateHash(env.AULA_STAFF_SECRET, "sesion:" + token);

function equals(a, b) {
  let different = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) different |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return different === 0;
}

function sessionCookie(value, age) {
  return cookie + "=" + value + "; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=" + age;
}

function readCookie(request) {
  const entry = (request.headers.get("Cookie") || "").split(";").map((value) => value.trim())
    .find((value) => value.startsWith(cookie + "="));
  const token = entry?.slice(cookie.length + 1);
  return /^[a-f0-9]{48}$/.test(token || "") ? token : null;
}

async function bodyOf(request) {
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    reject(415, "Envía los datos desde la aplicación.");
  }
  const bytes = new Uint8Array(2048);
  if (Number(request.headers.get("Content-Length")) > bytes.length) reject(413, "La solicitud es demasiado larga.");
  if (!request.body) reject(400, "Revisa los datos enviados e inténtalo de nuevo.");
  const reader = request.body.getReader();
  let offset = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value.length > bytes.length - offset) {
      await reader.cancel();
      reject(413, "La solicitud es demasiado larga.");
    }
    bytes.set(value, offset);
    offset += value.length;
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, offset));
    const value = JSON.parse(text);
    if (value && !Array.isArray(value) && typeof value === "object") return value;
  } catch { /* Se comunica el mismo error para cualquier cuerpo inválido. */ }
  reject(400, "Revisa los datos enviados e inténtalo de nuevo.");
}

async function sessionOf(env, token) {
  if (!token) return null;
  const match = await first(env.DB, `SELECT s.rol, a.id, a.numero, a.alias_publico AS alias, a.grupo_id AS grupoId, a.curso AS grupo
    FROM sesiones s LEFT JOIN alumnos a ON a.id=s.alumno_id
    WHERE s.huella=? AND s.expira>? AND (s.rol='docente' OR (a.activo=1 AND a.grupo_id=?))`, await sessionHash(env, token), Date.now(), pilotGroup.id);
  if (!match) return null;
  return match.rol === "docente" ? { id: "docente", rol: "docente", alias: "Docente" } : match;
}

async function signIn(env, body, previousToken) {
  const db = env.DB;
  const code = typeof body.codigo === "string" ? body.codigo.trim() : "";
  if (!code || code.length > 150) reject(401, invalidCode);
  const [suppliedHash, expectedHash] = await Promise.all([hash(code), hash(env.AULA_STAFF_SECRET)]);
  const staff = equals(suppliedHash, expectedHash);
  const compact = code.replace(/[\s-]/g, "").toUpperCase();
  const reusable = reusableFormat.test(compact);
  if (!staff && !reusable && !/^[a-f0-9]{24}$/i.test(code)) reject(401, invalidCode);
  const token = random(24);
  const tokenHash = await sessionHash(env, token);
  const now = Date.now();
  let changes;
  if (staff) {
    changes = [prepare(db, "INSERT INTO sesiones VALUES (?, 'docente', NULL, ?)", tokenHash, now + sessionDuration)];
  } else {
    const codeHash = await (reusable ? reusableHash(compact) : hash(code.toLowerCase()));
    changes = [
      prepare(db, `INSERT INTO sesiones (huella,rol,alumno_id,expira)
        SELECT ?, 'alumno', a.id, ? FROM codigos c JOIN alumnos a ON a.id=c.alumno_id
        WHERE c.huella=? AND c.reutilizable=? AND (c.reutilizable=1 OR c.expira>?) AND a.activo=1 AND a.grupo_id=?`,
      tokenHash, now + sessionDuration, codeHash, Number(reusable), now, pilotGroup.id),
    ];
    if (!reusable) changes.push(prepare(db,
      "DELETE FROM codigos WHERE huella=? AND reutilizable=0 AND EXISTS (SELECT 1 FROM sesiones WHERE huella=?)", codeHash, tokenHash));
  }
  if (previousToken) changes.push(prepare(db,
    "DELETE FROM sesiones WHERE huella=? AND EXISTS (SELECT 1 FROM sesiones WHERE huella=?)", await sessionHash(env, previousToken), tokenHash));
  changes.push(prepare(db, "DELETE FROM sesiones WHERE expira<=?", now),
    prepare(db, "DELETE FROM codigos WHERE reutilizable=0 AND expira<=?", now));
  const result = await db.batch(changes);
  if (!result[0].meta.changes) reject(401, invalidCode);
  return json({ perfil: await sessionOf(env, token) }, 200, { "Set-Cookie": sessionCookie(token, sessionDuration / 1000) });
}

async function teacherData(db) {
  const [grupos, alumnos, values] = await Promise.all([
    rows(db, "SELECT id,nombre FROM grupos WHERE id=?", pilotGroup.id),
    rows(db, `SELECT ${pupilFields} FROM alumnos WHERE grupo_id=? ORDER BY numero`, pilotGroup.id),
    rows(db, "SELECT tipo,monedas FROM reglas"),
  ]);
  return { grupos, alumnos: alumnos.map(statusView), reglas: Object.fromEntries(values.map((value) => [value.tipo, value.monedas])), actividades: activities };
}

async function authoriseCode(db, pupil) {
  const { codigo, huella } = await newAccess();
  const activePupil = "SELECT id FROM alumnos WHERE id=? AND grupo_id=? AND activo=1";
  const result = await db.batch([
    prepare(db, `DELETE FROM codigos WHERE alumno_id IN (${activePupil})`, pupil, pilotGroup.id),
    prepare(db, `DELETE FROM sesiones WHERE alumno_id IN (${activePupil})`, pupil, pilotGroup.id),
    prepare(db, `INSERT INTO codigos(huella,alumno_id,expira,reutilizable)
      SELECT ?, perfil.id, 0, 1 FROM (${activePupil}) perfil`, huella, pupil, pilotGroup.id),
    prepare(db, `SELECT ${pupilFields} FROM alumnos WHERE id=? AND grupo_id=? AND activo=1`, pupil, pilotGroup.id),
  ]);
  if (!result[2].meta.changes) reject(404, "El perfil debe estar activo para generar un acceso.");
  return { codigo, alumno: statusView(result[3].results[0]) };
}

async function revokeAccess(db, pupil) {
  const [found] = await db.batch([
    prepare(db, "SELECT id FROM alumnos WHERE id=? AND grupo_id=?", pupil, pilotGroup.id),
    prepare(db, "DELETE FROM codigos WHERE alumno_id=?", pupil),
    prepare(db, "DELETE FROM sesiones WHERE alumno_id=?", pupil),
  ]);
  if (!found.results.length) notFound();
  return { ok: true };
}

async function deleteStudent(db, pupil) {
  const changed = await exec(db, "DELETE FROM alumnos WHERE id=? AND grupo_id=?", pupil, pilotGroup.id);
  if (!changed.meta.changes) notFound();
  return { ok: true };
}

async function issueCodes(db, { cantidad, curso = pilotGroup.nombre }) {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 500) reject(400, "Indica una cantidad entre 1 y 500.");
  const course = typeof curso === "string" ? curso.trim().normalize("NFC").replace(/ +/g, " ") : "";
  if (course.length > 40 || !courseFormat.test(course)) reject(400, "Escribe un curso de hasta 40 caracteres, por ejemplo, 5.º A.");
  const entries = await Promise.all(Array.from({ length: cantidad }, async () => ({ id: random(12), ...await newAccess() })));
  const issued = new Map(entries.map(({ id, codigo }) => [id, codigo]));
  const batch = JSON.stringify(entries.map(({ id, huella }) => ({ id, huella })));
  const [, , , profiles] = await db.batch([
    prepare(db, "UPDATE accesos_secuencia SET ultimo_numero=ultimo_numero+? WHERE id=1", cantidad),
    prepare(db, `INSERT INTO alumnos(id,alias,grupo_id,numero,curso)
      SELECT json_extract(value,'$.id'), '@' || json_extract(value,'$.id'), ?, ultimo_numero-?+CAST(key AS INTEGER)+1, ?
      FROM json_each(?) CROSS JOIN accesos_secuencia WHERE accesos_secuencia.id=1`, pilotGroup.id, cantidad, course, batch),
    prepare(db, `INSERT INTO codigos(huella,alumno_id,expira,reutilizable)
      SELECT json_extract(value,'$.huella'), json_extract(value,'$.id'), 0, 1 FROM json_each(?)`, batch),
    prepare(db, `SELECT ${pupilFields} FROM alumnos
      WHERE id IN (SELECT json_extract(value,'$.id') FROM json_each(?)) ORDER BY numero`, batch),
  ]);
  return { accesos: profiles.results.map((row) => ({ alumno: statusView(row), codigo: issued.get(row.id) })) };
}

async function changeAlias(db, actor, body) {
  const alias = typeof body.alias === "string" ? body.alias.trim().normalize("NFC").replace(/ +/g, " ") : "";
  if (alias.length > 30 || !validText.test(alias)) reject(400, "Usa un alias de 2 a 30 caracteres, con letras, números, espacios o guiones.");
  const result = await exec(db, "UPDATE alumnos SET alias_publico=? WHERE id=? AND activo=1", alias, actor.id);
  if (!result.meta.changes) reject(401, "Inicia sesión con un código individual.");
  return { perfil: { ...actor, alias } };
}

async function statusChange(db, id, body) {
  if (typeof body.activo !== "boolean") reject(400, "Elige un estado válido.");
  const changes = [prepare(db, "UPDATE alumnos SET activo=? WHERE id=? AND grupo_id=?", body.activo ? 1 : 0, id, pilotGroup.id)];
  if (!body.activo) changes.push(prepare(db, "DELETE FROM sesiones WHERE alumno_id=?", id));
  changes.push(prepare(db, `SELECT ${pupilFields} FROM alumnos WHERE id=? AND grupo_id=?`, id, pilotGroup.id));
  const result = await db.batch(changes);
  if (!result[0].meta.changes) notFound();
  return { alumno: statusView(result.at(-1).results[0]) };
}

async function award(db, data) {
  const activity = activities.find((entry) => entry.id === data.actividadId);
  if (!activity) reject(400, "Selecciona una actividad del aula.");
  if (typeof data.alumnoId !== "string" || !/^[a-f0-9]{24}$/.test(data.alumnoId)) reject(400, "Selecciona un perfil del grupo piloto.");
  const result = await exec(db, `INSERT OR IGNORE INTO recompensas
    SELECT a.id,?,r.monedas,10 FROM alumnos a JOIN reglas r ON r.tipo=? WHERE a.id=? AND a.activo=1 AND a.grupo_id=?`,
    activity.id, activity.tipo, data.alumnoId, pilotGroup.id);
  if (!result.meta.changes) reject(409, "El reconocimiento ya existe o el perfil no está activo.");
  return { ok: true };
}

async function updateRules(db, data) {
  if (Object.keys(data).length !== rules.length || rules.some((key) =>
    !Object.hasOwn(data, key) || !Number.isInteger(data[key]) || data[key] < 0 || data[key] > 1000)) {
    reject(400, "Indica entre 0 y 1000 monedas para cada actividad.");
  }
  await db.batch(rules.map((key) => prepare(db, "UPDATE reglas SET monedas=? WHERE tipo=?", data[key], key)));
  return { reglas: data };
}

async function profileData(db, actor) {
  const [pupil, activityRows, inventory, equipped] = await Promise.all([
    first(db, "SELECT monedas,experiencia,puntos FROM alumnos WHERE id=? AND activo=1", actor.id),
    rows(db, "SELECT actividad_id AS id FROM recompensas WHERE alumno_id=?", actor.id),
    rows(db, "SELECT articulo_id AS id FROM inventario WHERE alumno_id=?", actor.id),
    rows(db, "SELECT categoria, articulo_id AS id FROM equipados WHERE alumno_id=?", actor.id),
  ]);
  if (!pupil) reject(401, "Inicia sesión con un código individual.");
  const earned = new Set(activityRows.map((row) => row.id));
  const insignias = [];
  if (earned.size) insignias.push("Primera actividad");
  if (earned.has("primeros-pasos") || ["tablero", "coordenadas", "piezas"].every((id) => earned.has(id))) insignias.push("Primeros pasos");
  return { perfil: { ...actor, ...pupil, completadas: earned.size, insignias },
    inventario: inventory.map((item) => item.id), equipados: Object.fromEntries(equipped.map((item) => [item.categoria, item.id])) };
}

async function buy(db, actor, data) {
  const item = catalogue.find((entry) => entry.id === data.articuloId);
  if (!item) reject(404, "El artículo no está disponible.");
  const result = await exec(db, `INSERT OR IGNORE INTO inventario
    SELECT id,?,? FROM alumnos WHERE id=? AND activo=1 AND monedas>=?`, item.id, item.precio, actor.id, item.precio);
  if (!result.meta.changes) {
    if (await first(db, "SELECT articulo_id FROM inventario WHERE alumno_id=? AND articulo_id=?", actor.id, item.id)) {
      reject(409, "Ya tienes este artículo en tu inventario.");
    }
    reject(409, "Aún te faltan monedas para conseguir este artículo.");
  }
  return { ok: true };
}

async function equip(db, actor, body) {
  if (!catalogue.some((item) => item.categoria === body.categoria)) reject(400, "La categoría no existe.");
  if (body.articuloId === null) {
    await exec(db, "DELETE FROM equipados WHERE alumno_id=? AND categoria=?", actor.id, body.categoria);
  } else {
    const item = catalogue.find((entry) => entry.id === body.articuloId && entry.categoria === body.categoria);
    if (!item) reject(400, "El artículo no pertenece a esta categoría.");
    const changed = await exec(db, `INSERT INTO equipados (alumno_id,categoria,articulo_id)
      SELECT i.alumno_id,?,i.articulo_id FROM inventario i JOIN alumnos a ON a.id=i.alumno_id
      WHERE i.alumno_id=? AND i.articulo_id=? AND a.activo=1
      ON CONFLICT(alumno_id,categoria) DO UPDATE SET articulo_id=excluded.articulo_id`,
      item.categoria, actor.id, item.id);
    if (!changed.meta.changes) reject(403, "Primero añade ese artículo a tu inventario.");
  }
  return { ok: true };
}

async function pilotReady(env, url) {
  if (url.protocol !== "https:" && !(env.AULA_LOCAL === "1" && loopback.has(url.hostname) && url.protocol === "http:")) return false;
  if (env.AULA_ORIGIN && env.AULA_ORIGIN !== url.origin) return false;
  const secret = env.AULA_STAFF_SECRET;
  if (env.AULA_ACTIVAR !== "1" || !env.DB || typeof env.AULA_LOGIN_LIMIT?.limit !== "function" ||
      typeof secret !== "string" || secret.length < 24 || secret.length > 150 || secret.trim() !== secret) return false;
  try {
    return Boolean(await first(env.DB, `SELECT id FROM grupos WHERE id=? AND nombre=?
      AND EXISTS (SELECT 1 FROM piloto_version WHERE version=4)
      AND EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='academia_avance')`, pilotGroup.id, pilotGroup.nombre));
  } catch {
    return false;
  }
}

async function allowSignIn(request, env) {
  const network = request.headers.get("CF-Connecting-IP") || "sin-red";
  const today = new Date().toISOString().slice(0, 10);
  const key = await privateHash(env.AULA_STAFF_SECRET, `limite-acceso:${today}:${network}`);
  const result = await env.AULA_LOGIN_LIMIT.limit({ key });
  return result.success;
}

async function serve(request, env, url) {
  const path = url.pathname;
  if (!path.startsWith("/api/")) return env.ASSETS ? env.ASSETS.fetch(request) : json({ error: "Ruta no disponible." }, 404);
  const method = request.method;
  const origin = request.headers.get("Origin");
  if ((origin || method !== "GET") && origin !== url.origin) reject(403, "Abre la aplicación desde este servidor.");
  const activo = await pilotReady(env, url);
  if (path === "/api/estado" && method === "GET") return json({ activo });
  if (!activo) reject(503, "El acceso al grupo piloto aún no está habilitado.");

  const db = env.DB;
  const token = readCookie(request);
  if (path === "/api/sesion" && method === "POST") {
    if (!await allowSignIn(request, env)) return json({ error: "Hay demasiados intentos de acceso. Espera un minuto y vuelve a intentarlo." }, 429, { "Retry-After": "60" });
    return signIn(env, await bodyOf(request), token);
  }
  if (path === "/api/sesion" && method === "DELETE") {
    if (token) await exec(db, "DELETE FROM sesiones WHERE huella=?", await sessionHash(env, token));
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
  }
  const actor = await sessionOf(env, token);
  if (path === "/api/sesion" && method === "GET") return json({ perfil: actor });
  if (!actor) reject(401, "Inicia sesión con un código individual.");

  if (path === "/api/docente" || path.startsWith("/api/docente/")) {
    if (actor.rol !== "docente") reject(403, "Esta opción requiere acceso docente.");
    if (path === "/api/docente" && method === "GET") return json(await teacherData(db));
    if (path === "/api/docente/codigos" && method === "POST") return json(await issueCodes(db, await bodyOf(request)), 201);
    if (path === "/api/docente/recompensas" && method === "POST") return json(await award(db, await bodyOf(request)));
    if (path === "/api/docente/reglas" && method === "PUT") return json(await updateRules(db, await bodyOf(request)));
    const student = path.match(/^\/api\/docente\/alumnos\/([a-f0-9]{24})(\/acceso)?$/);
    if (student && student[2] && method === "POST") return json(await authoriseCode(db, student[1]));
    if (student && student[2] && method === "DELETE") return json(await revokeAccess(db, student[1]));
    if (student && !student[2] && method === "PATCH") return json(await statusChange(db, student[1], await bodyOf(request)));
    if (student && !student[2] && method === "DELETE") return json(await deleteStudent(db, student[1]));
    return notFound();
  }

  if (actor.rol !== "alumno") reject(403, "Entra con un perfil de alumno para usar esta opción.");
  if (path === "/api/academia" || path === "/api/academia/respuestas") {
    if (!actor.alias) reject(409, "Elige un alias en Mi perfil para abrir tu Academia.");
    if (path === "/api/academia" && method === "GET") return json(await avanceAcademia(db, actor.id));
    if (path === "/api/academia/respuestas" && method === "POST") {
      const resultado = await corregirActividad(db, actor.id, await bodyOf(request));
      if (!resultado) reject(400, "Revisa la actividad y vuelve a intentarlo.");
      return json(resultado);
    }
    return notFound();
  }
  if (path === "/api/perfil" && method === "GET") return json(await profileData(db, actor));
  if (path === "/api/perfil/alias" && method === "PATCH") return json(await changeAlias(db, actor, await bodyOf(request)));
  if (path === "/api/tienda" && method === "GET") return json({ articulos: catalogue });
  if (path === "/api/tienda/compras" && method === "POST") return json(await buy(db, actor, await bodyOf(request)));
  if (path === "/api/perfil/equipo" && method === "PUT") return json(await equip(db, actor, await bodyOf(request)));
  return notFound();
}

export default {
  async fetch(request, env) {
    try { return await serve(request, env, new URL(request.url)); }
    catch (error) {
      if (error instanceof PublicError) return json({ error: error.message }, error.status);
      return json({ error: "No se pudo completar la operación. Vuelve a intentarlo." }, 500);
    }
  },
};
