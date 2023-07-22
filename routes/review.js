const router = require('express').Router();
const { verifyToken, verifyTokenAndAuthorization, verifyTokenAndAdmin } = require('./verifyToken');

const Review = require('../models/ReviewSchema');

router.post('/find/:pid', async (req, res) => {
    const productId = req.params.pid;
    try {
        const reviewArray = await Review.find({ productIds: { $in: [productId] } }).populate({
            path: 'userId',
            select: 'name',
        });
        res.status(200).json({
            resultCode: 0,
            reviewArray,
        });
    } catch (err) {}
});

module.exports = router;
