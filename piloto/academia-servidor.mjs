import respuestas from "./academia-respuestas.mjs";

export async function avanceAcademia(db, alumnoId) {
  const { results } = await db.prepare(
    "SELECT leccion_id, paso, completa FROM academia_avance WHERE alumno_id=? ORDER BY leccion_id"
  ).bind(alumnoId).all();
  return {
    completed: results.filter((row) => row.completa).map((row) => row.leccion_id),
    resumes: Object.fromEntries(results.filter((row) => !row.completa).map((row) => [row.leccion_id, row.paso])),
  };
}

export async function corregirActividad(db, alumnoId, { leccionId, paso, respuesta }) {
  if (typeof leccionId !== "string" || !Object.hasOwn(respuestas, leccionId) || !Number.isInteger(paso) || paso < 0 ||
      typeof respuesta !== "string" || respuesta.length > 64) return null;
  const ejercicios = respuestas[leccionId];
  if (paso >= ejercicios.length) return null;

  const progreso = await avanceAcademia(db, alumnoId);
  if (progreso.completed.includes(leccionId) || (progreso.resumes[leccionId] ?? 0) !== paso) {
    return { correcta: false, progreso, desactualizado: true };
  }
  if (!ejercicios[paso].includes(respuesta)) return { correcta: false, progreso };

  const termina = paso + 1 === ejercicios.length;
  const guardar = db.prepare(`INSERT INTO academia_avance (alumno_id,leccion_id,paso,completa)
    SELECT id,?,?,? FROM alumnos WHERE id=? AND activo=1
      AND (?=0 OR EXISTS (
        SELECT 1 FROM academia_avance WHERE alumno_id=? AND leccion_id=? AND paso=? AND completa=0
      ))
    ON CONFLICT (alumno_id,leccion_id) DO UPDATE SET paso=excluded.paso,completa=excluded.completa
    WHERE academia_avance.paso=? AND academia_avance.completa=0`
  ).bind(leccionId, paso + 1, Number(termina), alumnoId, paso, alumnoId, leccionId, paso, paso);

  let cambio;
  if (termina) {
    // Las lecciones de caballo y torre son distintas de sus minijuegos.
    const actividadId = leccionId === "caballo" || leccionId === "torre" ? "academia-" + leccionId : leccionId;
    const premiar = db.prepare(`INSERT OR IGNORE INTO recompensas
      SELECT a.id,?,r.monedas,10 FROM alumnos a JOIN reglas r ON r.tipo='leccion'
      WHERE a.id=? AND a.activo=1 AND EXISTS (
        SELECT 1 FROM academia_avance WHERE alumno_id=a.id AND leccion_id=? AND completa=1
      )`
    ).bind(actividadId, alumnoId, leccionId);
    [cambio] = await db.batch([guardar, premiar]);
  } else {
    cambio = await guardar.run();
  }

  const actual = await avanceAcademia(db, alumnoId);
  return cambio.meta.changes
    ? { correcta: true, progreso: actual }
    : { correcta: false, progreso: actual, desactualizado: true };
}
