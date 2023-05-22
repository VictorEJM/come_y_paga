DROP DATABASE IF EXISTS come_y_paga;
CREATE DATABASE IF NOT EXISTS come_y_paga CHARACTER SET utf8mb4;
USE come_y_paga;

CREATE TABLE IF NOT EXISTS usuario (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL DEFAULT 'Anonimo',
  apellidos VARCHAR(50) NOT NULL DEFAULT 'Anonimo',
  fecha_nacimiento DATE NOT NULL DEFAULT '0001-01-01',
  direccion VARCHAR(100) NOT NULL DEFAULT 'desconocida',
  telefono VARCHAR(20) NOT NULL DEFAULT '000000000',
  email VARCHAR(100) NOT NULL DEFAULT 'unknown@email.com',
  municipio VARCHAR(50) NOT NULL DEFAULT 'desconocido',
  nombre_usuario VARCHAR(50) NOT NULL UNIQUE DEFAULT 'anon',
  contrasena_usuario VARCHAR(128) NOT NULL DEFAULT '1234',
  tipo_usuario ENUM('administrador', 'repartidor', 'cliente') NOT NULL DEFAULT 'cliente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS restaurante (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL DEFAULT 'Anonimo',
  tipo_comida VARCHAR(50) NOT NULL DEFAULT 'que_tipo_de_comida_es_esta?',
  direccion VARCHAR(100) NOT NULL DEFAULT 'desconocida',
  telefono VARCHAR(20) NOT NULL DEFAULT '000000000',
  email VARCHAR(100) NOT NULL DEFAULT 'unknown@email.com',
  tipologia VARCHAR(50) NOT NULL DEFAULT 'desconocida',
  logo TEXT NOT NULL,
  estrellas TINYINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS plato (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL DEFAULT 'Anonimo',
  precio FLOAT NOT NULL DEFAULT 0.00,
  imagen TEXT NOT NULL,
  tipo ENUM('entrante', 'principal', 'postre', 'bebida') NOT NULL DEFAULT 'entrante',
  id_restaurante INT UNSIGNED NOT NULL,
  FOREIGN KEY (id_restaurante) REFERENCES restaurante(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedido (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NOT NULL,
  id_restaurante INT UNSIGNED NOT NULL,
  direccion VARCHAR(100) NOT NULL DEFAULT 'desconocida',
  telefono VARCHAR(20) NOT NULL DEFAULT '000000000',
  precio VARCHAR(10) NOT NULL DEFAULT 0.00,
  estado ENUM('pendiente', 'cancelado', 'en_proceso', 'entregado', 'incidencia') NOT NULL DEFAULT 'incidencia',
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  plato TEXT NOT NULL,
  nombre_repartidor VARCHAR(50) NOT NULL DEFAULT 'NADIE',
  FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (id_restaurante) REFERENCES restaurante(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO usuario (nombre, apellidos, fecha_nacimiento, direccion, telefono, email, municipio, nombre_usuario, contrasena_usuario, tipo_usuario)
VALUES
  ('VictorAdmin', 'admin', '1990-01-25', 'C/Administración 777', '111111111', 'admin@admin.com', 'Central', 'admin', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'administrador'),
  ('Juan', 'García', '1990-07-08', 'Calle Mayor, 1', '123456789', 'juan.garcia@example.com', 'Madrid', 'juangarcia', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'cliente'),
  ('María', 'López', '1985-02-11', 'Avenida de la Playa, 5', '987654321', 'maria.lopez@example.com', 'Barcelona', 'marialopez', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'cliente'),
  ('Pedro', 'Gómez', '1975-04-09', 'Plaza del Ayuntamiento, 2', '555555555', 'pedro.gomez@example.com', 'Valencia', 'pedrogomez', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'repartidor'),
  ('Ana', 'Pérez', '1980-03-23', 'Calle de la Rosa, 7', '111111111', 'ana.perez@example.com', 'Madrid', 'anaperez', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'administrador'),
  ('Saf', 'Loc', '1979-12-11', 'C/Horjas 12', '927357925', 'saf.derz@mail.com', 'Salamanca', 'saf', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'cliente');

INSERT INTO restaurante (nombre, tipo_comida, direccion, telefono, email, tipologia, logo, estrellas) 
VALUES 
  ('La Terraza', 'Mediterránea', 'Calle de la Plaza 3', '+34 910123456', 'laterraza@email.com', 'Terraza', 'terraza_logo-2023-04-01.jpg', 4),
  ('El Rincón', 'Asiática', 'Calle del Mar 15', '+34 910789012', 'elrincon@email.com', 'Restaurante', 'rincon_logo-2023-02-03.jpg', 3);

INSERT INTO plato (nombre, precio, imagen, tipo, id_restaurante) 
VALUES
  ('Ensalada César', 12.50, 'ensalada_cesar-2023-04-01.jpg', 'entrante', 1), 
  ('Arroz a la Cubana', 10.00, 'arroz_a_la_cubana-2023-02-03.jpg', 'principal', 2);

INSERT INTO pedido (id_usuario, id_restaurante, direccion, telefono, precio, estado, cantidad, plato, nombre_repartidor)
VALUES
  (1, 1, 'C/Administración 777', '111111111', 25.00, 'pendiente', 2, 'Arroz a la Cubana', 'POR CONFIRMAR'),
  (3, 2, 'Avenida de la Playa, 5', '987654321', 30.00, 'pendiente', 3, 'Ensalada César', 'POR CONFIRMAR');

-- PRUEBA CON EL DELETE ON CASCADE
-- DELETE FROM restaurante WHERE id = 1;

-- PRUEBA CON EL UPDATE ON CASCADE
-- UPDATE restaurante SET id = 3 SET nombre = 'McDonald' WHERE id = 1;

UPDATE pedido SET estado = 'en_proceso' WHERE id = 1;

SELECT * FROM come_y_paga.usuario;
SELECT * FROM come_y_paga.restaurante;
SELECT * FROM come_y_paga.plato;
SELECT * FROM come_y_paga.pedido;
