export default function adminAuth(req, res, next) {
  if (req.userRole !== "admin") {
    return res
      .status(403)
      .json({ message: "Доступ запрещен. Требуется роль администратора." });
  }
  next();
}
