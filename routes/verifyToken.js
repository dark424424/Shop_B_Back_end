const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.token;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SEC, (err, user) => {
            if (err)
                return res.status(200).json(
                    res.status(200).json({
                        resultCode: 1,
                        message: 'Token is not valid',
                    }),
                );
            req.user = user;
            next();
        });
    } else {
        return res.status(200).json({
            resultCode: 1,
            message: 'Chưa có token khi gọi API',
        });
    }
};

const verifyTokenAndAuthorization = (req, res, next) => {
    verifyToken(req, res, () => {
        // console.log(req.user.id, req.params.id);
        if (req.user.id === req.body.userId || req.user.isAdmin) {
            next();
        } else {
            res.status(200).json({
                resultCode: 1,
                message: 'You are not valid!',
            });
        }
    });
};

const verifyTokenAndAuthorizationForOrder = (req, res, next) => {
    verifyToken(req, res, () => {
        // console.log(req.user.id, req.params.id);
        // req.user.id === req.body.id || req.user.isAdmin
        if (req.user.id === req.body.id || req.user.isAdmin) {
            next();
        } else {
            res.status(200).json({
                resultCode: 1,
                message: 'You are not valid!',
            });
        }
    });
};

const verifyTokenAndShipper = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.isAdmin) {
            next();
        } else if (req.user.isShipper) {
            next();
        } else {
            res.status(200).json({
                resultCode: 1,
                message: 'You are not shipper!',
            });
        }
    });
};

const verifyTokenAndAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.isAdmin) {
            next();
        } else {
            res.status(200).json({
                resultCode: 1,
                message: 'You are not admin!',
            });
        }
    });
};

module.exports = {
    verifyToken,
    verifyTokenAndAuthorization,
    verifyTokenAndAdmin,
    verifyTokenAndShipper,
    verifyTokenAndAuthorizationForOrder,
};
