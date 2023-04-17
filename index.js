const express = require("express");
const db = require("./db");
const md5 = require('md5');
const cookieParser = require("cookie-parser");
const session = require("express-session");

const app = express();
app.set("view engine", "ejs");

app.use(express.json()); // parsea el body
app.use(express.urlencoded({ extended: true })); // parsea URL-encoded bodies
app.use(cookieParser());
app.use(
    session({
        secret: "la clave secreta de mi cookie",
        resave: false,
        saveUninitialized: false
    })
);

app.get("/", (req, res, next) => {
	res.send("Hola mundo");
});

//app.get("/", name, name2);

app.get("/libros", (req, res, next) => {
    // Simula una llamada a la BBDD
    const libros = [
        {
            nombre: "libro 1",
            precio: "14€"
        },
        {
            nombre: "libro 2",
            precio: "12€"
        }
    ];
    res.status(200).json(libros);
});

app.get("/libreria", (req, res, next) => {
    // Simula una llamada a la BBDD
    const libros = [
        {
            nombre: "libro 1",
            precio: "14€"
        },
        {
            nombre: "libro 2",
            precio: "12€"
        }
    ];
    //res.render("libreria")
    res.status(200).render("libreria", { libros: libros });
});


function estaLogeado(req, res, next) {
    if (!req.session.hasOwnProperty("usuario")
    || req.session.usuario != undefined // mala práctica?
    || req.session.usuario != null) {
        res.status(403).send("Estás entrando en una página privada. Tienes que pagar.");
        return;
    }
    next();
}

app.get("/users", estaLogeado, (req, res, next) => {
    var sql = "select * from user";
    var params = [ req.params.id ];
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(200).json(rows);
    })
});

app.get("/users/:id", estaLogeado, (req, res, next) => {
    var sql = "select * from user where id = ?";
    var params = [ req.params.id ];
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(200).json(rows);
    })
});

app.get("/login", (req, res, next) => {
    if (req.session.hasOwnProperty("usuario")
    && req.session.usuario != undefined
    && req.session.usuario != null) {
        res.redirect("/users"); // para ir a la página que queremos
        return;
    }
    res.render("login");
});

app.post("/login", (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password; 

    let sql = "select * from user where email = ?";
    let params = [ email ];
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message }); // esto es una mala práctica
            return;
        }

        // es que la consulta no ha "petado". Puede que devuelva 0 usuarios
        if (rows.length < 1) {
            res.status(500).json({ error: "usuario no encontrado" }); // esto es una mala práctica
            return;
        }

        // ha encontrado uno o más usuarios con ese correo
        const usuario = rows[0];
        if (md5(password) == usuario.password) {
            req.session.usuario = { email: email };
            res.json(usuario);
            return;
        }
        res.status(500).json({ error: "contraseña incorrecta" }); // esto es una mala práctica
        return;
    })
});

app.get("/logout", (req, res, next) => {
    console.log("Desconectado");
});

app.listen(4000, () => {
	console.log("Escuchando http://localhost:4000/");
});