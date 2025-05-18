import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Recipe from "../models/Recipe.js";
import data from "../assets/data/recipes.json" assert { type: "json" };

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for seeding");

    await Recipe.deleteMany({});
    await Recipe.insertMany(data);
    console.log("Database seeded successfully");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await mongoose.disconnect();
  }
};

// run();
