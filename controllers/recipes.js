// controllers/recipes.js
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";
import Recipe from "../models/Recipe.js";

async function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "spacecafe" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// GET /api/recipes
export const getAll = async (req, res) => {
  try {
    const list = await Recipe.find().sort({ created_at: -1 });
    res.json(list);
  } catch (err) {
    console.error("Error fetching recipes:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/recipes/:id
export const getById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: "Not found" });
    res.json(recipe);
  } catch (err) {
    console.error("Error fetching recipe:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/recipes   (multipart/form-data)
export const createRecipe = async (req, res) => {
  try {
    // 1) загрузка картинки, если есть
    let imageUrl = "";
    if (req.file && req.file.buffer) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }

    const {
      title,
      description,
      category,
      yield: yieldInfo,
      serving_size,
      prep_time,
      temperature,
      ingredients,
      equipment,
      instructions,
      extras,
    } = req.body;

    const recipe = await Recipe.create({
      title,
      description,
      category,
      yield: yieldInfo,
      serving_size,
      prep_time,
      temperature,
      image: imageUrl,
      ingredients: JSON.parse(ingredients),
      equipment: JSON.parse(equipment),
      instructions: JSON.parse(instructions),
      extras: JSON.parse(extras),
    });

    res.status(201).json(recipe);
  } catch (err) {
    console.error("Error creating recipe:", err);
    res.status(500).json({ error: "Server error" });
  }
};
