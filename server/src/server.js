import "dotenv/config";

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import customerRoutes from "./routes/customer.js";
import orderRoutes from "./routes/orders.js";
import Admin from "./models/Admin.js";
import cloudinary from "./config/cloudinary.js"

const file = fileURLToPath(import.meta.url);
const dir = path.dirname(file);

const app = express();

// --------------------------------------------------
// Directories
// Keep the old uploads folder for existing products.
// New product images will be stored in Cloudinary.
// --------------------------------------------------

const legacyUploadsDir = path.resolve(dir, "../uploads");

fs.mkdirSync(legacyUploadsDir, { recursive: true });

// --------------------------------------------------
// Middleware
// --------------------------------------------------

const allowedOrigins = (
  process.env.CLIENT_ORIGIN || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as server-to-server.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "1mb" }));

// Legacy local images remain accessible.
app.use("/uploads", express.static(legacyUploadsDir));

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Mudlay API",
    storage: "Cloudinary",
  });
});

// --------------------------------------------------
// API routes
// Product routes will handle single/multiple uploads.
// --------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/orders", orderRoutes);

// --------------------------------------------------
// Not found handler
// --------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// --------------------------------------------------
// Error handler
// --------------------------------------------------


app.use((error, _req, res, _next) => {
  console.error("API error:", error);

  if (res.headersSent) {
    return;
  }

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message: `Image upload failed: ${error.message}`,
      code: error.code,
      field: error.field || null,
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: "Product validation failed.",
      errors: Object.values(error.errors).map((item) => ({
        field: item.path,
        message: item.message,
      })),
    });
  }

  return res.status(error.status || 500).json({
    message: error.message || "Server error",
  });
});


// --------------------------------------------------
// Start server
// --------------------------------------------------

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required in server/.env");
  }

  // Validate Cloudinary configuration before starting.
  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = process.env;

  if (
    !CLOUDINARY_CLOUD_NAME ||
    !CLOUDINARY_API_KEY ||
    !CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and " +
        "CLOUDINARY_API_SECRET are required in server/.env"
    );
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env"
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL.toLowerCase();

  const existingAdmin = await Admin.findOne({
    email: adminEmail,
  });

  if (!existingAdmin) {
    await Admin.create({
      name: process.env.ADMIN_NAME || "Mudlay Admin",
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD,
    });

    console.log(`Created initial admin ${adminEmail}`);
  }

  const port = Number(process.env.PORT || 5000);

  app.listen(port, () => {
    console.log(`Mudlay API running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start Mudlay API:", error);
  process.exit(1);
});
