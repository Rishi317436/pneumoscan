const mongoose = require('mongoose');

let bucket;

function getGridFSBucket() {
    if (!bucket) {
        if (!mongoose.connection.db) {
            throw new Error('MongoDB connection is not established yet.');
        }
        bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'radiographs'
        });
    }
    return bucket;
}

function uploadBufferToGridFS(buffer, filename, contentType = 'image/jpeg') {
    return new Promise((resolve, reject) => {
        try {
            const b = getGridFSBucket();
            const uploadStream = b.openUploadStream(filename, {
                contentType: contentType || 'image/jpeg'
            });

            uploadStream.on('error', (err) => reject(err));
            uploadStream.on('finish', () => resolve(uploadStream.id));

            uploadStream.end(buffer);
        } catch (error) {
            reject(error);
        }
    });
}

function deleteGridFSFile(fileId) {
    return new Promise((resolve) => {
        try {
            if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) {
                return resolve(false);
            }
            const b = getGridFSBucket();
            b.delete(new mongoose.Types.ObjectId(fileId), (err) => {
                if (err) resolve(false);
                else resolve(true);
            });
        } catch (e) {
            resolve(false);
        }
    });
}

module.exports = {
    getGridFSBucket,
    uploadBufferToGridFS,
    deleteGridFSFile
};
