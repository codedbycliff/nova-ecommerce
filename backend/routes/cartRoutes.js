
const express = require("express");
const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// All cart endpoints require login.
router.use(protect);

// GET /api/cart
router.get("/", async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.userId })
      .populate("items.product");

    if (!cart) {
      cart = await Cart.create({
        user: req.userId,
        items: [],
      });
    }

    return res.json({ success: true, cart });
  } catch (error) {
    console.error("Get cart error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load your cart.",
    });
  }
});

// POST /api/cart/items
router.post("/items", async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive whole number.",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    let cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      cart = new Cart({ user: req.userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    const newQuantity = existingItem
      ? existingItem.quantity + quantity
      : quantity;

    if (newQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} units are available.`,
      });
    }

    if (existingItem) {
      existingItem.quantity = newQuantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    await cart.populate("items.product");

    return res.json({
      success: true,
      message: "Product added to cart.",
      cart,
    });
  } catch (error) {
    console.error("Add cart item error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to add this product.",
    });
  }
});

// PATCH /api/cart/items/:productId
router.patch("/items/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1. Use DELETE to remove an item.",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} units are available.`,
      });
    }

    const cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found.",
      });
    }

    const item = cart.items.find(
      (entry) => entry.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Product is not in your cart.",
      });
    }

    item.quantity = quantity;
    await cart.save();
    await cart.populate("items.product");

    return res.json({ success: true, cart });
  } catch (error) {
    console.error("Update cart error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update your cart.",
    });
  }
});

// DELETE /api/cart/items/:productId
router.delete("/items/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found.",
      });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();
    await cart.populate("items.product");

    return res.json({
      success: true,
      message: "Product removed from cart.",
      cart,
    });
  } catch (error) {
    console.error("Remove cart item error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to remove this product.",
    });
  }
});

module.exports = router;
