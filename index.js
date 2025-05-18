import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import recipesRoute from "./routes/recipes.js";

const app = express();
await connectDB();
console.log("Подключились к Mongo по URI:", process.env.MONGO_URI);


app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://brilliant-parfait-4fe1fb.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());

// Статика для картинок, если есть папка public/images
app.use("/images", express.static("public/images"));

// API-маршруты
app.use("/api/recipes", recipesRoute);

const PORT = process.env.PORT ?? 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
