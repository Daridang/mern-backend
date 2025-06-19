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
    res.json(user);
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
