import User from "../models/User.js";

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
