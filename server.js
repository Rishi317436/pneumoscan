require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Folders
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/gradcam', express.static(path.join(__dirname, 'gradcam')));
app.use('/results', express.static(path.join(__dirname, 'dip_engine', 'results')));
app.use('/comparison-assets', express.static(path.join(__dirname, 'dip_engine', 'results')));
app.use('/dip_engine/results', express.static(path.join(__dirname, 'dip_engine', 'results')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/pneumonia_detection_db',
        collectionName: 'sessions'
    }),
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Global Variables
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.success = req.session.success || null;
    res.locals.error = req.session.error || null;
    delete req.session.success;
    delete req.session.error;
    next();
});

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.redirect('/login');
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    if (req.session.user.role === 'admin') {
        return res.redirect('/admin');
    }
    res.render('dashboard');
});

app.use('/', require('./routes/authRoutes'));
app.use('/scan', require('./routes/scanRoutes'));
app.use('/report', require('./routes/reportRoutes'));
app.use('/feedback', require('./routes/feedbackRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/comparison', require('./routes/comparisonRoutes'));

// 404 Handler
app.use((req, res) => {
    res.status(404).render('404', { title: '404 Not Found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});