import User from "../models/User.js";
import Recipe from "../models/Recipe.js";
import Comment from "../models/Comment.js";

export const getAllUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, "i"); // 'i' for case-insensitive
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query).select("-password"); // Не возвращаем пароли
    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: "Не удалось получить список пользователей",
      error: error.message,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    const recipes = await Recipe.find({ author: req.params.id }).sort({
      created_at: -1,
    });
    const comments = await Comment.find({ author: req.params.id })
      .populate("recipe", "title")
      .populate("author", "name username avatar")
      .sort({ createdAt: -1 });
    res.json({ user, recipes, comments });
  } catch (error) {
    res.status(500).json({
      message: "Не удалось получить данные пользователя",
      error: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    res.json({ message: "Профиль пользователя обновлен успешно", user });
  } catch (error) {
    res.status(500).json({
      message: "Не удалось обновить профиль пользователя",
      error: error.message,
    });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    res.json({ message: "Статус пользователя обновлен", user });
  } catch (error) {
    res.status(500).json({
      message: "Не удалось обновить статус пользователя",
      error: error.message,
    });
  }
};

export const deleteUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const userToDelete = await User.findById(id);

    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete all recipes created by the user
    await Recipe.deleteMany({ author: id });

    // Delete all comments created by the user
    await Comment.deleteMany({ author: id });

    // Remove user from 'likes' arrays in recipes and comments
    await Promise.all([
      Recipe.updateMany(
        { likes: id },
        { $pull: { likes: id }, $inc: { likesCount: -1 } }
      ),
      Comment.updateMany(
        { likes: id },
        { $pull: { likes: id }, $inc: { likesCount: -1 } }
      ),
    ]);

    // Finally, delete the user
    await User.findByIdAndDelete(id);

    res
      .status(200)
      .json({ message: "User and associated data deleted successfully" });
  } catch (error) {
    console.log(`error:`, error);
    res.status(500).json({ error: "Failed to delete user profile" });
  }
};

export const getAllRecipesAdmin = async (req, res) => {
  try {
    const { search, category, authorId } = req.query;
    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.title = searchRegex;
    }
    if (category) {
      query.category = category;
    }
    if (authorId) {
      query.author = authorId;
    }

    const recipes = await Recipe.find(query)
      .populate("author", "name username avatar")
      .sort({ created_at: -1 });
    res.json(recipes);
  } catch (error) {
    res.status(500).json({
      message: "Не удалось получить список рецептов",
      error: error.message,
    });
  }
};

export const getRecipeByIdAdmin = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate(
      "author",
      "name username avatar"
    );
    if (!recipe) {
      return res.status(404).json({ message: "Рецепт не найден" });
    }
    res.json(recipe);
  } catch (error) {
    res.status(500).json({
      message: "Не удалось получить данные рецепта",
      error: error.message,
    });
  }
};

export const updateRecipeAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    // Assuming req.body contains all fields to update, including image if handled by multer before this.
    // For simplicity, let's assume direct update of text fields for now.
    const updatedRecipe = await Recipe.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedRecipe) {
      return res.status(404).json({ message: "Рецепт не найден" });
    }

    res.json({ message: "Рецепт успешно обновлен", recipe: updatedRecipe });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Не удалось обновить рецепт", error: error.message });
  }
};

export const deleteRecipeAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const recipeToDelete = await Recipe.findById(id);

    if (!recipeToDelete) {
      return res.status(404).json({ message: "Рецепт не найден" });
    }

    // Remove recipe reference from author's recipes list
    await User.findByIdAndUpdate(recipeToDelete.author, {
      $pull: { recipes: id },
    });

    // Delete all comments associated with this recipe
    await Comment.deleteMany({ recipe: id });

    // Remove recipe from all users' likedRecipes arrays
    await User.updateMany(
      { likedRecipes: id },
      { $pull: { likedRecipes: id } }
    );

    await Recipe.findByIdAndDelete(id);

    res
      .status(200)
      .json({ message: "Рецепт и связанные данные успешно удалены" });
  } catch (error) {
    console.log(`error:`, error);
    res.status(500).json({ error: "Не удалось удалить рецепт" });
  }
};

export const getAllCommentsAdmin = async (req, res) => {
  try {
    const { search, authorId, recipeId } = req.query;
    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.text = searchRegex;
    }
    if (authorId) {
      query.author = authorId;
    }
    if (recipeId) {
      query.recipe = recipeId;
    }

    const comments = await Comment.find(query)
      .populate("author", "name username avatar")
      .populate("recipe", "title")
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({
      message: "Не удалось получить список комментариев",
      error: error.message,
    });
  }
};

export const getCommentByIdAdmin = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate("author", "name username avatar")
      .populate("recipe", "title");
    if (!comment) {
      return res.status(404).json({ message: "Комментарий не найден" });
    }
    res.json(comment);
  } catch (error) {
    res.status(500).json({
      message: "Не удалось получить данные комментария",
      error: error.message,
    });
  }
};

export const updateCommentAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      { text },
      { new: true, runValidators: true }
    );

    if (!updatedComment) {
      return res.status(404).json({ message: "Комментарий не найден" });
    }

    res.json({
      message: "Комментарий успешно обновлен",
      comment: updatedComment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Не удалось обновить комментарий",
      error: error.message,
    });
  }
};

export const deleteCommentAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const commentToDelete = await Comment.findById(id);

    if (!commentToDelete) {
      return res.status(404).json({ message: "Комментарий не найден" });
    }

    // Remove comment reference from author's comments list
    await User.findByIdAndUpdate(commentToDelete.author, {
      $pull: { comments: id },
    });

    // Decrement comments count on recipe
    await Recipe.findByIdAndUpdate(commentToDelete.recipe, {
      $inc: { commentsCount: -1 },
    });

    // Remove comment from all users' likedComments arrays
    await User.updateMany(
      { likedComments: id },
      { $pull: { likedComments: id } }
    );

    await Comment.findByIdAndDelete(id);

    res.status(200).json({ message: "Комментарий успешно удален" });
  } catch (error) {
    console.log(`error:`, error);
    res.status(500).json({ error: "Не удалось удалить комментарий" });
  }
};
