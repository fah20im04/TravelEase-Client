const jwt = require('jsonwebtoken');
const admin = require('./firebaseAdmin');
const JWT_SECRET = process.env.JWT_SECRET;

const verifyAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];

    // Try JWT first
    try {
        const decodedJwt = jwt.verify(token, JWT_SECRET);
        req.user = decodedJwt;
        return next();
    } catch (err) {
        // Not a JWT, try Firebase
    }

    // Try Firebase
    try {
        const decodedFirebase = await admin.auth().verifyIdToken(token);
        req.user = decodedFirebase;
        return next();
    } catch (err) {
        console.error('Auth error:', err);  // <-- log the actual error
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = verifyAuth;
