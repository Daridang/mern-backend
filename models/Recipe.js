import mongoose from "mongoose";

const { Schema, model } = mongoose;

const IngredientGroupSchema = new Schema({
  name: String,
  items: [
    {
      item: String,
      amount: String,
    },
  ],
});

const InstructionGroupSchema = new Schema({
  name: String,
  steps: [String],
});

const RecipeSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  category: String,
  yield: String,
  serving_size: String,
  prep_time: String,
  temperature: String,
  image: String,

  ingredients: {
    groups: [IngredientGroupSchema],
  },
  equipment: [String],
  instructions: { groups: [InstructionGroupSchema] },
  extras: [String],

  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export default model("recipes", RecipeSchema);
