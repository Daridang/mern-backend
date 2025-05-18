import Recipe from "../models/Recipe.js";

export const getAll = async (req, res) => {
  try {
    const recipes = await Recipe.find().sort({ created_at: -1 });
    console.log("getAll: найдено документов", recipes.length);
    res.json(recipes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ msg: "Recipe not found" });
    res.json(recipe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
