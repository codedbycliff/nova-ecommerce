
require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("./models/Product");

const products = [
  { name: "Studio Headphones", category: "Electronics", price: 4999, oldPrice: 6499, rating: 4.8, tag: "BESTSELLER", image: "photo-1505740420928-5e560c06d30e", color: "#f2eee8", description: "Immersive sound for everyday listening.", stock: 15 },
  { name: "Everyday Sneakers", category: "Fashion", price: 3299, oldPrice: 4299, rating: 4.7, tag: "SALE", image: "photo-1542291026-7eec264c27ff", color: "#f5e9e7", description: "Comfortable sneakers for daily adventures.", stock: 20 },
  { name: "Minimal Watch", category: "Accessories", price: 5799, rating: 4.9, tag: "NEW", image: "photo-1523275335684-37898b6baf30", color: "#e9ece6", description: "A timeless, understated everyday watch.", stock: 8 },
  { name: "Everyday Backpack", category: "Accessories", price: 2499, oldPrice: 2999, rating: 4.6, image: "photo-1553062407-98eeb64c6a62", color: "#ece9e2", description: "A practical companion for work and travel.", stock: 12 },
  { name: "Premium Camera", category: "Electronics", price: 18999, rating: 4.9, tag: "POPULAR", image: "photo-1516035069371-29a1b244cc32", color: "#e9eaf0", description: "Capture your favourite moments in detail.", stock: 5 },
  { name: "Classic Sunglasses", category: "Accessories", price: 1799, oldPrice: 2299, rating: 4.5, tag: "SALE", image: "photo-1511499767150-a48a237f0083", color: "#f1e9df", description: "Classic frames for sunny days.", stock: 25 },
  { name: "Wireless Speaker", category: "Electronics", price: 3999, rating: 4.7, image: "photo-1608043152269-423dbba4e7e1", color: "#e6eceb", description: "Bring your favourite music into any room.", stock: 10 },
  { name: "Urban Sneakers", category: "Fashion", price: 2899, oldPrice: 3499, rating: 4.6, image: "photo-1525966222134-fcfa99b8ae77", color: "#eee8e4", description: "Versatile sneakers with a clean silhouette.", stock: 18 },
];

async function seedProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    for (const product of products) {
      await Product.updateOne(
        { name: product.name },
        { $setOnInsert: product },
        { upsert: true }
      );
    }

    console.log("✅ Sample products are ready in MongoDB.");
    console.log(`📦 Products processed: ${products.length}`);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedProducts();
