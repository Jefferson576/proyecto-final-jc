require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Game = require("./gameModel");
const User = require("./models/User");
const path = require("path");


connectDB();

const app = express();
app.use(cors());
app.use(express.json());
// Si el body JSON llega malformado, responder en JSON en lugar de HTML
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      mensaje: "JSON inválido en la solicitud",
      detalle: err.message,
    });
  }
  next(err);
});

// Modelo de reseñas compartidas
const sharedReviewSchema = new mongoose.Schema({
  key: { type: String, index: true },
  title: String,
  developer: String,
  text: String,
  rating: { type: Number, min: 1, max: 5 },
  userEmail: String,
  createdAt: { type: Date, default: Date.now }
});
const SharedReview = mongoose.models.SharedReview || mongoose.model("SharedReview", sharedReviewSchema);

// MIDDLEWARE Y CONFIGURACIÓN 
const SECRET_KEY = process.env.SECRET_KEY || "changeme-dev-secret";

// Middleware de verificación JWT
function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ mensaje: "Token requerido" });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ mensaje: "Token inválido o expirado" });
  }
}

//RUTAS DE API

// Registro de usuario
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(400).json({ mensaje: "El correo ya está registrado" });
    }

    const nuevoUsuario = new User({ username, email, password });
    await nuevoUsuario.save();

    res.status(201).json({ mensaje: "Usuario registrado exitosamente" });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).json({ mensaje: "Error al registrar usuario" });
  }
});

// Inicio de sesión
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await User.findOne({ email });

    if (!usuario) {
      return res.status(400).json({ mensaje: "Usuario no encontrado" });
    }

    const esValido = await usuario.compararPassword(password);
    if (!esValido) {
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      { id: usuario._id, email: usuario.email, username: usuario.username },
      SECRET_KEY,
      { expiresIn: "11h" } // 11 horas de acceso después de iniciar sesión
    );

    res.json({ mensaje: "Inicio de sesión exitoso", token });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    res.status(500).json({ mensaje: "Error al iniciar sesión" });
  }
});

// Recuperación de contraseña: solicitar enlace
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ mensaje: "Correo requerido" });

    const usuario = await User.findOne({ email });
    // Para privacidad, no revelamos si existe o no; siempre respondemos OK
    if (!usuario) {
      return res.json({ mensaje: "Si el correo existe, se envió un enlace de recuperación" });
    }

    const resetToken = jwt.sign({ id: usuario._id, purpose: "reset" }, SECRET_KEY, { expiresIn: "15m" });
    const resetUrl = `${req.protocol}://${req.get("host")}/html/reset.html?token=${resetToken}`;
    // En un sistema real, aquí se enviaría por correo; devolvemos la URL para pruebas
    return res.json({ mensaje: "Enlace de recuperación generado", url: resetUrl, token: resetToken });
  } catch (error) {
    console.error("Error en forgot-password:", error);
    res.status(500).json({ mensaje: "Error al generar enlace de recuperación" });
  }
});

// Recuperación de contraseña: establecer nueva contraseña
app.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ mensaje: "Token y nueva contraseña requeridos" });
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ mensaje: "La contraseña debe tener al menos 6 caracteres" });
    }

    let payload;
    try {
      payload = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      return res.status(403).json({ mensaje: "Token inválido o expirado" });
    }
    if (!payload || payload.purpose !== "reset" || !payload.id) {
      return res.status(403).json({ mensaje: "Token de recuperación inválido" });
    }

    const usuario = await User.findById(payload.id);
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    usuario.password = password; // se encripta en userSchema.pre 
    await usuario.save();

    return res.json({ mensaje: "Contraseña actualizada. Ahora puedes iniciar sesión." });
  } catch (error) {
    console.error("Error en reset-password:", error);
    res.status(500).json({ mensaje: "Error al restablecer la contraseña" });
  }
});

// RUTAS DE JUEGOS
// Obtener solo los juegos del usuario autenticado
app.get("/games", verificarToken, async (req, res) => {
  try {
    const busqueda = req.query.search;
    const filtro = { user: req.user.id };

    if (busqueda) {
      filtro.$or = [
        { title: new RegExp(busqueda, "i") },
        { category: new RegExp(busqueda, "i") },
      ];
    }

    const games = await Game.find(filtro);
    res.json(games);
  } catch (error) {
    console.error("Error al obtener juegos:", error);
    res.status(500).json({ mensaje: "Error al obtener juegos" });
  }
});

// Catálogo público: obtener juegos sin requerir autenticación
app.get("/catalog", async (req, res) => {
  try {
    const busqueda = req.query.search;
    const filtro = { $or: [ { user: { $exists: false } }, { user: null } ] };
    if (busqueda) {
      filtro.$or = [
        { user: { $exists: false } },
        { user: null },
        { title: new RegExp(busqueda, "i") },
        { category: new RegExp(busqueda, "i") },
      ];
    }
    const games = await Game.find(filtro)
      .sort({ createdAt: -1 })
      .limit(24)
      .select("title description category image rating createdAt");
    res.json(games);
  } catch (error) {
    console.error("Error en catálogo público:", error);
    res.status(500).json({ mensaje: "Error al obtener el catálogo" });
  }
});

// Reseñas compartidas por clave (title+developer en minúsculas)
app.get("/shared-reviews", async (req, res) => {
  try {
    const key = String(req.query.key || "").trim();
    if (!key) return res.json([]);
    const list = await SharedReview.find({ key }).sort({ createdAt: -1 }).limit(50);
    res.json(list);
  } catch (error) {
    console.error("Error en shared-reviews:", error);
    res.status(500).json({ mensaje: "Error al obtener reseñas compartidas" });
  }
});

// Obtener detalles de un juego por ID (del usuario autenticado)
app.get("/games/:id", verificarToken, async (req, res) => {
  try {
    const juego = await Game.findOne({ _id: req.params.id, user: req.user.id });
    if (!juego) {
      return res.status(404).json({ mensaje: "Juego no encontrado o sin permiso" });
    }
    res.json(juego);
  } catch (error) {
    console.error("Error al obtener juego por id:", error);
    // Si el ID no tiene formato válido, devolvemos 400 claro
    if (error.name === "CastError") {
      return res.status(400).json({ mensaje: "ID de juego inválido" });
    }
    res.status(500).json({ mensaje: "Error al obtener el juego" });
  }
});

// Crear un nuevo juego vinculado al usuario
app.post("/games", verificarToken, async (req, res) => {
  try {
    const nuevoJuego = new Game({ ...req.body, user: req.user.id });
    await nuevoJuego.save();
    res.status(201).json(nuevoJuego);
  } catch (error) {
    console.error("Error al agregar el juego:", error);
    res.status(500).json({ mensaje: "Error al agregar el juego" });
  }
});

// Editar juego
app.put("/games/:id", verificarToken, async (req, res) => {
  try {
    const juego = await Game.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true }
    );
    if (!juego)
      return res.status(404).json({ mensaje: "Juego no encontrado o sin permiso" });
    res.json(juego);
  } catch (error) {
    console.error("Error al editar el juego:", error);
    res.status(500).json({ mensaje: "Error al editar el juego" });
  }
});

// Eliminar juego
app.delete("/games/:id", verificarToken, async (req, res) => {
  try {
    const eliminado = await Game.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!eliminado)
      return res.status(404).json({ mensaje: "Juego no encontrado o sin permiso" });
    res.json({ mensaje: "Juego eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar juego:", error);
    res.status(500).json({ mensaje: "Error al eliminar juego" });
  }
});
// Añadir reseña a juego
app.post("/games/:id/reviews", verificarToken, async (req, res) => {
  try {
    const { text, rating } = req.body;
    const t = typeof text === "string" ? text.trim() : "";
    const r = Number(rating);
    if (!t) return res.status(400).json({ mensaje: "Reseña requerida" });
    if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ mensaje: "Rating inválido" });

    const juego = await Game.findOne({ _id: req.params.id, user: req.user.id });
    if (!juego) return res.status(404).json({ mensaje: "Juego no encontrado o sin permiso" });

    juego.reviews.push({ text: t, rating: r });
    const ratings = juego.reviews.map((x) => (typeof x === "string" ? 5 : (Number(x.rating) || 0)));
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    juego.rating = Number(avg.toFixed(1));
    await juego.save();
    const keyBase = `${(juego.title || "").trim().toLowerCase()}|${(juego.developer || "").trim().toLowerCase()}`;
    await SharedReview.create({
      key: keyBase,
      title: juego.title || "",
      developer: juego.developer || "",
      text: t,
      rating: r,
      userEmail: req.user?.email || ""
    });
    res.json(juego);
  } catch (error) {
    console.error("Error al enviar reseña:", error);
    res.status(500).json({ mensaje: "Error al enviar reseña" });
  }
});

// ARCHIVOS ESTÁTICOS
const STATIC_DIR = path.join(__dirname, "../jasht-frontend/public");
console.log("Static dir:", STATIC_DIR);
app.use(express.static(STATIC_DIR));

// Servidor

// Ruta raíz pasa a login
app.get("/", (req, res) => {
  res.redirect("/html/login.html");
});

// Devolvemos 404 JSON para cualquier ruta no definida explícitamente.
app.use((req, res) => {
  console.warn("404:", req.method, req.originalUrl);
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
