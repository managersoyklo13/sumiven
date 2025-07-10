const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Necesario para permitir comunicación entre tu frontend (en SiteGround) y tu backend (en Render.com)

const app = express();
// Configuración del puerto: usa el puerto proporcionado por el entorno de hosting (ej. Render.com)
// o 3000 por defecto para cuando lo corres en local durante el desarrollo.
const PORT = process.env.PORT || 3000; 

// Middleware para habilitar CORS
// Por ahora, permite todas las conexiones. En un entorno de producción más estricto,
// puedes restringirlo a tu dominio específico de SiteGround.
app.use(cors()); 

// Middleware para parsear los cuerpos de las peticiones en formato JSON
app.use(bodyParser.json());

// Sirve archivos estáticos desde la carpeta 'public' (tu frontend).
// IMPORTANTE: Cuando tu frontend esté en SiteGround, esta línea en el backend
// ya no será la que sirva tu HTML/CSS/JS al usuario final, ya que SiteGround lo hará.
// Sin embargo, es útil para pruebas locales o si el backend sirviera algo más.
app.use(express.static('public'));

// --- Base de Datos en Memoria (¡IMPORTANTE!) ---
// Esta base de datos se reinicia cada vez que el servidor Node.js se reinicia.
// Esto significa que los usuarios y la mercancía que agregues se perderán si el servidor se cae
// o si Render.com lo reinicia por mantenimiento.
// Para una persistencia real, necesitarías conectar una base de datos externa (ej., MongoDB, PostgreSQL).
let users = [
    { username: 'vendedor', password: '123', role: 'vendedor' },
    { username: 'admin', password: '123', role: 'admin' }
];

let merchandise = [];
let nextMerchandiseId = 1;

// --- RUTAS DE TU API ---

// Ruta de Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        res.status(200).json({ message: 'Login exitoso', role: user.role, username: user.username });
    } else {
        res.status(401).json({ message: 'Credenciales inválidas' });
    }
});

// Ruta para agregar nueva mercancía
app.post('/api/merchandise', (req, res) => {
    const newMerchandise = { id: nextMerchandiseId++, ...req.body };
    merchandise.push(newMerchandise);
    console.log('Mercancía agregada:', newMerchandise);
    res.status(201).json({ message: 'Información de mercancía guardada con éxito', data: newMerchandise });
});

// Ruta para obtener toda la mercancía existente
app.get('/api/merchandise', (req, res) => {
    res.status(200).json(merchandise);
});

// Ruta para ELIMINAR mercancía por ID (generalmente accesible solo para admins)
app.delete('/api/merchandise/:id', (req, res) => {
    const id = parseInt(req.params.id); 
    const initialLength = merchandise.length;
    merchandise = merchandise.filter(item => item.id !== id);

    if (merchandise.length < initialLength) {
        res.status(200).json({ message: `Registro con ID ${id} eliminado correctamente.` });
    } else {
        res.status(404).json({ message: `No se encontró registro con ID ${id}.` });
    }
});

// Ruta para CREAR NUEVO USUARIO (generalmente accesible solo para admins)
app.post('/api/users', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ message: 'Todos los campos (username, password, role) son obligatorios.' });
    }

    if (users.find(u => u.username === username)) {
        return res.status(409).json({ message: 'El nombre de usuario ya existe. Por favor, elija otro.' });
    }

    users.push({ username, password, role });
    res.status(201).json({ message: `Usuario '${username}' creado con rol '${role}'.` });
});

// --- FIN DE RUTAS ---

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    console.log(`¡Advertencia! La funcionalidad de la tasa del dólar BCV ha sido eliminada de este backend.`);
    console.log(`¡Recuerda! Los datos de usuarios y mercancía se reinician al reiniciar el servidor.`);
});