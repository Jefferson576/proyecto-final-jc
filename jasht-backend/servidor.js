/*
  Servidor backend (Express + Mongoose)
  - Autenticación JWT (registro, login, recuperación y restablecimiento de contraseña)
  - Gestión de juegos: catálogo público y biblioteca privada por usuario
  - Reseñas compartidas por clave (title+developer)
  - Servido de archivos estáticos del frontend
*/
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const Game = require("./gameModel");
const User = require("./models/User");
const path = require("path");


connectDB();

// Configuración básica de Express y middlewares
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

// Modelo de reseñas compartidas (fuera de Game, para listar públicas por clave)
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

// Configuración de seguridad y middleware
const SECRET_KEY = process.env.SECRET_KEY || "changeme-dev-secret";

// Middleware de verificación JWT (requiere header Authorization: Bearer <token>)
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

// RUTAS DE API

// Registro de usuario: crea usuario nuevo si el email no existe
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

// Inicio de sesión: valida credenciales y devuelve token JWT
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
      { id: usuario._id, email: usuario.email, username: usuario.username, role: usuario.role || 'user' },
      SECRET_KEY,
      { expiresIn: "11h" } // 11 horas de acceso después de iniciar sesión
    );

    res.json({ mensaje: "Inicio de sesión exitoso", token });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    res.status(500).json({ mensaje: "Error al iniciar sesión" });
  }
});

// Recuperación de contraseña: genera token de restablecimiento y URL temporal
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

// Restablecer contraseña: verifica token y actualiza password del usuario
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
// Obtener la biblioteca del usuario autenticado (con búsqueda opcional)
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

// Catálogo público: listado de juegos públicos, sin autenticación
app.get("/catalog", async (req, res) => {
  try {
    const busqueda = req.query.search;
    const filtro = { public: true };
    if (busqueda) {
      filtro.$or = [
        { title: new RegExp(busqueda, "i") },
        { category: new RegExp(busqueda, "i") },
        { developer: new RegExp(busqueda, "i") },
      ];
    }
    const games = await Game.find(filtro)
      .sort({ createdAt: -1 })
      .limit(48)
      .select("title description category image rating developer size version year createdAt public");
    res.json(games);
  } catch (error) {
    console.error("Error en catálogo público:", error);
    res.status(500).json({ mensaje: "Error al obtener el catálogo" });
  }
});

// Detalle público de catálogo por ID (sin autenticación)
app.get("/catalog/:id", async (req, res) => {
  try {
    const idOrKey = String(req.params.id || "").trim();
    const escapeRx = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let juego = null;

    // Intento 1: por ObjectId si aplica
    if (/^[0-9a-fA-F]{24}$/.test(idOrKey)) {
      juego = await Game.findOne({ _id: idOrKey, public: true })
        .select("title description category image rating developer size version year createdAt public sourceKey");
    }

    // Intento 2: por sourceKey exacto
    if (!juego) {
      juego = await Game.findOne({ public: true, sourceKey: idOrKey })
        .select("title description category image rating developer size version year createdAt public sourceKey");
    }

    // Intento 3: por título (flexible) si viene 'title::developer'
    if (!juego && idOrKey.includes("::")) {
      const [t, d] = idOrKey.split("::");
      const titlePart = String(t || "").trim();
      const devPart = String(d || "").trim();
      const rxTitleExact = new RegExp(`^${escapeRx(titlePart)}$`, "i");
      const rxTitleLoose = new RegExp(escapeRx(titlePart), "i");

      const candidates = await Game.find({ public: true, $or: [
        { sourceKey: idOrKey },
        { title: rxTitleExact },
        { title: rxTitleLoose },
      ] }).limit(5).select("title description category image rating developer size version year createdAt public sourceKey");

      if (candidates && candidates.length) {
        const devLower = devPart.toLowerCase();
        juego = candidates.find(c => String(c.developer || "").toLowerCase().includes(devLower)) || candidates[0];
      }
    }

    if (!juego) return res.status(404).json({ mensaje: "Juego público no encontrado" });
    res.json(juego);
  } catch (error) {
    console.error("Error en catálogo público detalle:", error);
    res.status(500).json({ mensaje: "Error al obtener juego del catálogo" });
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

// Estadísticas para admin: copias privadas y mejores/peores reseñas
app.get("/admin/stats", verificarToken, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ mensaje: "Requiere rol admin" });
    }

    // Copias privadas por juego (sourceKey)
    const copiesAgg = await Game.aggregate([
      { $match: { public: false } },
      { $group: { _id: "$sourceKey", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);
    const copyKeys = copiesAgg.map(r => r._id).filter(Boolean);
    const publicGames = await Game.find({ public: true, sourceKey: { $in: copyKeys } }).select("title developer image sourceKey");
    const pubMap = new Map(publicGames.map(g => [g.sourceKey, g]));
    const topCopies = copiesAgg.map(r => {
      const g = pubMap.get(r._id);
      if (g) {
        return { title: g.title, developer: g.developer, image: g.image, sourceKey: g.sourceKey, count: r.count };
      }
      const parts = String(r._id || "").split("::");
      return { title: parts[0] || r._id, developer: parts[1] || "", sourceKey: r._id, count: r.count };
    });

    // Mejores y peores reseñas promedio por clave
    const reviewsAggBest = await SharedReview.aggregate([
      { $group: { _id: "$key", avgRating: { $avg: "$rating" }, reviewsCount: { $sum: 1 } } },
      { $match: { reviewsCount: { $gte: 1 } } },
      { $sort: { avgRating: -1 } },
      { $limit: 20 }
    ]);
    const reviewsAggWorst = await SharedReview.aggregate([
      { $group: { _id: "$key", avgRating: { $avg: "$rating" }, reviewsCount: { $sum: 1 } } },
      { $match: { reviewsCount: { $gte: 1 } } },
      { $sort: { avgRating: 1 } },
      { $limit: 20 }
    ]);

    const toSourceKey = (key) => {
      const i = String(key).indexOf("|");
      if (i < 0) return String(key);
      const a = String(key).slice(0, i);
      const b = String(key).slice(i + 1);
      return `${a}::${b}`;
    };
    const bestKeys = reviewsAggBest.map(r => toSourceKey(r._id));
    const worstKeys = reviewsAggWorst.map(r => toSourceKey(r._id));
    const reviewGames = await Game.find({ public: true, sourceKey: { $in: [...bestKeys, ...worstKeys] } }).select("title developer image sourceKey");
    const reviewMap = new Map(reviewGames.map(g => [g.sourceKey, g]));
    const bestReviews = reviewsAggBest.map(r => {
      const sk = toSourceKey(r._id);
      const g = reviewMap.get(sk);
      const out = { avgRating: Number(r.avgRating.toFixed(1)), reviewsCount: r.reviewsCount };
      if (g) return { ...out, title: g.title, developer: g.developer, image: g.image };
      const i = String(r._id).indexOf("|");
      return { ...out, title: i>=0 ? String(r._id).slice(0,i) : String(r._id), developer: i>=0 ? String(r._id).slice(i+1) : "" };
    });
    const worstReviews = reviewsAggWorst.map(r => {
      const sk = toSourceKey(r._id);
      const g = reviewMap.get(sk);
      const out = { avgRating: Number(r.avgRating.toFixed(1)), reviewsCount: r.reviewsCount };
      if (g) return { ...out, title: g.title, developer: g.developer, image: g.image };
      const i = String(r._id).indexOf("|");
      return { ...out, title: i>=0 ? String(r._id).slice(0,i) : String(r._id), developer: i>=0 ? String(r._id).slice(i+1) : "" };
    });

    res.json({ topCopies, bestReviews, worstReviews });
  } catch (error) {
    console.error("Error en admin/stats:", error);
    res.status(500).json({ mensaje: "Error al obtener estadísticas de admin" });
  }
});

// Obtener detalles de un juego por ID
// Admin puede ver cualquiera; usuario sólo sus propios juegos
app.get("/games/:id", verificarToken, async (req, res) => {
  try {
    const esAdmin = req.user && req.user.role === 'admin';
    const filtro = esAdmin ? { _id: req.params.id } : { _id: req.params.id, user: req.user.id };
    const juego = await Game.findOne(filtro);
    if (!juego) {
      return res.status(404).json({ mensaje: "Juego no encontrado o sin permiso" });
    }
    res.json(juego);
  } catch (error) {
    console.error("Error al obtener juego por id:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ mensaje: "ID de juego inválido" });
    }
    res.status(500).json({ mensaje: "Error al obtener el juego" });
  }
});

// Crear juego
// - Admin: crea/actualiza juego público (catálogo)
// - Usuario: guarda una copia privada desde el catálogo, evitando duplicados
app.post("/games", verificarToken, async (req, res) => {
  try {
    const esAdmin = req.user && req.user.role === 'admin';
    if (esAdmin) {
      const mk = (s) => String(s || '').toLowerCase();
      const sourceKey = `${mk(req.body.title)}::${mk(req.body.developer)}`;
      const filtro = { title: req.body.title, developer: req.body.developer, public: true };
      const update = { $set: { ...req.body, public: true, user: undefined, sourceKey } };
      const juego = await Game.findOneAndUpdate(filtro, update, { upsert: true, new: true });
      return res.status(201).json(juego);
    } else {
      const mk = (s) => String(s || '').toLowerCase();
      const escapeRx = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const desiredKey = req.body.sourceKey || `${mk(req.body.title)}::${mk(req.body.developer)}`;
      const orFilters = [{ sourceKey: desiredKey }];
      if (req.body.title && req.body.developer) {
        orFilters.push({ title: new RegExp(`^${escapeRx(req.body.title)}$`, 'i'), developer: new RegExp(`^${escapeRx(req.body.developer)}$`, 'i') });
      }
      const origen = await Game.findOne({ public: true, $or: orFilters });
      if (!origen) {
        return res.status(400).json({ mensaje: "Solo puedes guardar juegos del catálogo" });
      }
      const sourceKey = origen.sourceKey || `${mk(origen.title)}::${mk(origen.developer)}`;
      // evitar duplicados en la biblioteca del usuario
      const yaExiste = await Game.findOne({ user: req.user.id, sourceKey });
      if (yaExiste) {
        return res.status(409).json({ mensaje: "Este juego ya está en tu biblioteca" });
      }
      // Clona campos del juego público al nuevo juego privado del usuario
      const nuevoJuego = new Game({
        title: origen.title,
        description: origen.description,
        category: origen.category,
        image: origen.image,
        developer: origen.developer,
        year: origen.year,
        size: origen.size,
        version: origen.version,
        rating: origen.rating,
        progress: 0,
        sourceKey,
        public: false,
        user: req.user.id
      });
      await nuevoJuego.save();
      res.status(201).json(nuevoJuego);
    }
  } catch (error) {
    console.error("Error al agregar el juego:", error);
    res.status(500).json({ mensaje: "Error al agregar el juego" });
  }
});

// Editar juego
// - Admin: edita juego público y propaga cambios a copias privadas
// - Usuario: sólo puede editar sus propios juegos privados
app.put("/games/:id", verificarToken, async (req, res) => {
  try {
    const esAdmin = req.user && req.user.role === 'admin';
    const filtro = esAdmin ? { _id: req.params.id } : { _id: req.params.id, user: req.user.id };
    const original = await Game.findById(req.params.id);
    const juego = await Game.findOneAndUpdate(filtro, req.body, { new: true });
    if (!juego)
      return res.status(404).json({ mensaje: "Juego no encontrado o sin permiso" });
    // Si admin edita un juego público, propagar cambios a copias privadas vinculadas
    if (esAdmin && juego.public) {
      const mk = (s) => String(s || '').toLowerCase();
      const oldKey = original ? `${mk(original.title)}::${mk(original.developer)}` : undefined;
      const newKey = `${mk(juego.title)}::${mk(juego.developer)}`;
      const escapeRx = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const shared = {
        title: juego.title,
        description: juego.description,
        category: juego.category,
        image: juego.image,
        developer: juego.developer,
        year: juego.year,
        size: juego.size,
        version: juego.version,
        rating: juego.rating,
        sourceKey: newKey
      };
      const orFilters = [];
      if (oldKey) orFilters.push({ sourceKey: oldKey });
      orFilters.push({ title: new RegExp(`^${escapeRx(juego.title)}$`, 'i'), developer: new RegExp(`^${escapeRx(juego.developer)}$`, 'i') });
      await Game.updateMany({ public: false, $or: orFilters }, { $set: shared });
    }
    res.json(juego);
  } catch (error) {
    console.error("Error al editar el juego:", error);
    res.status(500).json({ mensaje: "Error al editar el juego" });
  }
});

// Eliminar juego
// - Admin: si elimina un público, también borra copias privadas derivadas
// - Usuario: sólo puede eliminar sus propios juegos
app.delete("/games/:id", verificarToken, async (req, res) => {
  try {
    const esAdmin = req.user && req.user.role === 'admin';
    const filtro = esAdmin ? { _id: req.params.id } : { _id: req.params.id, user: req.user.id };
    const eliminado = await Game.findOneAndDelete(filtro);
    if (!eliminado)
      return res.status(404).json({ mensaje: "Juego no encontrado o sin permiso" });
    if (esAdmin && eliminado.public) {
      const mk = (s) => String(s || '').toLowerCase();
      const key = eliminado.sourceKey || `${mk(eliminado.title)}::${mk(eliminado.developer)}`;
      const escapeRx = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rxTitle = new RegExp(`^${escapeRx(eliminado.title)}$`, 'i');
      const rxDev = new RegExp(`^${escapeRx(eliminado.developer)}$`, 'i');
      await Game.deleteMany({ public: false, $or: [{ sourceKey: key }, { title: rxTitle, developer: rxDev }] });
    }
    res.json({ mensaje: "Juego eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar juego:", error);
    res.status(500).json({ mensaje: "Error al eliminar juego" });
  }
});
// Añadir reseña a juego privado del usuario y compartir resumen público
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

// ARCHIVOS ESTÁTICOS: servir el build del frontend
const STATIC_DIR = path.join(__dirname, "../jasht-frontend/public");
console.log("Static dir:", STATIC_DIR);
app.use(express.static(STATIC_DIR));

// Servidor

// Redirección de raíz a la página de login del frontend
app.get("/", (req, res) => {
  res.redirect("/html/login.html");
});

// 404 JSON para cualquier ruta no definida explícitamente
app.use((req, res) => {
  console.warn("404:", req.method, req.originalUrl);
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
