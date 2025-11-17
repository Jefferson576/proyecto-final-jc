/*
  Modelo de Juego (Mongoose)
  - Representa tanto juegos públicos del catálogo como copias privadas en bibliotecas de usuarios
  - Cuando `public` es true: pertenece al catálogo
  - Cuando `public` es false: pertenece a un usuario (`user`)
*/
const mongoose = require("mongoose");
// Definición del esquema y campos del juego
const gameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: String,
  image: String,
  // Promedio de calificaciones basadas en reseñas
  rating: { type: Number, default: 0 },
  reviews: [
    {
      text: String,
      rating: Number,
      date: { type: Date, default: Date.now }
    }
  ],
  // Estado y metadatos
  completed: { type: Boolean, default: false },
  developer: { type: String },
  size: { type: String },
  version: { type: String },
  year: { type: Number },
  // Progreso de juego en la biblioteca del usuario
  progress: { type: Number, min: 0, max: 100, default: 0 },
  // Clave de origen para vincular copias privadas con el juego público
  sourceKey: { type: String, index: true },
  // true: catálogo público; false: biblioteca privada
  public: { type: Boolean, default: false },
  // Referencia al dueño de la copia privada
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
// Exporta el modelo Mongoose
const Game = mongoose.model("Game", gameSchema);
module.exports = Game;
