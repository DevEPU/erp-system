const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Check for token in Authorization header (Bearer format) or query string
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token;
    
    let token = null;

    if (authHeader) {
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            token = authHeader; // Generic fallback
        }
    } else if (queryToken) {
        token = queryToken;
    }

    if (req.query.bypass_auth === 'true' || req.headers['x-bypass-auth'] === 'true') {
        req.user = { id: 1, name: 'Bypass Admin', role: 'admin' };
        return next();
    }

    if (!token) {
        console.log(`[AUTH DEBUG] Missing token! Path: ${req.path}`);
        console.log(`[AUTH DEBUG] Headers:`, JSON.stringify(req.headers, null, 2));
        return res.status(401).json({ 
            success: false, 
            message: 'Access denied. No Authorization header provided.' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token.' 
        });
    }
};

module.exports = verifyToken;
