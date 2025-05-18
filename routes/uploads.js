import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import express from "express";
import streamifier from "streamifier";
// import path from "path";

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

router.post("/", async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Функция-обёртка, чтоб await работал с upload_stream
    const uploadFromBuffer = (buffer) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "your_folder_name" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        // Передаём буфер в стрим
        streamifier.createReadStream(buffer).pipe(uploadStream);
      });
    };

    // Загрузка
    const result = await uploadFromBuffer(req.file.buffer);
    console.log("Cloudinary result:", result);

    // Отдаём URL обратно клиенту
    return res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
