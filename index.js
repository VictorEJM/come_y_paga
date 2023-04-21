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

// Define routes

// RESTAURANTES
app.get('/restaurants', async (req, res) => {
  try {
    const [rows, fields] = await pool.execute('SELECT * FROM restaurante');
    res.render('restaurants', { restaurants: rows, user: req.session.user });
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
    res.render('plates', { plates: rows });
  } catch (error) {
    console.log(error);
    res.render('error');
  }
});

app.get('/', (req, res) => {
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
      req.session.admin = true;
    }
  } catch (error) {
    console.error('LOGIN ERROR: ', error);
    res.render('error');
  }
});


// TOFIX: CERRAR SESIÓN E IR A LOGIN
// LOGOUT
app.post('/logout', async (req, res) => {
  req.session.destroy();
  res.redirect('/login');
  console.log("Logout success!");
});

app.get('/register', (req, res) => {
  res.render('register');
});

// REGISTRAR
app.post('/register', async (req, res) => {
    const { nombre, apellidos, direccion, telefono, email, municipio, nombre_usuario, contrasena_usuario } = req.body;
    const year_nacimiento = new Date(req.body.year_nacimiento).getFullYear();
    const md5Password = crypto.createHash('md5').update(contrasena_usuario).digest('hex');

    try {
        const connection = await pool.getConnection();
        await connection.execute(
        'INSERT INTO usuario (nombre, apellidos, year_nacimiento, direccion, telefono, email, municipio, nombre_usuario, contrasena_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nombre, apellidos, year_nacimiento, direccion, telefono, email, municipio, nombre_usuario, md5Password]
        );
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