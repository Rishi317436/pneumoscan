const multer = require('multer');
const path = require('path');

// Use memoryStorage for direct GridFS streaming and memory efficiency
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|bmp|tiff|dcm/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('image/') || filetypes.test(file.mimetype);

    if (mimetype || extname) {
        return cb(null, true);
    } else {
        cb(new Error('Images only (jpeg, jpg, png, bmp, tiff)!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

module.exports = upload;