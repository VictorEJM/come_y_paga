// Require the necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
var session = require('express-session');
// Import the Prisma client and create an instance of the Prisma client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Create an instance of the Express app
const app = express();

// create a MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'come_y_paga',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// check the MySQL connection when the server starts
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL connected');
    connection.release();
  } catch (e) {
    console.error('*** ERROR: MySQL connection failed:', e);
    process.exit(1);
  }
})();

// check the Prisma connection to MySQL database when the server starts
(async () => {
  try {
    await prisma.$connect();
    console.log('Prisma connection to MySQL database connected');
  } catch (e) {
    console.error('*** ERROR: Prisma connection to MySQL database connection failed:', e);
    process.exit(1);
  }
})();

// Set up the middleware
app.use(express.static('public'));
//app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(session({
  secret: '2C44-4D44-WppQ38S',
  resave: true,
  saveUninitialized: true
}));

// función que comprueba si es númerico
function isNumeric(str) {
  // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this) 
  // and ensure strings of whitespace fail
  if (typeof str != "string") return false; // we only process strings!  
  return !isNaN(str) && !isNaN(parseFloat(str)); 
}

// RUTAS

// RESTAURANTES
app.get('/restaurants', async (req, res) => {
  try {
    if (req.session.user != undefined || req.session.user != null) {
      const restaurants = await prisma.restaurante.findMany();
      res.render('restaurants', { restaurants, user: req.session.user });
    } else res.render('error');
    console.log("req.session.user: " + req.session.user);
  } catch (error) {
    console.log(error);
    res.render('error');
  }
});

// PLATOS DE UN RESTAURANTE
app.get('/plates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const plates = await prisma.plato.findMany({
      where: {
        id_restaurante: Number(id)
      }
    });
    const restaurant = await prisma.restaurante.findUnique({
      where: {
        id: Number(id)
      }
    });
    res.render('plates', { plates: plates, user: req.session.user, restaurant: restaurant });
  } catch (error) {
    console.log(error);
    res.render('error');
  }
});

app.get('/', (req, res) => {
  res.render('login', { error: null });
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// LOGIN
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  console.log('nombre_usuario:', username, 'contrasena_usuario:', hashedPassword);
  
  try {
    const user = await prisma.usuario.findUnique({
      where: {
        nombre_usuario: username
      }
    });

    if (!user) {
      console.log('Incorrect username or password');
      res.render('login', { error: 'El nombre de usuario o la contraseña son incorrectos' });
      return;
    }
    
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    if (user.contrasena_usuario !== hashedPassword) {
      console.log('Incorrect username or password');
      res.render('login', { error: 'El nombre de usuario o la contraseña son incorrectos' });
      return;
    }
    
    console.log('Successful login');
    req.session.user = username;
    req.session.save();

    // Redirigir al usuario según su tipo de usuario
    switch (user.tipo_usuario) {
      case 'administrador': res.redirect('/admin'); break;
      case 'repartidor': res.redirect('/repartidor'); break;
      case 'cliente':
      default: res.redirect('/restaurants'); break;
    }
  } catch (error) {
    console.error('LOGIN ERROR: ', error);
    res.render('error');
  }
});



// LOGOUT
app.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err)
      {
        console.error('LOGOUT ERROR: ', err);
        res.render('error');
        //res.status(400).send('Unable to log out');
      } else {
        //res.send('Logout successful');
        res.render('logout-success', { title: 'Por favor, espere...' });
        //res.redirect('/login');
      }
    });
  } else res.end();
  console.log('Logout finished!');
});

app.get('/register', (req, res) => {
  res.render('register', { error: '',
    nombre: '', 
    apellidos: '', 
    fecha_nacimiento: '', 
    direccion: '', 
    telefono: '', 
    email: '', 
    municipio: '', 
    nombre_usuario: '', 
    contrasena_usuario: ''
  });
});

// REGISTRAR
app.post('/register', async (req, res) => {
  const { nombre, apellidos, direccion, telefono, email, municipio, nombre_usuario, contrasena_usuario } = req.body;
  const fecha_nacimiento = new Date(req.body.fecha_nacimiento).toISOString().slice(0, 19).replace('T', ' ');
  const sha256Password = crypto.createHash('sha256').update(contrasena_usuario).digest('hex');
  const username_str = nombre_usuario.toLowerCase();
  const direccionRegex = /^\s*(?=.{5,100}$).*$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const dateObj = new Date(req.body.fecha_nacimiento);

  var errPhrase = "";
  var hasError = false;

  if (nombre.trim().length < 3 || nombre.trim().length > 50) {
    errPhrase += 'El nombre no puede ser menor de 3 carácteres ni puede estar vacío.\n';
    hasError = true;
  }
  if (apellidos.trim().length < 3 || apellidos.trim().length > 50) {
    errPhrase += 'En los apellidos, no puede ser menor de 3 carácteres ni puede estar vacío.\n';
    hasError = true;
  }
  if (!fecha_nacimiento || isNaN(dateObj.getTime())) {
    errPhrase += 'La fecha no es válida.\n';
    hasError = true;
  }
  if (!direccion || !direccion.match(direccionRegex)) {
    errPhrase += 'La dirección no puede ser menor de 5 carácteres, ni mayor de 100 carácteres ni puede estar vacía.\n';
    hasError = true;
  }
  if (!isNumeric(telefono.trim()) || telefono.trim().length < 9 || telefono.trim().length > 16) {
    errPhrase += 'El teléfono tiene que ser númerico, no puede ser menor de 4, ni mayor de 16 carácteres, ni puede estar vacío.\n';
    hasError = true;
  }
  if (!email || !email.match(emailRegex)) {
    errPhrase += 'El email no coincide o está vacío.\n';
    hasError = true;
  }
  if (municipio.trim().length < 2 || municipio.trim().length > 50) {
    errPhrase += 'El municipio no puede ser menor de 2 carácteres, ni mayor de 50 carácteres, ni puede estar vacío.\n';
    hasError = true;
  }
  if (username_str.length < 3 || username_str.length > 50) {
    errPhrase += 'El nombre de usuario no puede ser menor de 3 carácteres ni puede estar vacío.\n';
    hasError = true;
  }
  if (contrasena_usuario.trim().length < 4 || contrasena_usuario.trim().length > 60) {
    errPhrase += 'La contraseña no puede ser menor de 5 carácteres, ni mayor de 60 carácteres, ni puede estar vacía.\n';
    hasError = true;
  }

  if (hasError)
  {
    //document.getElementById("error").innerHTML = "";
    res.render('register', { error: errPhrase, 
      nombre: nombre ?? '', 
      apellidos: apellidos ?? '', 
      fecha_nacimiento: req.body.fecha_nacimiento ?? '',
      direccion: direccion ?? '', 
      telefono: telefono ?? '', 
      email: email ?? '', 
      municipio: municipio ?? '', 
      nombre_usuario: nombre_usuario ?? '', 
      contrasena_usuario: contrasena_usuario ?? ''
    });
    return;
  }
    try {
      // check if user already exists
      const existingUser = await prisma.usuario.findUnique({ where: { nombre_usuario } });
      if (existingUser) {
        res.render('register', { error: 'Ese usuario ya existe',
          nombre: nombre ?? '', 
          apellidos: apellidos ?? '', 
          fecha_nacimiento: req.body.fecha_nacimiento ?? '',
          direccion: direccion ?? '', 
          telefono: telefono ?? '', 
          email: email ?? '', 
          municipio: municipio ?? '', 
          nombre_usuario: nombre_usuario ?? '', 
          contrasena_usuario: contrasena_usuario ?? ''
        });
        return;
      }
  
      // create new user
      const newUser = await prisma.usuario.create({
        data: {
          nombre: nombre,
          apellidos: apellidos,
          fecha_nacimiento: new Date(fecha_nacimiento),
          direccion: direccion,
          telefono: telefono,
          email: email,
          municipio: municipio,
          nombre_usuario: nombre_usuario,
          contrasena_usuario: sha256Password,
        },
      });
  
      res.render('register-success', { title: 'Has sido registrado' });
    } catch (error) {
      console.log(error);
      res.render('register-error', { title: 'Error al registrar el usuario' });
    }
  });

// ADMINISTRACIÓN
// TODO: PROBAR Y HACER ALGUNOS AJUSTES, SOLO HAY TABLA DE usuario, FALTAN LAS DEMÁS

app.get('/admin', async (req, res) => {
  try {
    const users = await prisma.usuario.findMany();
    res.render('admin', { users });
  } catch (error) {
    console.log(error);
    res.render('error');
  }
});

// Agregar usuario
app.post('/admin/add', async (req, res) => {
  const connection = await pool.getConnection();
  // Obtener los datos del formulario
  const { nombre, apellidos, direccion, telefono, email, municipio, nombre_usuario, contrasena_usuario, tipo_usuario } = req.body;
  const fecha_nacimiento = new Date(req.body.fecha_nacimiento).toISOString().slice(0, 19).replace('T', ' ');
  const sha256Password = crypto.createHash('sha256').update(contrasena_usuario).digest('hex');
  const username_str = nombre_usuario.toLowerCase();
  const direccionRegex = /^\s*(?=.{5,100}$).*$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const dateObj = new Date(req.body.fecha_nacimiento);

  var errPhrase = "";
  var hasError = false;

  if (nombre.trim().length < 3 || nombre.trim().length > 50) {
    errPhrase += 'El nombre no puede ser menor de 3 carácteres ni puede estar vacío.\n';
    hasError = true;
  }
  if (apellidos.trim().length < 3 || apellidos.trim().length > 50) {
    errPhrase += 'En los apellidos, no puede ser menor de 3 carácteres ni puede estar vacío.\n';
    hasError = true;
  }
  if (!fecha_nacimiento || isNaN(dateObj.getTime())) {
    errPhrase += 'La fecha no es válida.\n';
    hasError = true;
  }
  if (!direccion || !direccion.match(direccionRegex)) {
    errPhrase += 'La dirección no puede ser menor de 5 carácteres, ni mayor de 100 carácteres ni puede estar vacía.\n';
    hasError = true;
  }
  if (!isNumeric(telefono.trim()) || telefono.trim().length < 9 || telefono.trim().length > 16) {
    errPhrase += 'El teléfono tiene que ser númerico, no puede ser menor de 4, ni mayor de 16 carácteres, ni puede estar vacío.\n';
    hasError = true;
  }
  if (!email || !email.match(emailRegex)) {
    errPhrase += 'El email no coincide o está vacío.\n';
    hasError = true;
  }
  if (municipio.trim().length < 2 || municipio.trim().length > 50) {
    errPhrase += 'El municipio no puede ser menor de 2 carácteres, ni mayor de 50 carácteres, ni puede estar vacío.\n';
    hasError = true;
  }
  if (username_str.length < 3 || username_str.length > 50) {
    errPhrase += 'El nombre de usuario no puede ser menor de 3 carácteres ni puede estar vacío.\n';
    hasError = true;
  }
  if (contrasena_usuario.trim().length < 4 || contrasena_usuario.trim().length > 60) {
    errPhrase += 'La contraseña no puede ser menor de 5 carácteres, ni mayor de 60 carácteres, ni puede estar vacía.\n';
    hasError = true;
  }
  if (tipo_usuario.length < 3) {
    errPhrase += 'No ha seleccionado ninguno de los 3 tipos de usuario: cliente, administrador, repartidor.\n';
    hasError = true;
  }

  if (hasError)
  {
    //document.getElementById("error").innerHTML = "";
    res.render('admin', { error: errPhrase, 
      nombre: nombre ?? '', 
      apellidos: apellidos ?? '', 
      fecha_nacimiento: req.body.fecha_nacimiento ?? '',
      direccion: direccion ?? '', 
      telefono: telefono ?? '', 
      email: email ?? '', 
      municipio: municipio ?? '', 
      nombre_usuario: nombre_usuario ?? '', 
      contrasena_usuario: contrasena_usuario ?? '',
      tipo_usuario: tipo_usuario ?? 'cliente',
    });
    return;
  }

  // Insertar los datos en la tabla de usuario
  try {
    // check if user already exists
    const existingUser = await prisma.usuario.findUnique({ where: { nombre_usuario } });
    if (existingUser) {
      res.render('admin', { error: 'Ese usuario ya existe',
        nombre: nombre ?? '', 
        apellidos: apellidos ?? '', 
        fecha_nacimiento: req.body.fecha_nacimiento ?? '',
        direccion: direccion ?? '', 
        telefono: telefono ?? '', 
        email: email ?? '', 
        municipio: municipio ?? '', 
        nombre_usuario: nombre_usuario ?? '', 
        contrasena_usuario: contrasena_usuario ?? '',
        tipo_usuario: tipo_usuario ?? 'cliente',
      });
      return;
    }

    // create new user
    const newUser = await prisma.usuario.create({
      data: {
        nombre: nombre,
        apellidos: apellidos,
        fecha_nacimiento: new Date(fecha_nacimiento),
        direccion: direccion,
        telefono: telefono,
        email: email,
        municipio: municipio,
        nombre_usuario: nombre_usuario,
        contrasena_usuario: sha256Password,
        tipo_usuario: tipo_usuario,
      },
    });
  } catch (error) {
    console.log(error);
    res.render('error');
  }
});

// Editar usuario
app.post('/admin/edit', async function(req, res) {
  // Obtener el ID del usuario a editar
  const id = req.body.id;
  try {
    // Obtener los datos del usuario con el ID especificado
    const user = await prisma.usuario.findUnique({
      where: {
        id: Number(id),
      },
    });
    res.render('edit', { user });
  } catch (error) {
    console.error('EDIT USER ERROR: ', error);
    res.render('error');
  }
});

// Actualizar usuario
app.post('/admin/update', async function(req, res) {
  // Obtener los datos del formulario
  const { id, nombre, apellidos, fecha_nacimiento, direccion,
    telefono, email, municipio, 
    nombre_usuario, contrasena_usuario } = req.body;

  // Actualizar los datos del usuario en la tabla de usuario
  const updatedUser = await prisma.usuario.update({
    where: { id: id ?? '' },
    data: {
      nombre: nombre ?? '', 
      apellidos: apellidos ?? '', 
      fecha_nacimiento: fecha_nacimiento ?? '', 
      direccion: direccion ?? '', 
      telefono: telefono ?? '', 
      email: email ?? '', 
      municipio: municipio ?? '', 
      nombre_usuario: nombre_usuario ?? '', 
      contrasena_usuario: contrasena_usuario ?? '', 
    },
  }, 
  function(error, results, fields) {
    if (error) throw error;
    res.redirect('/admin');
  });
});

// Eliminar usuario
app.post('/admin/delete', async function(req, res) {
  // Obtener el ID del usuario a eliminar
  const id = req.body.id;

  try {
    // Eliminar el usuario de la tabla de usuario
    await prisma.usuario.delete({
      where: {
        id: Number(id)
      }
    });

    res.redirect('/admin');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar el usuario');
  }
});

// Start the server
app.listen(4000, () => {
  console.log('Server is running on port 4000');
});