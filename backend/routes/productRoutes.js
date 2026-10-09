
const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// GET /api/products
// Optional filters: ?category=Electronics&search=headphones
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category && category !== "All Products") {
      filter.category = category;
    }

    if (search && search.trim()) {
      filter.name = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Fetch products error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to fetch products",
    });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch product",
    });
  }
});

module.exports = router;
