// servidor.js
const express = require("express");
const path = require("path");
const connectDB = require("./mongoose");
const Game = require("./gameModel");

const app = express();
const PORT = 3000;

// conectar a MongoDB
connectDB();

// middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, "../jasht-frontend/public")));

// rutas
// Obtener todos los juegos o filtrarlos por nombre o categoría
app.get("/games", async (req, res) => {
  try {
    const busqueda = req.query.search; // <-- ?search=texto
    let games;

    if (busqueda) {
      // Buscar por nombre o categoría (sin importar mayúsculas)
      games = await Game.find({
        $or: [
          { title: new RegExp(busqueda, "i") },
          { category: new RegExp(busqueda, "i") },
        ],
      });
    } else {
      // Si no hay búsqueda, mostrar todos
      games = await Game.find();
    }

    res.json(games);
  } catch (error) {
    console.error("Error al obtener juegos:", error);
    res.status(500).json({ mensaje: "Error al obtener juegos" });
  }
});

//Obtener un solo juego por su ID
app.get("/games/:id", async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ mensaje: "Juego no encontrado" });
    res.json(game);
  } catch (error) {
    console.error("Error al obtener el juego:", error);
    res.status(500).json({ mensaje: "Error al obtener el juego" });
  }
});

app.post("/games", async (req, res) => {
  try {
    const nuevo = new Game(req.body);
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al agregar el juego" });
  }
});

app.put("/games/:id", async (req, res) => {
  try {
    const actualizado = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!actualizado) {
      return res.status(404).json({ mensaje: "Juego no encontrado" });
    }
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar el juego" });
  }
});

app.delete("/games/:id", async (req, res) => {
  try {
    await Game.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Juego eliminado" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar el juego" });
  }
});

app.post("/games/:id/reviews", async (req, res) => {
  try {
    let { text, rating } = req.body;
    text = (text || "").toString().trim();
    rating = Number(rating);
    if (!text) {
      return res.status(400).json({ mensaje: "El texto de la reseña es obligatorio" });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ mensaje: "La valoración debe estar entre 1 y 5" });
    }

    const juego = await Game.findById(req.params.id);
    if (!juego) {
      return res.status(404).json({ mensaje: "Juego no encontrado" });
    }

    juego.reviews.push({ text, rating, date: new Date() });
    // Recalcular promedio
    const totalRatings = juego.reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
    const averageRating = juego.reviews.length ? totalRatings / juego.reviews.length : 0;
    juego.rating = Number(averageRating.toFixed(1));

    await juego.save();
    res.status(201).json(juego);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al agregar reseña" });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../jasht-frontend/public/index.html"));
});

// servidor activo
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
