# Come Y Paga
Aplicación del Come Y Paga de la práctica final de Interfaces de 2ºDAM

Tratando de hacerlo en Flutter, NodeJS o algún framework que vaya más cómodo. Además con una BBDD con MySQL, SQLite o alguna que vaya mejor.

## Cómo instalar
Necesitas NodeJS y seguir los siguientes comandos en la consola PowerShell:
```ps
npm install express ejs sha256 multer sqlite3 express-session cookie-parser mysql2 prisma @prisma/client
```

### Instalación y configuración de Prisma
Para instalar Prisma en un proyecto de Node.js usando `npm`, puede seguir estos pasos:

1. Instale Prisma CLI globalmente ejecutando el siguiente comando en su terminal:
```ps
npm install prisma -g
```
2. Cree un directorio `prisma` en la raíz de su proyecto ejecutando el siguiente comando:
```ps
npx prisma init
```
Esto creará un archivo `prisma/schema.prisma`, que es donde define el esquema de su base de datos y configura su conexión a la base de datos.

3. Actualice su archivo `package.json` con los siguientes scripts:
```json
{
   "scripts": {
     "prisma": "npx prisma",
     "dev": "npm run prisma db push && node ./index.js",
     "generate": "npm run prisma generate",
     "studio": "npm run studio prisma"
   }
}
```
Estos scripts le permitirán ejecutar comandos de la CLI de Prisma más fácilmente, como crear tablas de bases de datos y ejecutar migraciones.

4. Ejecuta el siguiente comando para generar el esquema en Prisma para así poder establecer con el ORM:
```ps
npx prisma generate
```

## Cómo ejecutar el server
En Powershell, ejecutar algo así desde el directorio donde tengas el repositorio:
```ps
cd C:\msys64\home\alumne-DAM\CIDE_come_y_paga\; npm start
```

Y abrirlo con https://localhost:4000, cuando se ha abierto, hay que aceptar el procedimiento dónde impide que el HTTPS no es seguro, igualmente iremos aunque no esté a salvo (no hay problemas de seguridad externos, siendo un proyecto de pruebas).

La llave para certificado HTTPS se generó con el siguiente comando en Linux:
```sh
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365
```

### Erratas en los mockups:

- mensajes del repartidor, función: incidencias
- no hay proceso de pago, nada de paypal
- no mandar contraseña por email en lo de reestablecer contraseña
