import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import multer from "multer";

import connectDB from "./config/db.js";
import recipesRoute from "./routes/recipes.js";
import uploaderRoute from "./routes/uploads.js";

const app = express();
await connectDB();
console.log("Подключились к Mongo по URI:", process.env.MONGO_URI);

const storage = multer.memoryStorage();
const upload = multer({ storage });

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
app.use(express.urlencoded({ extended: true }));

app.use("/images", express.static("public/images"));

app.use("/api/recipes", recipesRoute);
app.use("/api/upload", upload.single("image"), uploaderRoute);

const PORT = process.env.PORT ?? 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
