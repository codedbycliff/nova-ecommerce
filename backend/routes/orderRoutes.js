
const express = require("express");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// POST /api/orders — place an order
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      fullName,
      phone,
      address,
      city,
      state,
      postalCode,
    } = req.body.shippingAddress || {};

    const shippingAddress = {
      fullName: fullName?.trim(),
      phone: phone?.trim(),
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      postalCode: postalCode?.trim(),
    };

    if (Object.values(shippingAddress).some((value) => !value)) {
      return res.status(400).json({
        success: false,
        message: "Please provide all shipping details.",
      });
    }

    const phoneDigits = shippingAddress.phone.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number.",
      });
    }

    if (!/^[a-zA-Z0-9\s-]{3,12}$/.test(shippingAddress.postalCode)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid postal code.",
      });
    }

    let createdOrder;

    await session.withTransaction(async () => {
      const cart = await Cart.findOne({ user: req.userId })
        .session(session);

      if (!cart || cart.items.length === 0) {
        const error = new Error("Your cart is empty.");
        error.statusCode = 400;
        throw error;
      }

      const orderItems = [];
      let totalAmount = 0;

      for (const cartItem of cart.items) {
        const product = await Product.findById(cartItem.product)
          .session(session);

        if (!product) {
          const error = new Error(
            "A product in your cart is no longer available."
          );
          error.statusCode = 400;
          throw error;
        }

        if (
          !Number.isInteger(cartItem.quantity) ||
          cartItem.quantity < 1 ||
          product.stock < cartItem.quantity
        ) {
          const error = new Error(
            `Insufficient stock for ${product.name}. Available: ${product.stock}.`
          );
          error.statusCode = 400;
          throw error;
        }

        // Atomic stock update prevents overselling.
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: product._id,
            stock: { $gte: cartItem.quantity },
          },
          { $inc: { stock: -cartItem.quantity } },
          { new: true, session }
        );

        if (!updatedProduct) {
          const error = new Error(
            `Stock changed for ${product.name}. Please try again.`
          );
          error.statusCode = 409;
          throw error;
        }

        const price = product.price;
        totalAmount += price * cartItem.quantity;

        orderItems.push({
          product: product._id,
          name: product.name,
          image: product.image,
          price,
          quantity: cartItem.quantity,
        });
      }

      const [order] = await Order.create(
        [
          {
            user: req.userId,
            items: orderItems,
            shippingAddress,
            totalAmount,
            paymentMethod: "Cash on Delivery",
            paymentStatus: "Pending",
            status: "Pending",
          },
        ],
        { session }
      );

      cart.items = [];
      await cart.save({ session });

      createdOrder = order;
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order: createdOrder,
    });
  } catch (error) {
    console.error("Place order error:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode
          ? error.message
          : "Unable to place your order right now.",
    });
  } finally {
    await session.endSession();
  }
});

// GET /api/orders — current user's order history
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load your orders.",
    });
  }
});

// GET /api/orders/:id — one order belonging to the current user
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.userId,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.json({ success: true, order });
  } catch (error) {
    console.error("Get order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load this order.",
    });
  }
});

module.exports = router;
