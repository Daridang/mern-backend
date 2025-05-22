// controllers/recipes.js
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";
import Recipe from "../models/Recipe.js";
import { validationResult } from "express-validator";

/**
 * Helper: Uploads a buffer to Cloudinary and returns the result object
 */
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

/**
 * GET /api/recipes
 */
export const getAll = async (req, res, next) => {
  try {
    const list = await Recipe.find().sort({ created_at: -1 });
    res.json(list);
  } catch (err) {
    next(err); // Pass error to error handling middleware
  }
};

/**
 * GET /api/recipes/:id
 */
export const getById = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json(recipe);
  } catch (err) {
    next(err); // Pass error to error handling middleware
  }
};

// Helper function to parse JSON fields
const parseJsonFields = (body, fields) => {
  const updates = {};
  for (const field of fields) {
    if (body[field] != null) {
      updates[field] = JSON.parse(body[field]);
    }
  }
  return updates;
};

/**
 * POST /api/recipes
 * (multipart/form-data: fields + image file)
 */
export const createRecipe = async (req, res, next) => {
  // Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // 1) Upload the image
    let imageUrl = "";
    if (req.file?.buffer) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        imageUrl = result.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({ error: "Failed to upload image" });
      }
    }

    // 2) Parse the other fields
    const {
      title,
      description,
      category,
      yield: yieldInfo,
      serving_size,
      prep_time,
      temperature,
    } = req.body;

    const parsedFields = parseJsonFields(req.body, [
      "ingredients",
      "equipment",
      "instructions",
      "extras",
    ]);

    // 3) Create the document
    const recipe = await Recipe.create({
      title,
      description,
      category,
      yield: yieldInfo,
      serving_size,
      prep_time,
      temperature,
      image_url: imageUrl,
      ingredients: parsedFields.ingredients,
      equipment: parsedFields.equipment,
      instructions: parsedFields.instructions,
      extras: parsedFields.extras,
    });

    res.status(201).json(recipe);
  } catch (err) {
    next(err); // Pass error to error handling middleware
  }
};

/**
 * PUT /api/recipes/:id
 * (multipart/form-data: can send a new image)
 */
export const updateRecipe = async (req, res, next) => {
  try {
    // 1) If there's a new file, upload it
    let imageUrl;
    if (req.file?.buffer) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        imageUrl = result.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({ error: "Failed to upload image" });
      }
    }

    // 2) Collect the updated fields
    const {
      title,
      description,
      category,
      yield: yieldInfo,
      serving_size,
      prep_time,
      temperature,
    } = req.body;

    const updates = {
      title,
      description,
      category,
      yield: yieldInfo,
      serving_size,
      prep_time,
      temperature,
      image_url: imageUrl,
      ...parseJsonFields(req.body, [
        "ingredients",
        "equipment",
        "instructions",
        "extras",
      ]),
    };

    // Remove undefined fields
    Object.keys(updates).forEach(
      (key) => updates[key] === undefined && delete updates[key]
    );

    // 3) Perform the update
    const updated = await Recipe.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true, // Enable validation during update
    });

    if (!updated) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json(updated);
  } catch (err) {
    next(err); // Pass error to error handling middleware
  }
};

/**
 * DELETE /api/recipes/:id
 */
export const deleteRecipe = async (req, res, next) => {
  try {
    const deleted = await Recipe.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json({ message: "Recipe deleted" });
  } catch (err) {
    next(err); // Pass error to error handling middleware
  }
};
