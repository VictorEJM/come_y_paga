// Require the necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
var session = require('express-session');

// Import the Prisma client and create an instance of the Prisma client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Create an instance of the Express app
const app = express();
// Set HTTPS
const https = require('https');
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};
const server = https.createServer(options, app);


const storageRestaurant = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/restaurant');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Utiliza el nombre original del archivo
  }
});
const storagePlate = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/plate');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Utiliza el nombre original del archivo
  }
});

const uploadImageRestaurant = multer({ storage: storageRestaurant });
const uploadImagePlate = multer({ storage: storagePlate });
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




/*******************------******************/
/*******************************************/
/****************** RUTAS ******************/
/*******************************************/
/*******************------******************/
// PRINCIPAL
app.get('/', (req, res) => {
  res.render('login', { error: null });
});



/*********************************/
/*********** RESTAURANTES ********/
/*********************************/
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



/*******************************/
/************ PLATOS ***********/
/*******************************/
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



/*******************************/
/************ LOGIN ************/
/************ LOGOUT ***********/
/*******************************/
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { id, username, password } = req.body;
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

    // GUARDAR SESIÓN DEL USUARIO
    req.session.user = username;
    req.session.user.id = user.id;
    console.log('user.id:' + user.id);
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



/**********************************/
/************ REGISTRAR ***********/
/**********************************/
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



// Hide scrollbars but keep functionality:
// https://www.w3schools.com/howto/howto_css_hide_scrollbars.asp


/************************************/
/************** PEDIDOS *************/
/************************************/
// PROCESO DEL PEDIDO
let currentPlate; // Variable para almacenar el plato actual
app.get('/plates/:id/process', async (req, res) => {
  const { id } = req.params;
  try {
    currentPlate = await prisma.plato.findUnique({
      where: {
        id: Number(id)
      }
    });
    const user = await prisma.usuario.findUnique({
      where: {
        nombre_usuario: req.session.user
      }
    });
    res.render('process-order', { plate: currentPlate, user });
  } catch (error) {
    console.log(error);
    res.render('error');
  }
});

// PEDIDO A CONFIRMAR
app.post('/plates/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const { direccion, telefono, cantidad } = req.body;

  try {
    // para obtener la ID del usuario conectado
    const user = await prisma.usuario.findUnique({
      where: {
        nombre_usuario: req.session.user
      }
    });
    const userId = user.id;
    console.log("userId: " + userId);

    if (cantidad < 1 || cantidad > 99) {
      console.log('El usuario ha intentado introducir una cantidad inválida (cero, menor que cero o mayor que 99)');
      res.render('error');
      return;
    }
    
    // Guardar el pedido en la base de datos
    await prisma.pedido.create({
      data: {
        id_usuario: parseInt(userId),
        id_restaurante: parseInt(currentPlate.id_restaurante),
        direccion: direccion,
        telefono: telefono,
        precio: (currentPlate.precio * cantidad).toFixed(2),
        estado: 'pendiente',
        cantidad: parseInt(cantidad),
        plato: currentPlate.nombre,
        nombre_repartidor: 'POR CONFIRMAR',
      }
    });

    // Redireccionar a la página de confirmación de pedido
    res.redirect('/confirm-order');
  } catch (error) {
    console.log(error);
    res.render('error');
  }
});

// PÁGINA DE CONFIRMACIÓN DE PEDIDO
app.get('/confirm-order', (req, res) => {
  // Renderizar la página de confirmación de pedido
  res.render('confirm-order', { title: 'PEDIDO CONFIRMADO' });
});

// LISTA DE PEDIDOS
// Manejador para mostrar la lista de pedidos
app.get('/pedidos', async (req, res) => {

  try {
    // para obtener la ID del usuario conectado
    const user = await prisma.usuario.findUnique({
      where: {
        nombre_usuario: req.session.user
      }
    });
    const userId = user.id;
    console.log("userId: " + userId);

    // Obtiene la lista de pedidos del usuario conectado de la base de datos
    const pedidos = await prisma.pedido.findMany({
      where: {
        id_usuario: userId
      },
      include: {
        usuario: true,
        restaurante: true
      },
      orderBy: { id: 'desc' }, // ordenar de más nuevo hasta más antiguo
    });

    // Renderiza la plantilla HTML y pasa los datos de los pedidos como contexto
    res.render('pedidos', { user: req.session.user, pedidos });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener la lista de pedidos');
  }
});



/**************************************/
/************* REPARTIDOR *************/
/**************************************/
app.get('/repartidor', async (req, res) => {
  try {
    const usuarioId = req.session.user.id;
    const pedidos = await prisma.pedido.findMany({
      include: { usuario: true, restaurante: true },
      orderBy: { id: 'desc' } // ordenar de más nuevo hasta más antiguo
    });
    res.render('repartidor', { usuario: req.session.user, pedidos });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener la lista de pedidos');
  }
});

// Manejador para actualizar el estado de un pedido
app.post('/repartidor/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  console.log("id : " + id);
  console.log("estado : " + estado);
  
  try {
    // Actualiza el estado del pedido en la base de datos
    const pedidos = await prisma.pedido.update({
      where: { id: parseInt(id) },
      data: { 
        estado: estado, 
        nombre_repartidor: req.session.user 
      }
    });
    
    // Redirige a la página de nuevo
    res.redirect('/repartidor');
    // res.render('repartidor', { usuario: req.session.user, pedidos, estado });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar el estado del pedido');
  }
});



/*************************************/
/********** ADMINISTRACIÓN ***********/
/*************************************/
app.get('/admin', async (req, res) => {
  try {
    const users = await prisma.usuario.findMany();
    const restaurants = await prisma.restaurante.findMany();
    const plates = await prisma.plato.findMany();
    const orders = await prisma.pedido.findMany();
    res.render('admin', { error: '', users, restaurants, plates, orders });
  } catch (error) {
    console.log(error);
    res.render('error');
  }
});


/***********/
/* USUARIO */
/***********/
// Agregar usuario
app.post('/admin/add-user', async (req, res) => {
  const connection = await pool.getConnection();
  const users = await prisma.usuario.findMany();
  const restaurants = await prisma.restaurante.findMany();
  const plates = await prisma.plato.findMany();
  const orders = await prisma.pedido.findMany();
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
    res.render('admin', { error: errPhrase, users, restaurants, plates, orders,
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

    res.redirect('/admin');
  } catch (error) {
    console.log(error);
    res.render('error');
  }
});

// Editar usuario
app.post('/admin/edit-user', async function(req, res) {
  // Obtener el ID del usuario a editar
  const id = req.body.id;
  try {
    // Obtener los datos del usuario con el ID especificado
    const user = await prisma.usuario.findUnique({
      where: { id: Number(id), },
    });
    
    user.fecha_nacimiento = user.fecha_nacimiento.getFullYear()
      + '-' + ('0' + (user.fecha_nacimiento.getMonth() + 1)).slice(-2)
      + '-' + ('0' + user.fecha_nacimiento.getDate()).slice(-2);
      //value="2000-01-01"

    console.log("user.fecha_nacimiento: " + user.fecha_nacimiento);
    res.render('edit-user', { user, id });
  } catch (error) {
    console.error('EDIT USER ERROR: ', error);
    res.render('error');
  }
});

// Actualizar usuario
app.post('/admin/update-user', async function(req, res) {
  // Obtener los datos del formulario
  const { id, nombre, apellidos, fecha_nacimiento, direccion,
    telefono, email, municipio, 
    nombre_usuario, contrasena_usuario } = req.body;
    const fecha = new Date(fecha_nacimiento).toISOString().slice(0, 19).replace('T', ' ');
    const sha256Password = crypto.createHash('sha256').update(contrasena_usuario).digest('hex');
  
  try {
    // Actualizar los datos del usuario en la tabla de usuario
    const updatedUser = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: {
        nombre: nombre ?? '', 
        apellidos: apellidos ?? '', 
        fecha_nacimiento: new Date(fecha) ?? '', 
        direccion: direccion ?? '', 
        telefono: telefono ?? '', 
        email: email ?? '', 
        municipio: municipio ?? '', 
        nombre_usuario: nombre_usuario ?? '', 
        contrasena_usuario: sha256Password ?? '', 
      },
    }, 
    function(error, results, fields) {
      if (error) throw error;
      res.render('/admin', { error: 'No se pudo actualizar el usuario' });
    });

    res.redirect('/admin');
  } catch (error) {
    // Manejo de errores
    console.error(error);
    res.status(500).send('Error al actualizar el usuario');
  }
});

// Eliminar usuario
app.post('/admin/delete-user', async function(req, res) {
  // Obtener el ID del usuario a eliminar
  const id = req.body.id;

  try {
    // Eliminar el usuario de la tabla de usuario
    await prisma.usuario.delete({
      where: { id: Number(id) }
    });

    res.redirect('/admin');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar el usuario');
  }
});


/***************/
/* RESTAURANTE */
/***************/
// Agregar restaurante
app.post('/admin/add-restaurant', uploadImageRestaurant.single('logo'), async (req, res) => {
  const connection = await pool.getConnection();
  const users = await prisma.usuario.findMany();
  const restaurants = await prisma.restaurante.findMany();
  const plates = await prisma.plato.findMany();
  const orders = await prisma.pedido.findMany();

  const logoPath = req.file ? req.file.filename : ''; // Obtén el nombre del archivo si existe, de lo contrario, asigna una cadena vacía
  // Obtener los datos del formulario
  const { nombre, tipo_comida, direccion, telefono, email, tipologia, logo, estrellas } = req.body;
  const direccionRegex = /^\s*(?=.{5,100}$).*$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  var errPhrase = "";
  var hasError = false;

  if (nombre.trim().length < 3 || nombre.trim().length > 50) {
    errPhrase += 'El nombre no puede ser menor de 3 carácteres ni puede estar vacío.\n';
    hasError = true;
  }
  if (tipo_comida.trim().length < 3 || tipo_comida.trim().length > 50) {
    errPhrase += 'En tipo_comida, no puede ser menor de 3 carácteres ni puede estar vacío.\n';
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
  if (tipologia.trim().length < 2 || tipologia.trim().length > 50) {
    errPhrase += 'La tipologia no puede ser menor de 2 carácteres, ni mayor de 50 carácteres, ni puede estar vacío.\n';
    hasError = true;
  }
  if (logoPath.length < 1) {
    errPhrase += 'El logo no puede estar vacío, pon la imagen.\n';
    hasError = true;
  }
  if (isNaN(parseInt(estrellas)) || parseInt(estrellas) < 1 || parseInt(estrellas) > 5) {
    errPhrase += 'No puede tener menos de 1 estrella, ni más de 5.\n';
    hasError = true;
  }

  if (hasError)
  {
    //document.getElementById("error").innerHTML = "";
    res.render('admin', { error: errPhrase, users, restaurants, plates, orders,
      nombre: nombre ?? '', 
      tipo_comida: tipo_comida ?? '', 
      direccion: direccion ?? '', 
      telefono: telefono ?? '', 
      email: email ?? '', 
      tipologia: tipologia ?? '', 
      logo: logoPath ?? '',
      estrellas: parseInt(estrellas) ?? 1,
    });
    return;
  }

  // Insertar los datos en la tabla de restaurante
  try {
    // check if restaurant already exists
    const existingRestaurant = await prisma.restaurante.findFirst({ where: { nombre } });
    if (existingRestaurant) {
      res.render('admin', { error: 'Ese restaurante ya existe', users, restaurants, plates, orders,
        nombre: nombre ?? '', 
        tipo_comida: tipo_comida ?? '', 
        direccion: direccion ?? '', 
        telefono: telefono ?? '', 
        email: email ?? '', 
        tipologia: tipologia ?? '', 
        logo: logoPath ?? '',
        estrellas: parseInt(estrellas) ?? 1,
      });
      return;
    }

    // create new restaurant
    const newRestaurant = await prisma.restaurante.create({
      data: {
        nombre: nombre,
        tipo_comida: tipo_comida,
        direccion: direccion,
        telefono: telefono,
        email: email,
        tipologia: tipologia,
        logo: logoPath, // Utiliza el nombre del archivo (logo)
        estrellas: parseInt(estrellas),
      },
    });

    res.redirect('/admin');
  } catch (error) {
    console.log(error);
    res.render('error');
  }
});

// Editar restaurante
app.post('/admin/edit-restaurant', async function(req, res) {
  // Obtener el ID del restaurante a editar
  const id = req.body.id;
  try {
    // Obtener los datos del restaurante con el ID especificado
    const restaurant = await prisma.restaurante.findUnique({
      where: { id: Number(id), },
    });
    res.render('edit-restaurant', { restaurant, id });
  } catch (error) {
    console.error('EDIT RESTAURANT ERROR: ', error);
    res.render('error');
  }
});

// Actualizar restaurante
app.post('/admin/update-restaurant', uploadImageRestaurant.single('logo'), async function(req, res) {
  const logoPath = req.file ? req.file.filename : req.body.logo; // Obtén el nombre del archivo si existe, de lo contrario, utiliza el valor anterior de restaurant.logo
  // Obtener los datos del formulario
  const { id, nombre, tipo_comida, direccion, telefono, email, tipologia, estrellas } = req.body;

  try {
    // Actualizar los datos del restaurante en la base de datos
    const updatedRestaurant = await prisma.restaurante.update({
      where: { id: parseInt(id) }, // Asegúrate de convertir el id a un número entero
      data: {
        nombre: nombre ?? '',
        tipo_comida: tipo_comida ?? '',
        direccion: direccion ?? '',
        telefono: telefono ?? '',
        email: email ?? '',
        tipologia: tipologia ?? '',
        logo: logoPath, // Utiliza el nombre del archivo
        estrellas: parseInt(estrellas) // Asegúrate de convertir estrellas a un número entero
      }
    });

    res.redirect('/admin');
  } catch (error) {
    // Manejo de errores
    console.error(error);
    res.status(500).send('Error al actualizar el restaurante');
  }
});

// Eliminar restaurante
app.post('/admin/delete-restaurant', async function(req, res) {
  // Obtener el ID del restaurante a eliminar
  const id = req.body.id;

  try {
    // Obtener el restaurante a eliminar para obtener el nombre del archivo de imagen
    const restaurantToDelete = await prisma.restaurante.findUnique({
      where: { id: Number(id) }
    });

    // Verificar si el restaurante existe y si tiene un archivo de imagen asociado
    if (restaurantToDelete && restaurantToDelete.logo) {
      // Construir la ruta completa del archivo de imagen
      const imagePath = path.join(__dirname, 'public', 'images', 'restaurant', restaurantToDelete.logo);

      // Eliminar el archivo de imagen del sistema de archivos
      fs.unlinkSync(imagePath);
    }

    // Eliminar el restaurante de la tabla de restaurante
    await prisma.restaurante.delete({
      where: { id: Number(id) }
    });

    res.redirect('/admin');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar el restaurante');
  }
});


/*********/
/* PLATO */
/*********/
// Agregar plato
app.post('/admin/add-plate', uploadImagePlate.single('imagen'), async (req, res) => {
  const connection = await pool.getConnection();
  const users = await prisma.usuario.findMany();
  const restaurants = await prisma.restaurante.findMany();
  const plates = await prisma.plato.findMany();
  const orders = await prisma.pedido.findMany();
  // Obtener los datos del formulario
  const imagenPath = req.file ? req.file.filename : ''; // Obtén el nombre del archivo si existe
  const { nombre, precio, imagen, tipo, id_restaurante } = req.body;
  
  var errPhrase = "";
  var hasError = false;

  if (nombre.trim().length < 3 || nombre.trim().length > 50) {
    errPhrase += 'El nombre no puede ser menor de 3 carácteres ni puede estar vacío.\n';
    hasError = true;
  }
  if (!isNumeric(precio.trim()) || precio < 0.01 || precio > 100) {
    errPhrase += 'El precio no puede ser menos de 0.01 ni más de 100 euros.\n';
    hasError = true;
  }
  if (imagenPath.length < 1) {
    errPhrase += 'La imagen no puede estar vacía, pon la imagen.\n';
    hasError = true;
  }
  if (tipo.trim().length < 3 || tipo.trim().length > 50) {
    errPhrase += 'El tipo no puede estar vacío ni tener menos de 3 caráteres ni mayor de 50 carácteres.\n';
    hasError = true;
  }
  if (id_restaurante.trim().length < 1) {
    errPhrase += 'Por favor, selecciona un restaurante.\n';
    hasError = true;
  }

  if (hasError)
  {
    //document.getElementById("error").innerHTML = "";
    res.render('admin', { error: errPhrase, users, restaurants, plates, orders,
      nombre: nombre ?? '', 
      precio: precio ?? '', 
      imagen: imagenPath ?? '', 
      tipo: tipo ?? '', 
      id_restaurante: id_restaurante ?? '',
    });
    return;
  }

  // Insertar los datos en la tabla de plato
  try {
    // check if plate already exists
    const existingPlate = await prisma.plato.findFirst({ where: { nombre } });
    if (existingPlate) {
      res.render('admin', { error: 'Ese plato ya existe', users, restaurants, plates, orders,
        nombre: nombre ?? '', 
        precio: parseFloat(precio) ?? 0.00, 
        imagen: imagenPath ?? '', 
        tipo: tipo ?? '', 
        id_restaurante: Number(id_restaurante) ?? '',
      });
      return;
    }

    // create new plate
    const newPlate = await prisma.plato.create({
      data: {
        nombre: nombre,
        precio: parseFloat(precio) ?? 0.00, 
        imagen: imagenPath, 
        tipo: tipo, 
        id_restaurante: Number(id_restaurante),
      },
    });

    res.redirect('/admin');
  } catch (error) {
    console.log(error);
    res.render('error');
  }
});

// Editar plato
app.post('/admin/edit-plate', async function(req, res) {
  const restaurants = await prisma.restaurante.findMany(); // para mostrar los restaurantes que hay
  // Obtener el ID del plato a editar
  const id = req.body.id;
  try {
    // Obtener los datos del plato con el ID especificado
    const plate = await prisma.plato.findUnique({
      where: { id: Number(id) }
    });

    res.render('edit-plate', { plate, id, restaurants });
  } catch (error) {
    console.error('EDIT PLATE ERROR: ', error);
    res.render('error');
  }
});

// Actualizar plato
app.post('/admin/update-plate', uploadImagePlate.single('imagen'), async function(req, res) {
  // Obtener los datos del formulario
  const imagenPath = req.file ? req.file.filename : req.body.imagen; // Obtén el nombre del archivo si existe
  const { id, nombre, precio, imagen, tipo, id_restaurante } = req.body;

  try {
    // Actualizar los datos del plato en la base de datos
    const updatedPlate = await prisma.plato.update({
      where: { id: parseInt(id) }, // Asegúrate de convertir el id a un número entero
      data: {
        nombre: nombre ?? '',
        precio: parseFloat(precio), // Asegúrate de convertir precio a un número flotante
        imagen: imagenPath, 
        tipo: tipo ?? '', 
        id_restaurante: Number(id_restaurante),
      }
    });

    res.redirect('/admin');
  } catch (error) {
    // Manejo de errores
    console.error(error);
    res.status(500).send('Error al actualizar el plato');
  }
});

// Eliminar plato
app.post('/admin/delete-plate', async function(req, res) {
  // Obtener el ID del plato a eliminar
  const id = req.body.id;

  try {
    // Obtener el plato a eliminar para obtener el nombre del archivo de imagen
    const plateToDelete = await prisma.plato.findUnique({
      where: { id: Number(id) }
    });

    // Verificar si el plato existe y si tiene un archivo de imagen asociado
    if (plateToDelete && plateToDelete.imagen) {
      // Construir la ruta completa del archivo de imagen
      const imagePath = path.join(__dirname, 'public', 'images', 'plate', plateToDelete.imagen);

      // Eliminar el archivo de imagen del sistema de archivos
      fs.unlinkSync(imagePath);
    }

    // Eliminar el plato de la tabla de plato
    await prisma.plato.delete({
      where: { id: Number(id) }
    });

    res.redirect('/admin');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar el plato');
  }
});


/**********/
/* PEDIDO */
/**********/
// Agregar pedido
app.post('/admin/add-order', async (req, res) => {
  const connection = await pool.getConnection();
  const users = await prisma.usuario.findMany();
  const restaurants = await prisma.restaurante.findMany();
  const plates = await prisma.plato.findMany();
  const orders = await prisma.pedido.findMany();
  // Obtener los datos del formulario
  const { id_usuario, id_restaurante, direccion, telefono, precio, estado, cantidad, plato, nombre_repartidor } = req.body;
  const direccionRegex = /^\s*(?=.{5,100}$).*$/;

  var errPhrase = "";
  var hasError = false;

  if (id_usuario.trim().length < 1) {
    errPhrase += 'Por favor, selecciona un usuario.\n';
    hasError = true;
  }
  if (id_restaurante.trim().length < 1) {
    errPhrase += 'Por favor, selecciona un restaurante.\n';
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
  if (!isNumeric(precio.trim()) || precio < 0.01 || precio > 100) {
    errPhrase += 'El precio no puede ser menos de 0.01 ni más de 100 euros.\n';
    hasError = true;
  }
  if (estado.trim().length < 1) {
    errPhrase += 'Por favor, selecciona un estado.\n';
    hasError = true;
  }
  if (!isNumeric(cantidad.trim()) || cantidad < 1 || cantidad > 100) {
    errPhrase += 'La cantidad no puede ser menos de 1 ni más de 100.\n';
    hasError = true;
  }
  if (plato.trim().length < 3 || plato.trim().length > 50) {
    errPhrase += 'El nombre del plato no puede estar vacío ni tener menos de 3 caráteres ni mayor de 50 carácteres.\n';
    hasError = true;
  }
  if (nombre_repartidor.trim().length < 1) {
    errPhrase += 'Por favor, selecciona un repartidor.\n';
    hasError = true;
  }

  if (hasError)
  {
    //document.getElementById("error").innerHTML = "";
    res.render('admin', { error: errPhrase, users, restaurants, plates, orders,
      id_usuario: Number(id_usuario) ?? '',
      id_restaurante: Number(id_restaurante) ?? '',
      direccion: direccion ?? '', 
      telefono: telefono ?? '', 
      precio: parseFloat(precio) ?? 0.00, 
      estado: estado ?? '', 
      cantidad: parseInt(cantidad) ?? 1,
      plato: plato ?? '', 
      nombre_repartidor: nombre_repartidor ?? '', 
    });
    return;
  }

  // Insertar los datos en la tabla de pedido
  try {
    // APENAS SE USA, PERO NO SE VA A USAR
    /*
    // check if order already exists
    const existingOrder = await prisma.pedido.findFirst({ where: { id } });
    if (existingOrder) {
      res.render('admin', { error: 'Ese pedido ya existe', users, restaurants, plates, orders,
        id_usuario: id_usuario ?? '',
        id_restaurante: id_restaurante ?? '',
        direccion: direccion ?? '', 
        telefono: telefono ?? '', 
        precio: precio ?? '', 
        estado: estado ?? '', 
        cantidad: cantidad ?? 1,
        plato: plato ?? '', 
        nombre_repartidor: nombre_repartidor ?? '', 
      });
      return;
    }
    */

    // create new order
    const newPlate = await prisma.pedido.create({
      data: {
        id_usuario: Number(id_usuario),
        id_restaurante: Number(id_restaurante),
        direccion: direccion, 
        telefono: telefono, 
        precio: parseFloat(precio).toString() ?? (0.00).toString(),  
        estado: estado, 
        cantidad: parseInt(cantidad),
        plato: plato, 
        nombre_repartidor: nombre_repartidor, 
      },
    });

    res.redirect('/admin');
  } catch (error) {
    console.log(error);
    res.render('error');
  }
});

// Editar pedido
app.post('/admin/edit-order', async function(req, res) {
  const users = await prisma.usuario.findMany(); // para mostrar los usuarios que hay
  const restaurants = await prisma.restaurante.findMany(); // para mostrar los restaurantes que hay
  const plates = await prisma.plato.findMany();
  // Obtener el ID del pedido a editar
  const id = req.body.id;
  try {
    // Obtener los datos del pedido con el ID especificado
    const order = await prisma.pedido.findUnique({
      where: { id: Number(id), },
    });
    res.render('edit-order', { order, id, users, restaurants, plates });
  } catch (error) {
    console.error('EDIT ORDER ERROR: ', error);
    res.render('error');
  }
});

// Actualizar pedido
app.post('/admin/update-order', async function(req, res) {
  // Obtener los datos del formulario
  const { id, id_usuario, id_restaurante, direccion, telefono, precio, estado, plato, nombre_repartidor } = req.body;

  try {
    // Actualizar los datos del pedido en la base de datos
    const updatedOrder = await prisma.pedido.update({
      where: { id: parseInt(id) }, // Asegúrate de convertir el id a un número entero
      data: {
        id_usuario: parseInt(id_usuario),
        id_restaurante: parseInt(id_restaurante),
        direccion: direccion ?? '', 
        telefono: telefono ?? '', 
        precio: parseFloat(precio).toString() ?? (0.00).toString(), // Asegúrate de convertir precio a un número flotante
        estado: estado ?? '', 
        cantidad: parseInt(cantidad) ?? 1,
        plato: plato ?? '', 
        nombre_repartidor: nombre_repartidor ?? '',
      }
    });

    res.redirect('/admin');
  } catch (error) {
    // Manejo de errores
    console.error(error);
    res.status(500).send('Error al actualizar el pedido');
  }
});

// Eliminar pedido
app.post('/admin/delete-order', async function(req, res) {
  // Obtener el ID del pedido a eliminar
  const id = req.body.id;

  try {
    // Eliminar el pedido de la tabla de pedido
    await prisma.pedido.delete({
      where: { id: Number(id) }
    });

    res.redirect('/admin');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar el pedido');
  }
});

// Start the server
server.listen(4000, () => {
  console.log('Server is running on port 4000');
});