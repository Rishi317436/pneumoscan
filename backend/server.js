require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();

// Enable reverse-proxy trust for Render, Cloudflare, ALB (fixes secure cookies, client IPs, SSL termination)
app.set('trust proxy', 1);

// Ensure all media/runtime directories exist
const runtimeDirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'gradcam'),
    path.join(__dirname, '..', 'uploads'),
    path.join(__dirname, '..', 'dip_engine', 'results'),
    path.join(__dirname, 'dip_engine', 'results')
];
runtimeDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
});

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    process.env.CORS_ORIGIN,
    process.env.RENDER_EXTERNAL_URL
].filter(Boolean);

// Flexible CORS middleware supporting local dev, Render deployed URL, and custom origins
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request Logging
app.use(morgan('dev'));

// Body Parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Session Configuration with MongoStore
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
    secret: process.env.SESSION_SECRET || 'pneumonia_detection_secret_2024',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/pneumonia_detection_db',
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction && process.env.COOKIE_SECURE === 'true'
    }
}));

// Set CORS headers for static files
const setStaticCors = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
};

// Static Folders & Aliases
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { setHeaders: setStaticCors }));
app.use('/backend/uploads', express.static(path.join(__dirname, 'uploads'), { setHeaders: setStaticCors }));
if (fs.existsSync(path.join(__dirname, '..', 'uploads'))) {
    app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { setHeaders: setStaticCors }));
    app.use('/backend/uploads', express.static(path.join(__dirname, '..', 'uploads'), { setHeaders: setStaticCors }));
}

app.use('/gradcam', express.static(path.join(__dirname, 'gradcam'), { setHeaders: setStaticCors }));
app.use('/results', express.static(path.join(__dirname, '..', 'dip_engine', 'results'), { setHeaders: setStaticCors }));
app.use('/results', express.static(path.join(__dirname, 'dip_engine', 'results'), { setHeaders: setStaticCors }));
app.use('/comparison-assets', express.static(path.join(__dirname, '..', 'dip_engine', 'results'), { setHeaders: setStaticCors }));
app.use('/comparison-assets', express.static(path.join(__dirname, 'dip_engine', 'results'), { setHeaders: setStaticCors }));
app.use('/dip_engine/results', express.static(path.join(__dirname, '..', 'dip_engine', 'results'), { setHeaders: setStaticCors }));
app.use('/dip_engine/results', express.static(path.join(__dirname, 'dip_engine', 'results'), { setHeaders: setStaticCors }));
app.use('/public', express.static(path.join(__dirname, 'public'), { setHeaders: setStaticCors }));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/scans', require('./routes/scanRoutes'));
app.use('/api/scan', require('./routes/scanRoutes')); // Alias
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/report', require('./routes/reportRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/comparison', require('./routes/comparisonRoutes'));

// Root health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'Chest X-Ray Analysis Workspace API',
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000,
        timestamp: new Date().toISOString()
    });
});

// Serve Frontend static production build (single-push deployment)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
        if (
            req.path.startsWith('/api') || 
            req.path.startsWith('/uploads') || 
            req.path.startsWith('/backend/uploads') || 
            req.path.startsWith('/results') || 
            req.path.startsWith('/gradcam') ||
            req.path.startsWith('/dip_engine')
        ) {
            return next();
        }
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Resource not found' });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('API Error Handler:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`Backend API Server running on http://${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});