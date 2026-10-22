const mongoose = require('mongoose');

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/pneumonia_detection_db';
const ATLAS_URI = process.env.ATLAS_MONGODB_URI || process.env.MONGODB_URI || 'mongodb+srv://rishign2007_db_user:Rishi317436@cluster0.5wzd2av.mongodb.net/test?retryWrites=true&w=majority';

// Detect whether running in cloud environment (Render website) vs local machine
const isRenderCloud = Boolean(
    process.env.RENDER === 'true' ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.RENDER_SERVICE_ID ||
    process.env.IS_RENDER === 'true' ||
    (process.env.NODE_ENV === 'production' && !process.env.RUN_LOCAL)
);

let activeUri = LOCAL_URI;

const connectDB = async () => {
    let targetUri;

    if (isRenderCloud) {
        // When running on Render Cloud website: connect directly to MongoDB Atlas
        targetUri = ATLAS_URI;
        console.log('[DB] Environment: Render Cloud Deployment (Website)');
        console.log('[DB] Connecting to MongoDB Atlas Cloud...');
    } else {
        // When running on local host: connect directly to Local MongoDB (100% offline capable)
        targetUri = LOCAL_URI;
        console.log('[DB] Environment: Local Host (Offline / Air-Gapped Mode)');
        console.log(`[DB] Connecting directly to Local MongoDB (${LOCAL_URI})...`);
    }

    try {
        const conn = await mongoose.connect(targetUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        activeUri = targetUri;
        console.log(`[DB] Connected successfully to: ${conn.connection.host}`);
        return activeUri;
    } catch (err) {
        // If on localhost and local mongo had an error, try Atlas if internet is available
        if (!isRenderCloud && ATLAS_URI) {
            console.warn(`[DB] Local MongoDB connection failed (${err.message}). Attempting Atlas fallback...`);
            try {
                const conn = await mongoose.connect(ATLAS_URI, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    serverSelectionTimeoutMS: 3000
                });
                activeUri = ATLAS_URI;
                console.log(`[DB] Connected to MongoDB Atlas Cloud fallback: ${conn.connection.host}`);
                return activeUri;
            } catch (cloudErr) {
                console.error(`[DB] Fatal: Could not connect to either Local or Cloud MongoDB.`);
                process.exit(1);
            }
        }
        console.error(`[DB] Fatal connection error: ${err.message}`);
        process.exit(1);
    }
};

const getActiveUri = () => activeUri;

module.exports = { connectDB, getActiveUri, LOCAL_URI, ATLAS_URI, isRenderCloud };