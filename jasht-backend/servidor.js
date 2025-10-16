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
// 📦 Obtener todos los juegos o filtrarlos por nombre o categoría
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

// 📦 Obtener un solo juego por su ID
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
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ mensaje: "Juego no encontrado" });

    const { text, rating } = req.body;
    game.reviews.push({ text, rating });

    // recalcular promedio
    const total = game.reviews.reduce((acc, r) => acc + r.rating, 0);
    game.rating = total / game.reviews.length;

    await game.save();
    res.json(game);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al agregar reseña" });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../jasht-frontend/public/index.html"));
});

// servidor activo
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
