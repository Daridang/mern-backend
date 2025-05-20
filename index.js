// index.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import connectDB from "./config/db.js";
import recipesRoute from "./routes/recipes.js";

await connectDB();
console.log("✅ Connected to MongoDB");

const app = express();

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
