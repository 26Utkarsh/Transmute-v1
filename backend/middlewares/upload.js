const multer = require('multer');

// Use memory storage to process files without saving them to disk.
// This is faster and safer for cloud deployments (Render, Railway).
const storage = multer.memoryStorage();

// File filter to only allow certain types
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: fileFilter
});

module.exports = upload;
