ALTER TABLE alumnos ADD COLUMN curso TEXT NOT NULL DEFAULT 'Grupo piloto'
  CHECK(length(curso) BETWEEN 1 AND 40);

UPDATE piloto_version SET version=4 WHERE version=3;
