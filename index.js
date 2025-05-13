import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();

// Middleware
// Для разработки - разрешить все origin
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://brilliant-parfait-4fe1fb.netlify.app/",
    ],
    credentials: true,
  })
);
app.use(express.json());

// Подключение к MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected!"))
  .catch((err) => console.log("MongoDB error:", err));

// Тестовый роут
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend works!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
