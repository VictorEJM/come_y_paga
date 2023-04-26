DROP DATABASE IF EXISTS come_y_paga;
CREATE DATABASE IF NOT EXISTS come_y_paga;
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
);

CREATE TABLE IF NOT EXISTS restaurante (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL DEFAULT 'Anonimo',
  tipo_comida VARCHAR(50) NOT NULL DEFAULT 'que_tipo_de_comida_es_esta?',
  direccion VARCHAR(100) NOT NULL DEFAULT 'desconocida',
  telefono VARCHAR(20) NOT NULL DEFAULT '000000000',
  email VARCHAR(100) NOT NULL DEFAULT 'unknown@email.com',
  tipologia VARCHAR(50) NOT NULL DEFAULT 'desconocida',
  logo VARCHAR(200) NOT NULL DEFAULT 'nologo',
  estrellas TINYINT UNSIGNED NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plato (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL DEFAULT 'Anonimo',
  precio FLOAT NOT NULL DEFAULT 0.00,
  tipo ENUM('entrante', 'principal', 'postre', 'bebida') NOT NULL DEFAULT 'entrante',
  id_restaurante INT UNSIGNED NOT NULL,
  FOREIGN KEY (id_restaurante) REFERENCES restaurante(id)
);

CREATE TABLE IF NOT EXISTS pedido (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NOT NULL,
  id_restaurante INT UNSIGNED NOT NULL,
  precio VARCHAR(10) NOT NULL DEFAULT 0.00,
  estado ENUM('pendiente', 'en proceso', 'entregado', 'incidencia') NOT NULL DEFAULT 'incidencia',
  platos TEXT NOT NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id),
  FOREIGN KEY (id_restaurante) REFERENCES restaurante(id)
);

INSERT INTO usuario (nombre, apellidos, fecha_nacimiento, direccion, telefono, email, municipio, nombre_usuario, contrasena_usuario, tipo_usuario)
VALUES
  ('Juan', 'García', '1990-07-08', 'Calle Mayor, 1', '123456789', 'juan.garcia@example.com', 'Madrid', 'juangarcia', '81dc9bdb52d04dc20036dbd8313ed055', 'cliente'),
  ('María', 'López', '1985-02-11', 'Avenida de la Playa, 5', '987654321', 'maria.lopez@example.com', 'Barcelona', 'marialopez', '81dc9bdb52d04dc20036dbd8313ed055', 'cliente'),
  ('Pedro', 'Gómez', '1975-04-09', 'Plaza del Ayuntamiento, 2', '555555555', 'pedro.gomez@example.com', 'Valencia', 'pedrogomez', '81dc9bdb52d04dc20036dbd8313ed055', 'repartidor'),
  ('Ana', 'Pérez', '1980-03-23', 'Calle de la Rosa, 7', '111111111', 'ana.perez@example.com', 'Madrid', 'anaperez', '81dc9bdb52d04dc20036dbd8313ed055', 'administrador'),
  ('Saf', 'Loc', '1985-02-11', 'C/Horjas 12', '927357925', 'saf.derz@mail.com', 'Salamanca', 'saf', '81dc9bdb52d04dc20036dbd8313ed055', 'cliente');

INSERT INTO restaurante (nombre, tipo_comida, direccion, telefono, email, tipologia, logo, estrellas) 
VALUES 
  ('La Terraza', 'Mediterranea', 'Calle de la Plaza 3', '+34 910123456', 'laterraza@email.com', 'Terraza', 'terrazalogo.png', 4),
  ('El Rincón', 'Asiática', 'Calle del Mar 15', '+34 910789012', 'elrincon@email.com', 'Restaurante', 'rinconlogo.png', 3);

INSERT INTO plato (nombre, precio, tipo, id_restaurante) 
VALUES
  ('Ensalada César', 12.50, 'entrante', 1), 
  ('Arroz a la Cubana', 10.00, 'principal', 2);


SELECT * FROM come_y_paga.usuario;
SELECT * FROM come_y_paga.restaurante;
SELECT * FROM come_y_paga.plato;
