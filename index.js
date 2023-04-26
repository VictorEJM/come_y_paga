// Require the necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
var session = require('express-session');
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
    } catch (error) {
      console.error('MySQL connection failed:', error);
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

// la función comprueba si es númerico
function isNumeric(str) {
  if (typeof str != "string") return false; // we only process strings!  
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)); // ...and ensure strings of whitespace fail
}

// Define routes

// RESTAURANTES
app.get('/restaurants', async (req, res) => {
  try {
    if (req.session.user != undefined || req.session.user != null) {
      const [rows, fields] = await pool.execute('SELECT * FROM restaurante');
      res.render('restaurants', { restaurants: rows, user: req.session.user });
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
    const [rows, fields] = await pool.execute('SELECT * FROM plato WHERE id_restaurante = ?', [id]);
    const [restaurant, fields2] = await pool.execute('SELECT * FROM restaurante WHERE id = ?', [id]);
    //console.log('restaurant: ' + restaurant[0]);
    res.render('plates', { plates: rows, user: req.session.user, restaurant: restaurant[0] });
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
  const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
  console.log('nombre_usuario:', username, 'contrasena_usuario:', hashedPassword);
  
  try {
    const [rows, fields] = await pool.execute(
      'SELECT * FROM usuario WHERE nombre_usuario = ? '
      + 'AND contrasena_usuario = ?', 
      [username, hashedPassword]
    );
    if (rows.length === 0) {
      console.log('Incorrect username or password');
      res.render('login', { error: 'El nombre de usuario o la contraseña son incorrectos' });
    } else {
      console.log('Successful login');
      res.redirect('/restaurants');
      req.session.user = username;
      //req.session.admin = true;
      req.session.save(); // guardar datos de sesión del usuario
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
        //res.status(400).send('Unable to log out');
      } else {
        //res.send('Logout successful');
        res.redirect('/login');
      }
    });
  } else res.end();
  console.log('Logout finished!');
});

app.get('/register', (req, res) => {
  res.render('register', { error: '',
      nombre: '', 
      apellidos: '', 
      year_nacimiento: '', 
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
  const year_nacimiento = new Date(req.body.year_nacimiento).getFullYear();
  const md5Password = crypto.createHash('md5').update(contrasena_usuario).digest('hex');
  const username_str = nombre_usuario.toLowerCase();
  const direccionRegex = /^\s*(?=.{5,100}$).*$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  if (year_nacimiento.length < 3 || year_nacimiento.length > 5) {
    errPhrase += 'La fecha no puede estar vací.\n';
    hasError = true;
  }
  if (!direccion || !direccion.match(direccionRegex)) {
    errPhrase += 'La dirección no puede ser menor de 5 carácteres, ni mayor de 100 carácteres ni puede estar vacía.\n';
    hasError = true;
  }
  if (!isNumeric(telefono.trim()) || telefono.trim().length < 4 || telefono.trim().length > 16) {
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
      year_nacimiento: req.body.year_nacimiento ?? '',
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
    const connection = await pool.getConnection();
    const [rows, fields] = await pool.execute(
      'SELECT * FROM usuario WHERE nombre_usuario = ?', 
      [nombre_usuario]
    );
    if (rows.length === 0) {
      await connection.execute(
      'INSERT INTO usuario (nombre, apellidos, year_nacimiento, direccion, telefono, email, municipio, nombre_usuario, contrasena_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, apellidos, year_nacimiento, direccion, telefono, email, municipio, nombre_usuario, md5Password]
      );
    } else res.render('register', { error: 'Ese usuario ya existe',
      nombre: nombre ?? '', 
      apellidos: apellidos ?? '', 
      year_nacimiento: req.body.year_nacimiento ?? '',
      direccion: direccion ?? '', 
      telefono: telefono ?? '', 
      email: email ?? '', 
      municipio: municipio ?? '', 
      nombre_usuario: nombre_usuario ?? '', 
      contrasena_usuario: contrasena_usuario ?? ''
    });
    connection.release();
    // cuidado con la recta '-' , no es '_'
    res.render('register-success', { title: 'Has sido registrado' });
  } catch (error) {
    console.log(error);
    res.render('register_error', { title: 'Error al registrar el usuario' });
  }
});

// Start the server
app.listen(4000, () => {
  console.log('Server is running on port 4000');
});