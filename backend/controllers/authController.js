const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const bcrypt = require('bcryptjs');

exports.getMe = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        const user = await User.findById(req.session.user.id).select('-password').lean();
        if (!user) {
            req.session.destroy();
            return res.status(401).json({ success: false, message: 'User no longer exists' });
        }
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone || '',
                dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
                gender: user.gender || 'Other',
                profilePhoto: user.profilePhoto || '',
                address: user.address || '',
                status: user.status || 'active',
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch current user' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const { name, phone, dob, gender, address, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.session.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // If changing password, verify current password
        if (newPassword && newPassword.trim() !== '') {
            if (!currentPassword) {
                return res.status(400).json({ success: false, message: 'Current password is required to set a new password.' });
            }
            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Current password does not match.' });
            }
            user.password = newPassword;
        }

        if (name || req.body.username) user.name = name || req.body.username;
        if (phone !== undefined) user.phone = phone;
        if (dob !== undefined) user.dob = dob ? new Date(dob) : null;
        if (gender !== undefined) user.gender = gender;
        if (address !== undefined) user.address = address;
        if (req.body.profilePhoto !== undefined) user.profilePhoto = req.body.profilePhoto;

        await user.save();

        // Update session user name
        req.session.user.name = user.name;

        await ActivityLog.create({
            userId: user._id,
            action: 'Profile Updated',
            details: 'Clinician updated profile information',
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Profile updated successfully.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone || '',
                dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
                gender: user.gender || 'Other',
                profilePhoto: user.profilePhoto || '',
                address: user.address || '',
                status: user.status
            }
        });
    } catch (error) {
        console.error('updateProfile error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile.' });
    }
};

exports.postRegister = async (req, res) => {
    try {
        const { 
            name, 
            email, 
            password, 
            phone, 
            dob, 
            gender, 
            address, 
            registrationNumber,
            profilePhoto,
            designation,
            department,
            institution,
            medicalLicense,
            specialization
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Full name is required.' });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: 'Email address is required.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
        }

        const regNo = (registrationNumber && registrationNumber.trim()) 
            ? registrationNumber.trim().toUpperCase() 
            : `RAD-${Math.floor(1000 + Math.random() * 9000)}`;

        let parsedDob = null;
        if (dob && dob.trim() !== '') {
            parsedDob = new Date(dob);
            if (isNaN(parsedDob.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid Date of Birth.' });
            }
            if (parsedDob > new Date()) {
                return res.status(400).json({ success: false, message: 'Date of Birth cannot be in the future.' });
            }
        }

        const validGenders = ['Male', 'Female', 'Other'];
        const selectedGender = validGenders.includes(gender) ? gender : 'Other';

        const user = new User({
            name: name.trim(),
            email: normalizedEmail,
            registrationNumber: regNo,
            password,
            phone: phone ? phone.trim() : '',
            dob: parsedDob,
            gender: selectedGender,
            address: address ? address.trim() : '',
            profilePhoto: profilePhoto || '',
            designation: designation ? designation.trim() : 'Consultant Radiologist',
            department: department ? department.trim() : 'Diagnostic Radiology',
            institution: institution ? institution.trim() : '',
            medicalLicense: medicalLicense ? medicalLicense.trim() : '',
            specialization: specialization ? specialization.trim() : 'Thoracic Imaging',
            role: 'user',
            status: 'active'
        });
        await user.save();

        await ActivityLog.create({
            userId: user._id,
            action: 'User Registration',
            details: `Clinician ${user.name} (${regNo} - ${user.designation}) registered account`,
            ipAddress: req.ip
        });

        req.session.user = {
            id: user._id,
            name: user.name,
            role: user.role,
            email: user.email,
            registrationNumber: user.registrationNumber,
            designation: user.designation,
            department: user.department,
            institution: user.institution
        };

        res.status(201).json({
            success: true,
            message: 'Registration successful.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                registrationNumber: user.registrationNumber,
                role: user.role,
                phone: user.phone,
                dob: user.dob ? user.dob.toISOString().split('T')[0] : '',
                gender: user.gender,
                profilePhoto: user.profilePhoto || '',
                address: user.address,
                designation: user.designation,
                department: user.department,
                institution: user.institution,
                medicalLicense: user.medicalLicense,
                specialization: user.specialization
            }
        });
    } catch (error) {
        console.error('postRegister error:', error);
        res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    }
};

exports.postLogin = async (req, res) => {
    try {
        const { email, password, registrationNumber, username } = req.body;
        const identifier = (email || username || registrationNumber || '').trim();
        if (!identifier || !password) {
            return res.status(400).json({ success: false, message: 'Identification and password are required.' });
        }

        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { name: identifier },
                { registrationNumber: identifier.toUpperCase() }
            ]
        });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials or password.' });
        }
        
        if (user.status === 'inactive') {
            return res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
        }

        req.session.user = {
            id: user._id,
            name: user.name,
            role: user.role,
            email: user.email,
            profilePhoto: user.profilePhoto || ''
        };

        await ActivityLog.create({
            userId: user._id,
            action: 'User Login',
            details: 'Clinician signed in to workspace',
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                email: user.email,
                profilePhoto: user.profilePhoto || ''
            }
        });
    } catch (error) {
        console.error('postLogin error:', error);
        res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }
};

exports.getLogout = async (req, res) => {
    try {
        if (req.session && req.session.user) {
            await ActivityLog.create({
                userId: req.session.user.id,
                action: 'User Logout',
                details: 'Clinician logged out',
                ipAddress: req.ip
            });
        }
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to logout' });
            }
            res.clearCookie('connect.sid');
            res.json({ success: true, message: 'Logged out successfully' });
        });
    } catch (error) {
        console.error('getLogout error:', error);
        res.status(500).json({ success: false, message: 'Logout failed.' });
    }
};