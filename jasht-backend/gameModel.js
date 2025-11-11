// gameModel.js
const mongoose = require("mongoose");
const reviewSchema = new mongoose.Schema({
  text: String,
  rating: { type: Number, min: 1, max: 5 }
});

const gameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: String,
  image: String,
  hoursPlayed: { type: Number, default: 0 },
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

  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
const Game = mongoose.model("Game", gameSchema);
module.exports = Game;
