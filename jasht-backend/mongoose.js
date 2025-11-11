// mongoose.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb+srv://jeffersonbarrios2008_db_user:10325119489@cluster0.68xphtg.mongodb.net/jogo";
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("Conectado a MongoDB Atlas (base: jogo)");
  } catch (error) {
    console.error("Error conectando a MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
