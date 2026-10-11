
import { Router } from "express";
import Product from "../models/Product.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { uploadProductImages } from "../middleware/upload.js";

const r = Router();

const list = (value) =>
  Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean)
    : typeof value === "string"
      ? value.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

function parseExistingImages(value) {
  if (Array.isArray(value)) return list(value);

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return list(parsed);
      }
    } catch {
      // Support older clients that send a URL or comma-separated URLs.
    }

    return list(value);
  }

  return [];
}

function data(body, uploaded = []) {
  const submittedImages = parseExistingImages(body.images);

  const gallery = uploaded.length
    ? uploaded.map((item) => item.url)
    : submittedImages;

  const image = String(
    uploaded[0]?.url ||
      body.imageUrl ||
      body.image ||
      gallery[0] ||
      ""
  ).trim();

  return {
    name: String(body.name || "").trim(),
    category: String(body.category || "").trim(),
    price: Number(body.price),
    originalPrice: Number(body.originalPrice || 0),
    description: String(body.description || "").trim(),
    sizes: list(body.sizes),
    colors: list(body.colors),
    stock: Number(body.stock ?? 0),
    badge: String(body.badge || "New").trim(),
    image,
    images: gallery.length ? gallery : image ? [image] : [],
  };
}

function valid(product) {
  return Boolean(
    product.name &&
      product.category &&
      product.description &&
      Number.isFinite(product.price) &&
      product.price >= 0 &&
      Number.isFinite(product.originalPrice) &&
      product.originalPrice >= 0 &&
      Number.isFinite(product.stock) &&
      product.stock >= 0
  );
}

function normalizeProduct(product) {
  const gallery =
    Array.isArray(product.images) && product.images.length
      ? product.images
      : product.image
        ? [product.image]
        : [];

  return {
    ...product,
    images: gallery,
    image: product.image || gallery[0] || "",
  };
}

// GET: List active products
r.get("/", async (req, res, next) => {
  try {
    const filter = { active: true };

    if (req.query.category && req.query.category !== "All") {
      filter.category = req.query.category;
    }

    if (req.query.search) {
      const search = String(req.query.search).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      products: products.map(normalizeProduct),
    });
  } catch (error) {
    next(error);
  }
});

// GET: Single product by ID
r.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      active: true,
    }).lean();

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    res.json({ product: normalizeProduct(product) });
  } catch (error) {
    next(error);
  }
});

// POST: Create product
r.post(
  "/",
  requireAdmin,
  ...uploadProductImages,
  async (req, res, next) => {
    try {
     const uploaded = req.uploadedImages || [];

console.log("BODY DESCRIPTION:", req.body?.description);
console.log("BODY FIELD NAMES:", Object.keys(req.body || {}));
console.log("UPLOADED IMAGE COUNT:", uploaded.length);

const productData = data(req.body, uploaded);

console.log("PRODUCT DESCRIPTION:", productData.description);

      if (!valid(productData)) {
        return res.status(400).json({
          message:
            "Enter a name, category, description, valid price, original price and stock.",
        });
      }

      const product = await Product.create(productData);

      return res.status(201).json({
        product: normalizeProduct(product.toObject()),
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT: Update product

r.put(
  "/:id",
  requireAdmin,
  ...uploadProductImages,
  async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({
          message: "Product not found.",
        });
      }

      // STOCK-ONLY UPDATE: used by the admin's + / - controls.
      // Preserve every other product field.
      const bodyKeys = Object.keys(req.body || {});

      if (
        Object.prototype.hasOwnProperty.call(req.body || {}, "stock") &&
        bodyKeys.length === 1
      ) {
        const stock = Number(req.body.stock);

        if (!Number.isInteger(stock) || stock < 0) {
          return res.status(400).json({
            message: "Stock must be a non-negative whole number.",
          });
        }

        product.stock = stock;
        await product.save();

        return res.json({
          message: "Stock updated successfully.",
          product: normalizeProduct(product.toObject()),
        });
      }

      // NORMAL PRODUCT UPDATE: retain your existing edit functionality.
      const uploaded = req.uploadedImages || [];
      const productData = data(req.body, uploaded);

      if (!valid(productData)) {
        return res.status(400).json({
          message:
            "Enter a name, category, description, valid price, original price and stock.",
        });
      }

      if (uploaded.length) {
        productData.images = uploaded.map((item) => item.url);
        productData.image = uploaded[0].url;
      } else {
        const submittedImage =
          typeof req.body.imageUrl === "string" ||
          typeof req.body.image === "string";

        const submittedGallery = req.body.images !== undefined;

        if (!submittedImage && !submittedGallery) {
          productData.image = product.image || "";
          productData.images =
            product.images?.length
              ? product.images
              : product.image
                ? [product.image]
                : [];
        } else if (submittedGallery) {
          productData.images = parseExistingImages(req.body.images);

          if (productData.images.length) {
            productData.image = productData.images[0];
          } else if (!submittedImage) {
            productData.image = "";
          }
        } else {
          productData.images = productData.image
            ? [productData.image]
            : [];
        }
      }

      Object.assign(product, productData);
      await product.save();

      return res.json({
        product: normalizeProduct(product.toObject()),
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE: Delete product
r.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    return res.json({
      message: "Product deleted.",
    });
  } catch (error) {
    next(error);
  }
});

export default r;
