// controllers/recipes.js
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";
import Recipe from "../models/Recipe.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
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
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const { category } = req.query;
    const query = category ? { category } : {};

    const [list, count] = await Promise.all([
      Recipe.find(query)
        .populate("author", "name username avatar")
        .sort({ created_at: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec(),
      Recipe.countDocuments(query),
    ]);

    res.json({
      recipes: list,
      totalRecipes: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/recipes/:id
 */
export const getById = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate(
      "author",
      "name username avatar"
    );

    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json(recipe);
  } catch (err) {
    next(err); // Pass error to error handling middleware
  }
};

/**
 * GET /api/recipes/user/:userId
 */
export const getUserRecipes = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const recipes = await Recipe.find({ author: userId })
      .populate("author", "name username avatar")
      .sort({ created_at: -1 });

    res.json(recipes);
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
      author,
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
      image: imageUrl,
      ingredients: parsedFields.ingredients,
      equipment: parsedFields.equipment,
      instructions: parsedFields.instructions,
      extras: parsedFields.extras,
      author: author,
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
    // Check if user is the author of the recipe
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    // Verify ownership
    if (recipe.author.toString() !== req.userId) {
      return res
        .status(403)
        .json({ error: "You can only update your own recipes" });
    }

    // 1) If there's a new file, upload it
    let imageUrl;
    if (req.file?.buffer) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        imageUrl = result.secure_url;
      } catch (uploadError) {
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
      image: imageUrl || recipe.image, // Use existing image if no new one
      ...parseJsonFields(req.body, [
        "ingredients",
        "equipment",
        "instructions",
        "extras",
      ]),
      updated_at: Date.now(),
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
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    // Verify ownership or admin status
    if (recipe.author.toString() !== req.userId && req.userRole !== "admin") {
      return res
        .status(403)
        .json({ error: "You can only delete your own recipes" });
    }

    // Delete the recipe
    await Recipe.findByIdAndDelete(req.params.id);

    // Remove recipe reference from user
    await User.findByIdAndUpdate(recipe.author, {
      $pull: { recipes: recipe._id },
    });

    // Delete all comments associated with this recipe
    await Comment.deleteMany({ recipe: recipe._id });

    // Remove recipe from users' likedRecipes arrays
    await User.updateMany(
      { likedRecipes: recipe._id },
      { $pull: { likedRecipes: recipe._id } }
    );

    res.json({ message: "Recipe deleted" });
  } catch (err) {
    next(err); // Pass error to error handling middleware
  }
};

/**
 * POST /api/recipes/:id/like
 */
export const toggleLikeRecipe = async (req, res, next) => {
  try {
    const recipeId = req.params.id;
    const userId = req.userId;

    const recipe = await Recipe.findById(recipeId);

    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    // Check if user is trying to like their own recipe
    if (recipe.author.toString() === userId) {
      return res.status(403).json({ error: "You cannot like your own recipe" });
    }

    // Check if user already liked the recipe
    const isLiked = recipe.likes.includes(userId);

    let update;
    let userUpdate;

    if (isLiked) {
      // Unlike
      update = { $pull: { likes: userId }, $inc: { likesCount: -1 } };
      userUpdate = { $pull: { likedRecipes: recipeId } };
    } else {
      // Like
      update = { $addToSet: { likes: userId }, $inc: { likesCount: 1 } };
      userUpdate = { $addToSet: { likedRecipes: recipeId } };
    }

    const updatedRecipe = await Recipe.findByIdAndUpdate(recipeId, update, {
      new: true,
    });
    await User.findByIdAndUpdate(userId, userUpdate);

    res.json({
      liked: !isLiked,
      likesCount: updatedRecipe.likesCount || updatedRecipe.likes.length,
    });
  } catch (err) {
    next(err); // Pass error to error handling middleware
  }
};
