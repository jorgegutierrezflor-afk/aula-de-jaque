CREATE TABLE grupos (
  id TEXT PRIMARY KEY CHECK(id = 'grupo-piloto'),
  nombre TEXT NOT NULL CHECK(nombre = 'Grupo piloto')
);
INSERT INTO grupos VALUES ('grupo-piloto', 'Grupo piloto');

CREATE TABLE alumnos (
  id TEXT PRIMARY KEY,
  alias TEXT NOT NULL,
  grupo_id TEXT NOT NULL REFERENCES grupos(id),
  activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
  monedas INTEGER NOT NULL DEFAULT 0 CHECK(monedas >= 0),
  experiencia INTEGER NOT NULL DEFAULT 0 CHECK(experiencia >= 0),
  puntos INTEGER NOT NULL DEFAULT 0 CHECK(puntos >= 0),
  UNIQUE(grupo_id, alias)
);
CREATE TABLE codigos (
  huella TEXT PRIMARY KEY,
  alumno_id TEXT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  expira INTEGER NOT NULL
);
CREATE INDEX codigos_por_alumno ON codigos(alumno_id);
CREATE INDEX codigos_por_caducidad ON codigos(expira);

CREATE TABLE sesiones (
  huella TEXT PRIMARY KEY,
  rol TEXT NOT NULL CHECK(rol IN ('docente', 'alumno')),
  alumno_id TEXT REFERENCES alumnos(id) ON DELETE CASCADE,
  expira INTEGER NOT NULL,
  CHECK((rol = 'docente' AND alumno_id IS NULL) OR (rol = 'alumno' AND alumno_id IS NOT NULL))
);
CREATE INDEX sesiones_por_alumno ON sesiones(alumno_id);
CREATE INDEX sesiones_por_caducidad ON sesiones(expira);

CREATE TABLE reglas (
  tipo TEXT PRIMARY KEY,
  monedas INTEGER NOT NULL CHECK(monedas BETWEEN 0 AND 1000)
);
INSERT INTO reglas VALUES
  ('leccion', 10), ('minijuego', 15), ('partida', 20),
  ('victoria', 30), ('reto', 50), ('etapa', 100);

CREATE TABLE recompensas (
  alumno_id TEXT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  actividad_id TEXT NOT NULL,
  monedas INTEGER NOT NULL CHECK(monedas >= 0),
  experiencia INTEGER NOT NULL CHECK(experiencia >= 0),
  PRIMARY KEY (alumno_id, actividad_id)
);
CREATE TRIGGER acreditar_recompensa AFTER INSERT ON recompensas BEGIN
  UPDATE alumnos SET monedas = monedas + NEW.monedas, experiencia = experiencia + NEW.experiencia
  WHERE id = NEW.alumno_id;
END;

CREATE TABLE inventario (
  alumno_id TEXT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  articulo_id TEXT NOT NULL,
  precio INTEGER NOT NULL CHECK(precio >= 0),
  PRIMARY KEY (alumno_id, articulo_id)
);
CREATE TRIGGER descontar_compra AFTER INSERT ON inventario BEGIN
  UPDATE alumnos SET monedas = monedas - NEW.precio WHERE id = NEW.alumno_id;
END;

CREATE TABLE equipados (
  alumno_id TEXT NOT NULL,
  categoria TEXT NOT NULL,
  articulo_id TEXT NOT NULL,
  PRIMARY KEY (alumno_id, categoria),
  FOREIGN KEY (alumno_id, articulo_id) REFERENCES inventario(alumno_id, articulo_id) ON DELETE CASCADE
);

CREATE TABLE piloto_version (version INTEGER PRIMARY KEY CHECK(version = 1));
INSERT INTO piloto_version VALUES (1);
