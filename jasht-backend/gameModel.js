// gameModel.js
const mongoose = require("mongoose");
const gameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: String,
  image: String,
  rating: { type: Number, default: 0 },
  reviews: [
    {
      text: String,
      rating: Number,
      date: { type: Date, default: Date.now }
    }
  ],
  completed: { type: Boolean, default: false },
  developer: { type: String },
  size: { type: String },
  version: { type: String },
  year: { type: Number },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  sourceKey: { type: String, index: true },
  public: { type: Boolean, default: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
const Game = mongoose.model("Game", gameSchema);
module.exports = Game;
