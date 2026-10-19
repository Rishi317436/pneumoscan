const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { getGridFSBucket } = require('../config/gridfs');

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. If valid ObjectId, stream from MongoDB Atlas GridFS
        if (mongoose.Types.ObjectId.isValid(id)) {
            const bucket = getGridFSBucket();
            const fileId = new mongoose.Types.ObjectId(id);
            const files = await bucket.find({ _id: fileId }).toArray();

            if (files && files.length > 0) {
                const file = files[0];
                res.setHeader('Content-Type', file.contentType || 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                return bucket.openDownloadStream(fileId).pipe(res);
            }
        }

        // 2. Fallback check for disk files by filename
        const candidates = [
            path.join(__dirname, '..', 'uploads', id),
            path.join(__dirname, '..', 'gradcam', id),
            path.join(__dirname, '..', '..', 'dip_engine', 'results', id),
            path.join(__dirname, '..', 'dip_engine', 'results', id)
        ];

        for (const p of candidates) {
            if (fs.existsSync(p)) {
                res.setHeader('Cache-Control', 'public, max-age=86400');
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                return res.sendFile(path.resolve(p));
            }
        }

        res.status(404).json({ success: false, message: 'Radiograph image not found.' });
    } catch (error) {
        console.error('Image streaming error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve image.' });
    }
});

module.exports = router;
