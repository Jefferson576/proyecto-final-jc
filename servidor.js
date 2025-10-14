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
app.use(express.static(path.join(__dirname, "public")));

// rutas
app.get("/games", async (req, res) => {
  try {
    const games = await Game.find();
    res.json(games);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener los juegos" });
  }
});

app.get("/games/:id", async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ mensaje: "Juego no encontrado" });
    res.json(game);
  } catch (error) {
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

// servidor activo
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
