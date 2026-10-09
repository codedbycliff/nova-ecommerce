
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Electronics", "Fashion", "Accessories"],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    oldPrice: {
      type: Number,
      default: null,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    tag: {
      type: String,
      default: null,
    },
    image: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: "#f2f1e9",
    },
    description: {
      type: String,
      default: "",
    },
    stock: {
      type: Number,
      default: 10,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
