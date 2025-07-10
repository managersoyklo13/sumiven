const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ** AÑADIDA: CABECERA CONTENT-SECURITY-POLICY PERMISIVA PARA PRUEBAS **
// Esto le dice al navegador que permita todo, para ver si anula la política externa.
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://fonts.gstatic.com;");
    next();
});

// Sirve los archivos estáticos desde la carpeta 'public' (HTML, CSS, JS del frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar la base de datos SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        
        // Crear/Modificar tabla 'merchandise'
        // AÑADIDA COLUMNA 'registered_by'
        db.run(`CREATE TABLE IF NOT EXISTS merchandise (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa TEXT NOT NULL,
            mercancia TEXT NOT NULL,
            cantidad INTEGER NOT NULL,
            condicion TEXT NOT NULL,
            tipo_pago TEXT NOT NULL DEFAULT 'BS',
            nota TEXT,
            registered_by TEXT -- NUEVA COLUMNA
        )`, (err) => {
            if (err) {
                console.error('Error al crear/modificar la tabla de mercancía:', err.message);
            } else {
                console.log('Tabla "merchandise" verificada/creada.');
                
                // Verificar si las columnas tipo_pago y registered_by existen, y añadirlas si no
                db.all("PRAGMA table_info(merchandise)", (err, columns) => {
                    if (err) {
                        console.error('Error al obtener info de tabla:', err.message);
                        return;
                    }
                    
                    const hasTipoPago = columns.some(col => col.name === 'tipo_pago');
                    if (!hasTipoPago) {
                        db.run("ALTER TABLE merchandise ADD COLUMN tipo_pago TEXT NOT NULL DEFAULT 'BS'", (err) => {
                            if (err) console.error('Error al añadir columna tipo_pago:', err.message);
                            else console.log('Columna tipo_pago añadida a la tabla merchandise.');
                        });
                    }

                    const hasRegisteredBy = columns.some(col => col.name === 'registered_by');
                    if (!hasRegisteredBy) {
                        // Usamos un valor por defecto vacío para las entradas existentes.
                        // Podrías poner 'Desconocido' o similar si prefieres.
                        db.run("ALTER TABLE merchandise ADD COLUMN registered_by TEXT DEFAULT ''", (err) => {
                            if (err) console.error('Error al añadir columna registered_by:', err.message);
                            else console.log('Columna registered_by añadida a la tabla merchandise.');
                        });
                    }
                });
            }
        });

        // Crear tabla de usuarios si no existe (para el login)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Error al crear la tabla de usuarios:', err.message);
            } else {
                console.log('Tabla "users" verificada/creada.');
                // Insertar usuarios por defecto si no existen
                db.get("SELECT COUNT(*) AS count FROM users WHERE username = 'admin'", (err, row) => {
                    if (err) {
                        console.error('Error al verificar admin:', err.message);
                        return;
                    }
                    if (row.count === 0) {
                        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', 'admin123', 'admin'], (err) => {
                            if (err) console.error('Error al insertar admin:', err.message);
                            else console.log('Usuario admin insertado.');
                        });
                    }
                });

                db.get("SELECT COUNT(*) AS count FROM users WHERE username = 'vendedor'", (err, row) => {
                    if (err) {
                        console.error('Error al verificar vendedor:', err.message);
                        return;
                    }
                    if (row.count === 0) {
                        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['vendedor', 'venta123', 'vendedor'], (err) => {
                            if (err) console.error('Error al insertar vendedor:', err.message);
                            else console.log('Usuario vendedor insertado.');
                        });
                    }
                });
            }
        });
    }
});

// --- RUTAS DE LA API ---

// Ruta para el login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (err) {
            console.error('Error al consultar usuario en DB:', err.message);
            return res.status(500).json({ message: 'Error interno del servidor.' });
        }
        if (user) {
            res.json({ message: 'Login exitoso', role: user.role, username: user.username });
        } else {
            res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }
    });
});

// Ruta para guardar nueva mercancía (para vendedor)
app.post('/api/merchandise', (req, res) => {
    // AHORA SE ESPERA 'registered_by'
    const { empresa, mercancia, cantidad, condicion, tipo_pago, nota, registered_by } = req.body;

    console.log('Datos recibidos en el servidor (req.body):', req.body);

    if (!empresa || !mercancia || !cantidad || !condicion || !tipo_pago || !registered_by) { // registered_by es ahora obligatorio
        console.error('SERVER: Campos obligatorios faltantes o inválidos.', req.body);
        return res.status(400).json({ message: 'Todos los campos obligatorios (Empresa, Mercancía, Cantidad, Condición, Tipo de Pago, Registrado por) deben ser completados.' });
    }
    if (isNaN(cantidad)) {
        console.error('SERVER: Cantidad no es un número válido.', req.body);
        return res.status(400).json({ message: 'La cantidad debe ser un número válido.' });
    }

    // AÑADIR registered_by a la inserción
    db.run(`INSERT INTO merchandise (empresa, mercancia, cantidad, condicion, tipo_pago, nota, registered_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [empresa, mercancia, cantidad, condicion, tipo_pago, nota, registered_by],
        function(err) {
            if (err) {
                console.error('Error al insertar mercancía en DB:', err.message);
                return res.status(500).json({ message: 'Error al guardar la información en la base de datos.' });
            }
            res.status(201).json({ message: 'Información guardada exitosamente.', id: this.lastID });
        }
    );
});

// Ruta para obtener toda la mercancía (para administrador)
app.get('/api/merchandise', (req, res) => {
    // SELECCIONA TAMBIÉN 'registered_by'
    db.all("SELECT id, empresa, mercancia, cantidad, condicion, tipo_pago, nota, registered_by FROM merchandise", [], (err, rows) => {
        if (err) {
            console.error('Error al obtener mercancía de DB:', err.message);
            return res.status(500).json({ message: 'Error al obtener los datos de la base de datos.' });
        }
        res.json(rows);
    });
});

// Ruta: Eliminar mercancía por ID (para administrador)
app.delete('/api/merchandise/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM merchandise WHERE id = ?", id, function(err) {
        if (err) {
            console.error('Error al eliminar mercancía de DB:', err.message);
            return res.status(500).json({ message: 'Error al eliminar el registro.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Registro no encontrado.' });
        }
        res.json({ message: 'Registro eliminado exitosamente.', changes: this.changes });
    });
});

// Ruta: Modificar mercancía por ID (para administrador)
app.put('/api/merchandise/:id', (req, res) => {
    const { id } = req.params;
    // registered_by no se modifica en esta ruta ya que es un registro de auditoría
    const { empresa, mercancia, cantidad, condicion, tipo_pago, nota } = req.body;

    if (!empresa || !mercancia || !cantidad || !condicion || !tipo_pago) {
        return res.status(400).json({ message: 'Todos los campos obligatorios deben ser completados para la actualización.' });
    }
    if (isNaN(cantidad)) {
        return res.status(400).json({ message: 'La cantidad debe ser un número válido.' });
    }

    db.run(`UPDATE merchandise SET empresa = ?, mercancia = ?, cantidad = ?, condicion = ?, tipo_pago = ?, nota = ? WHERE id = ?`,
        [empresa, mercancia, cantidad, condicion, tipo_pago, nota, id],
        function(err) {
            if (err) {
                console.error('Error al actualizar mercancía en DB:', err.message);
                return res.status(500).json({ message: 'Error al actualizar la información.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Registro no encontrado o sin cambios.' });
            }
            res.json({ message: 'Registro actualizado exitosamente.', changes: this.changes });
        }
    );
});

// Ruta: Crear un nuevo usuario (para administrador)
app.post('/api/users', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ message: 'Nombre de usuario, contraseña y rol son obligatorios.' });
    }

    if (role !== 'vendedor' && role !== 'admin') {
        return res.status(400).json({ message: 'El rol debe ser "vendedor" o "admin".' });
    }

    db.get("SELECT COUNT(*) AS count FROM users WHERE username = ?", [username], (err, row) => {
        if (err) {
            console.error('Error al verificar usuario existente:', err.message);
            return res.status(500).json({ message: 'Error interno del servidor al verificar usuario.' });
        }
        if (row.count > 0) {
            return res.status(409).json({ message: 'El nombre de usuario ya existe. Por favor, elige otro.' });
        }

        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
            [username, password, role],
            function(err) {
                if (err) {
                    console.error('Error al insertar nuevo usuario en DB:', err.message);
                    return res.status(500).json({ message: 'Error al crear el usuario en la base de datos.' });
                }
                res.status(201).json({ message: 'Usuario creado exitosamente.', id: this.lastID });
            }
        );
    });
});


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});