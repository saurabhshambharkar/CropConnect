const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const AppError = require('./appError');

// Configure multer storage - store files in memory for processing
const multerStorage = multer.memoryStorage();

// Filter files to ensure only images are uploaded
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

// Configure multer upload
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload multiple images for products, events, etc.
exports.uploadImages = (type, maxCount) => upload.array(type, maxCount);

// Resize product images - would use sharp in a real implementation
exports.resizeProductImages = type => (req, res, next) => {
  if (!req.files) return next();

  // Generate unique filenames for each image
  req.files = req.files.map(file => {
    const filename = `${type}-${uuidv4()}-${Date.now()}.jpeg`;
    
    // In a real implementation, we would use Sharp to resize and compress images
    // For this example, we'll just add the filename
    return {
      ...file,
      filename
    };
  });

  next();
};

// In a real implementation, we would use cloud storage (S3, Google Cloud, etc.)
// This is a simplified version for the example
exports.getImageUrl = (folder, filename) => {
  return `/uploads/${folder}/${filename}`;
};