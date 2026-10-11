
import multer from "multer";
import cloudinary from "../config/cloudinary.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, WEBP and AVIF images are allowed.")
      );
    }

    callback(null, true);
  },
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "mudlay/products",
        resource_type: "image",
        transformation: [
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(buffer);
  });
}

const acceptImageFields = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

async function sendImagesToCloudinary(req, res, next) {
  const files = [
    ...(req.files?.image || []),
    ...(req.files?.images || []),
  ];

  if (files.length > 5) {
    return res.status(400).json({
      message: "You can upload a maximum of 5 product images.",
    });
  }

  const uploadedImages = [];

  try {
    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer);

      uploadedImages.push({
        url: result.url,
        publicId: result.publicId,
      });
    }

    req.uploadedImages = uploadedImages;
    req.uploadedImage = uploadedImages[0] || null;

    return next();
  } catch (error) {
    await Promise.allSettled(
      uploadedImages.map((image) =>
        cloudinary.uploader.destroy(image.publicId)
      )
    );

    return next(error);
  }
}

export const uploadProductImages = [
  acceptImageFields,
  sendImagesToCloudinary,
];
