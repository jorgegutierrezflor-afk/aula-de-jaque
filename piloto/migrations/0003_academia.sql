CREATE TABLE academia_avance (
  alumno_id TEXT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  leccion_id TEXT NOT NULL,
  paso INTEGER NOT NULL CHECK(paso > 0),
  completa INTEGER NOT NULL CHECK(completa IN (0, 1)),
  PRIMARY KEY (alumno_id, leccion_id)
);

UPDATE piloto_version SET version = 3 WHERE version = 2;
