// Require the necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
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

// Define routes
app.get('/', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    // encrypt the password with the MD5 algorithm
    const hash = crypto.createHash('md5').update(password).digest('hex');

    // perform a MySQL query to retrieve the user data based on the username and encrypted password
    pool.query('SELECT * FROM usuario WHERE nombre_usuario = ? AND contrasena_usuario = ?', [username, hash], (error, results) => {
    if (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }

    if (results.length === 0) {
        // no user found with the provided username and password
        return res.status(401).send('Invalid username or password');
    }

    const user = results[0];
    console.log(`User ${user.id} logged in`);

    // redirect to the home page or dashboard
    res.redirect('/home');
    });
});

app.get('/register', (req, res) => {
  res.render('register');
});

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
        res.render('register_success', { title: 'Registration successful' });
    } catch (error) {
        console.log(error);
        res.render('register_error', { title: 'Error registering user' });
    }
});

// Start the server
app.listen(4000, () => {
  console.log('Server is running on port 4000');
});