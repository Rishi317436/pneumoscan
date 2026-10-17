const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

exports.getLogin = (req, res) => {
    res.render('login');
};

exports.getRegister = (req, res) => {
    res.render('register');
};

exports.postRegister = async (req, res) => {
    try {
        const { name, email, password, phone, dob, gender, address } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            req.session.error = 'User already exists with this email.';
            return res.redirect('/register');
        }

        const user = new User({
            name, email, password, phone, dob, gender, address, role: 'user'
        });
        await user.save();

        await ActivityLog.create({
            userId: user._id,
            action: 'User Registration',
            details: 'New user registered',
            ipAddress: req.ip
        });

        req.session.success = 'Registration successful. Please log in.';
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        req.session.error = 'Registration failed. Try again.';
        res.redirect('/register');
    }
};

exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.comparePassword(password))) {
            req.session.error = 'Invalid email or password.';
            return res.redirect('/login');
        }
        
        if (user.status === 'inactive') {
            req.session.error = 'Account is inactive. Contact admin.';
            return res.redirect('/login');
        }

        req.session.user = {
            id: user._id,
            name: user.name,
            role: user.role,
            email: user.email
        };

        await ActivityLog.create({
            userId: user._id,
            action: 'User Login',
            details: 'User logged in successfully',
            ipAddress: req.ip
        });

        if (user.role === 'admin') {
            res.redirect('/admin');
        } else {
            res.redirect('/dashboard');
        }
    } catch (error) {
        console.error(error);
        req.session.error = 'Login failed. Try again.';
        res.redirect('/login');
    }
};

exports.getLogout = async (req, res) => {
    try {
        if (req.session.user) {
            await ActivityLog.create({
                userId: req.session.user.id,
                action: 'User Logout',
                details: 'User logged out',
                ipAddress: req.ip
            });
        }
        req.session.destroy(() => {
            res.redirect('/login');
        });
    } catch (error) {
        console.error(error);
        res.redirect('/login');
    }
};