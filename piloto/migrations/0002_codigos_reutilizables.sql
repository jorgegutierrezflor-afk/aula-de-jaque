ALTER TABLE alumnos ADD COLUMN numero INTEGER CHECK(numero > 0);
ALTER TABLE alumnos ADD COLUMN alias_publico TEXT;
UPDATE alumnos SET numero=(
  SELECT ficha FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY rowid) AS ficha FROM alumnos) AS numerados
  WHERE numerados.id=alumnos.id
), alias_publico=alias, alias='@' || id;
CREATE UNIQUE INDEX alumnos_por_numero ON alumnos(grupo_id, numero);

CREATE TABLE accesos_secuencia (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  ultimo_numero INTEGER NOT NULL CHECK(ultimo_numero >= 0)
);
INSERT INTO accesos_secuencia SELECT 1, COALESCE(MAX(numero), 0) FROM alumnos;

ALTER TABLE codigos ADD COLUMN reutilizable INTEGER NOT NULL DEFAULT 0 CHECK(reutilizable IN (0, 1));

DROP TABLE piloto_version;
CREATE TABLE piloto_version (version INTEGER PRIMARY KEY CHECK(version >= 1));
INSERT INTO piloto_version VALUES (2);
