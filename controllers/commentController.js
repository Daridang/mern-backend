import Comment from "../models/Comment.js";
import Recipe from "../models/Recipe.js";
import User from "../models/User.js";

// Create a new comment
export const createComment = async (req, res) => {
  try {
    const { recipeId, parentCommentId, text } = req.body;
    const userId = req.userId;

    // Check if recipe exists
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    // Create comment object
    const commentData = {
      text,
      author: userId,
      recipe: recipeId,
    };

    // If it's a reply, add parent comment reference
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      commentData.parentComment = parentCommentId;
    }

    const newComment = new Comment(commentData);
    const savedComment = await newComment.save();

    // Add comment reference to user
    await User.findByIdAndUpdate(userId, {
      $push: { comments: savedComment._id },
    });

    // Increment comment count on recipe
    await Recipe.findByIdAndUpdate(recipeId, {
      $inc: { commentsCount: 1 },
    });

    // Populate author details
    await savedComment.populate("author", "name username avatar");

    res.status(201).json(savedComment);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create comment", error: error.message });
  }
};

// Get comments for a recipe
export const getRecipeComments = async (req, res) => {
  try {
    const { recipeId } = req.params;

    // Get top-level comments (no parent)
    const comments = await Comment.find({
      recipe: recipeId,
      parentComment: { $exists: false },
    })
      .populate("author", "name username avatar")
      .populate({
        path: "replies",
        populate: {
          path: "author",
          select: "name username avatar",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch comments", error: error.message });
  }
};

// Get comments for a recipe by author
export const getUserComments = async (req, res) => {
  try {
    const { userId } = req.params;

    const comments = await Comment.find({
      author: userId,
    })
      .populate("recipe", "title")
      .populate("author", "name username avatar")
      .populate({
        path: "replies",
        populate: {
          path: "author",
          select: "name username avatar",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch comments", error: error.message });
  }
};

// Update a comment
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    // Find comment and check ownership
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You can only update your own comments" });
    }

    // Update the comment
    comment.text = text;
    const updatedComment = await comment.save();

    await updatedComment.populate("author", "name username avatar");

    res.status(200).json(updatedComment);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update comment", error: error.message });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Find comment and check ownership
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.author.toString() !== userId && req.userRole !== "admin") {
      return res
        .status(403)
        .json({ message: "You can only delete your own comments" });
    }

    // Get recipe ID before deleting
    const recipeId = comment.recipe;

    // Delete the comment
    await Comment.findByIdAndDelete(id);

    // Delete all replies to this comment
    const deletedReplies = await Comment.deleteMany({ parentComment: id });

    // Calculate total deleted comments (main comment + replies)
    const totalDeleted = 1 + deletedReplies.deletedCount;

    // Remove comment reference from user
    await User.findByIdAndUpdate(comment.author, {
      $pull: { comments: id },
    });

    // Decrement comment count on recipe
    await Recipe.findByIdAndUpdate(recipeId, {
      $inc: { commentsCount: -totalDeleted },
    });

    // Remove comment from users' likedComments arrays
    await User.updateMany(
      { likedComments: id },
      { $pull: { likedComments: id } }
    );

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete comment", error: error.message });
  }
};

// Like/unlike a comment
export const toggleLikeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log(`🔄 toggleLikeComment: userId=${userId}, commentId=${id}`);

    const comment = await Comment.findById(id);
    if (!comment) {
      console.log(`❌ Комментарий не найден: ${id}`);
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user is trying to like their own comment
    if (comment.author.toString() === userId) {
      console.log(
        `🚫 Пользователь ${userId} попытался лайкнуть свой комментарий ${id}`
      );
      return res
        .status(403)
        .json({ message: "You cannot like your own comment" });
    }

    const isLiked = comment.likes.includes(userId);
    console.log(
      `💡 Статус лайка: ${isLiked ? "уже лайкнут" : "не лайкнут"} пользователем`
    );

    // Modify the comment object directly
    if (isLiked) {
      // Remove the user's like
      comment.likes = comment.likes.filter(like => like.toString() !== userId);
      console.log(`👎 Удаляем лайк пользователя ${userId} с комментария ${id}`);
    } else {
      // Add the user's like
      comment.likes.push(userId);
      console.log(
        `👍 Добавляем лайк пользователя ${userId} к комментарию ${id}`
      );
    }

    // Save the comment to trigger the pre-save middleware
    const updatedComment = await comment.save();

    console.log(
      `✅ Комментарий обновлён. Текущее количество лайков: ${updatedComment.likes.length}, likesCount: ${updatedComment.likesCount}`
    );

    // Update user's likedComments
    let userUpdate;
    if (isLiked) {
      userUpdate = { $pull: { likedComments: id } };
    } else {
      userUpdate = { $addToSet: { likedComments: id } };
    }

    const updatedUser = await User.findByIdAndUpdate(userId, userUpdate);

    if (!updatedUser) {
      console.log(`❌ Пользователь ${userId} не найден для обновления`);
      return res.status(404).json({ message: "User not found for update" });
    }

    console.log(
      `👤 Обновлён пользователь ${userId}: ${
        isLiked ? "удалил лайк" : "поставил лайк"
      } комментарию ${id}
      &&&&&&&&&&&`
    );

    res.status(200).json(updatedComment);
  } catch (error) {
    console.error("🔥 Ошибка при переключении лайка комментария:", error);
    res.status(500).json({
      message: "Failed to toggle like on comment",
      error: error.message,
    });
  }
};