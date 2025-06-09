import Comment from "../models/Comment.js";
import Recipe from "../models/Recipe.js";
import User from "../models/User.js";

// Helper function for recursive population of replies
async function populateCommentsReplies(comments, maxDepth = 5) {
  if (maxDepth <= 0 || !comments || comments.length === 0) {
    return;
  }

  for (let comment of comments) {
    // Populate the replies at the current level
    await comment.populate({
      path: "replies",
      populate: {
        path: "author",
        select: "name username avatar",
      },
    });

    // Recursively populate replies of these replies
    if (comment.replies && comment.replies.length > 0) {
      await populateCommentsReplies(comment.replies, maxDepth - 1);
    }
  }
}

// Function to recursively delete comments and their replies (without permission check)
async function recursivelyDeleteComment(commentId) {
  // Find the comment and populate its direct replies
  const comment = await Comment.findById(commentId).populate("replies");

  if (!comment) {
    // If comment is not found, it might have been deleted by a parent, so gracefully exit
    return;
  }

  // Recursively delete all replies first
  if (comment.replies && comment.replies.length > 0) {
    for (const reply of comment.replies) {
      await recursivelyDeleteComment(reply._id);
    }
  }

  // Get recipe ID and author ID before deleting the comment
  const recipeId = comment.recipe;
  const authorId = comment.author;

  // Delete the comment itself
  await Comment.findByIdAndDelete(commentId);

  // Remove comment reference from user's comments array (only if author exists)
  await User.findByIdAndUpdate(authorId, {
    $pull: { comments: commentId },
  });

  // Decrement comment count on recipe
  await Recipe.findByIdAndUpdate(recipeId, {
    $inc: { commentsCount: -1 },
  });

  // Remove comment from all users' likedComments arrays
  await User.updateMany(
    { likedComments: commentId },
    { $pull: { likedComments: commentId } }
  );
}

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

    // Populate author details (for the newly created comment itself)
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
      .sort({ createdAt: -1 });

    // Recursively populate all replies for fetched comments
    await populateCommentsReplies(comments);

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
      .sort({ createdAt: -1 });

    // Recursively populate all replies for fetched comments
    await populateCommentsReplies(comments);

    res.status(200).json(comments);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch comments", error: error.message });
  }
};

// Get comments liked by the user
export const getUserLikedComments = async (req, res) => {
  try {
    const userId = req.params.userId || req.userId;
    const user = await User.findById(userId).populate({
      path: "likedComments",
      populate: [
        { path: "recipe", select: "title" },
        { path: "author", select: "name username avatar" },
      ],
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Recursively populate all replies for liked comments
    await populateCommentsReplies(user.likedComments);

    res.status(200).json(user.likedComments || []);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch liked comments",
      error: error.message,
    });
  }
};

// Update a comment
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You can only update your own comments" });
    }

    comment.text = text;
    const updatedComment = await comment.save();

    // Populate author details and its replies recursively
    await updatedComment.populate("author", "name username avatar");
    await populateCommentsReplies([updatedComment]); // Populate replies for the updated comment

    res.status(200).json({
      id: updatedComment._id,
      text: updatedComment.text,
      author: {
        id: updatedComment.author._id,
        name: updatedComment.author.name,
        avatar: updatedComment.author.avatar,
      },
      likesCount: updatedComment.likesCount,
      likes: updatedComment.likes,
      createdAt: updatedComment.createdAt,
      updatedAt: updatedComment.updatedAt,
      // Include replies if they were populated for the update
      replies: updatedComment.replies || [],
    });
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
    const userRole = req.userRole;

    // Находим основной комментарий для удаления и выполняем проверку прав
    const initialComment = await Comment.findById(id);

    if (!initialComment) {
      console.log(`Server (deleteComment): Comment ${id} not found.`);
      return res.status(404).json({ message: "Комментарий не найден" });
    }

    // Проверка прав: только автор или администратор может удалить основной комментарий
    if (initialComment.author.toString() !== userId && userRole !== "admin") {
      console.log(
        `Server (deleteComment): Permission denied for comment ${id}. Author: ${initialComment.author}, User: ${userId}`
      );
      return res
        .status(403)
        .json({ message: "Вы можете удалять только свои комментарии" });
    }

    // Если проверка пройдена, запускаем рекурсивное удаление
    await recursivelyDeleteComment(id);

    res
      .status(200)
      .json({ message: "Комментарий и все его ответы успешно удалены" });
  } catch (error) {
    console.error(`Ошибка при удалении комментария:`, error);
    res.status(500).json({
      message: "Не удалось удалить комментарий",
      error: error.message,
    });
  }
};

// Like/unlike a comment
export const toggleLikeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user is trying to like their own comment
    if (comment.author.toString() === userId) {
      return res
        .status(403)
        .json({ message: "You cannot like your own comment" });
    }

    const isLiked = comment.likes.includes(userId);

    // Modify the comment object directly
    if (isLiked) {
      // Remove the user's like
      comment.likes = comment.likes.filter(
        (like) => like.toString() !== userId
      );
    } else {
      // Add the user's like
      comment.likes.push(userId);
    }

    // Save the comment to trigger the pre-save middleware
    const updatedComment = await comment.save();

    // Populate author details to match the format from getRecipeComments
    await updatedComment.populate("author", "name username avatar");
    // Also recursively populate replies for the updated comment
    await populateCommentsReplies([updatedComment]);

    // Update user's likedComments
    let userUpdate;
    if (isLiked) {
      userUpdate = { $pull: { likedComments: id } };
    } else {
      userUpdate = { $addToSet: { likedComments: id } };
    }

    const updatedUser = await User.findByIdAndUpdate(userId, userUpdate);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found for update" });
    }

    res.status(200).json(updatedComment);
  } catch (error) {
    res.status(500).json({
      message: "Failed to toggle like on comment",
      error: error.message,
    });
  }
};
