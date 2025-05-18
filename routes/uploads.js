import dotenv from "dotenv";
dotenv.config();
import { v2 as cloudinary } from "cloudinary";
import express from "express";
import path from "path";

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

router.post("/", async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // На всякий случай приводим путь к unix-стилю
    const filePath = req.file.path.split(path.sep).join("/");

    console.log("Uploading to Cloudinary:", filePath);
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "your_folder_name", // необязательно: положить в папку
      use_filename: true, // оставить оригинальное имя
      unique_filename: false, // не генерировать новое имя
    });

    console.log("Cloudinary result:", result);
    // result.secure_url — URL загруженного изображения
    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({ error: error.message || "Upload failed" });
  }
});

export default router;
