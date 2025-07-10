const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Para permitir peticiones desde el frontend

const app = express();
// Configuración del puerto: usa el puerto proporcionado por el entorno de hosting (ej. Render.com)
// o 3000 por defecto para cuando lo corres en local.
const PORT = process.env.PORT || 3000; 

// Middleware para habilitar CORS (Cross-Origin Resource Sharing)
// Esto es necesario para que tu frontend (en SiteGround) pueda comunicarse con tu backend (en Render.com)
// Sin opciones, permite todas las conexiones. Para producción, se puede restringir a tu dominio.
app.use(cors()); 

// Middleware para parsear los cuerpos de las peticiones en formato JSON
app.use(bodyParser.json());

// Sirve archivos estáticos desde la carpeta 'public' (tu frontend)
// Nota: Cuando despliegues el frontend en SiteGround, esta línea en el backend ya no será estrictamente necesaria
// para el acceso público de la web, pero es útil para pruebas locales o si el backend sirviera algo más.
app.use(express.static('public'));

// Base de datos en memoria (¡IMPORTANTE: Esta se reinicia cada vez que reinicias el servidor!)
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

// Ruta para agregar nueva mercancía (requiere datos en el cuerpo de la petición)
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

// Ruta para ELIMINAR mercancía por ID (solo para roles con permiso, usualmente admin)
app.delete('/api/merchandise/:id', (req, res) => {
    const id = parseInt(req.params.id); // Convierte el ID de string a número
    const initialLength = merchandise.length;
    // Filtra la mercancía, excluyendo el elemento con el ID proporcionado
    merchandise = merchandise.filter(item => item.id !== id);

    if (merchandise.length < initialLength) {
        // Si la longitud disminuyó, significa que se eliminó un elemento
        res.status(200).json({ message: `Registro con ID ${id} eliminado correctamente.` });
    } else {
        // Si la longitud no cambió, el ID no fue encontrado
        res.status(404).json({ message: `No se encontró registro con ID ${id}.` });
    }
});

// Ruta para CREAR NUEVO USUARIO (solo para roles con permiso, usualmente admin)
app.post('/api/users', (req, res) => {
    const { username, password, role } = req.body;

    // Validación básica de campos
    if (!username || !password || !role) {
        return res.status(400).json({ message: 'Todos los campos (username, password, role) son obligatorios.' });
    }

    // Comprobar si el nombre de usuario ya existe
    if (users.find(u => u.username === username)) {
        return res.status(409).json({ message: 'El nombre de usuario ya existe. Por favor, elija otro.' });
    }

    // Añadir el nuevo usuario a la lista
    users.push({ username, password, role });
    res.status(201).json({ message: `Usuario '${username}' creado con rol '${role}'.` });
});

// El endpoint para /api/dollar-bcv ha sido ELIMINADO en esta versión.

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en ${process.env.NODE_ENV === 'production' ? 'el puerto del entorno' : `http://localhost:${PORT}`}`);
    console.log(`¡Advertencia! La funcionalidad de la tasa del dólar BCV ha sido eliminada de este backend.`);
    console.log(`¡Recuerda! Los datos de usuarios y mercancía se reinician al reiniciar el servidor.`);
});