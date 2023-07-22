const router = require('express').Router();
const User = require('../models/User');
const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');

const { verifyTokenAndAdmin } = require('./verifyToken');
const CategoryInfo = require('../models/CategoryInfo');

router.post('/create', verifyTokenAndAdmin, async (req, res) => {
    const categoryInfo = new CategoryInfo(req.body);

    try {
        const savedCat = await categoryInfo.save();
        res.status(200).json({
            resultCode: 0,
            savedCat,
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Loi Server',
        });
    }
});

router.post('/findcat', verifyTokenAndAdmin, async (req, res) => {
    const catname = req.body.catname;

    try {
        const catInfo = await CategoryInfo.find({ categoryName: catname });
        res.status(200).json({
            resultCode: 0,
            catInfo,
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Loi Server',
        });
    }
});

module.exports = router;
