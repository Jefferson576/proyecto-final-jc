/*
  Conexión a MongoDB con Mongoose
  - Usa `MONGO_URI` desde variables de entorno si existe
  - Evita exponer credenciales en código: preferir `.env`
*/
const mongoose = require("mongoose");

// Establece conexión a la base de datos y sale del proceso si falla
const connectDB = async () => {
  try {
    // Preferir `process.env.MONGO_URI`; el valor por defecto es sólo para desarrollo
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

// Exporta la función de conexión
module.exports = connectDB;
