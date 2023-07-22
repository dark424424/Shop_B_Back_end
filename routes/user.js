const router = require('express').Router();

const {
    verifyToken,
    verifyTokenAndAuthorization,
    verifyTokenAndAdmin,
    verifyTokenAndAuthorizationForOrder,
} = require('./verifyToken');

const Order = require('../models/Order');
const SoldItem = require('../models/SoldItem');
const Product = require('../models/Product');
const Review = require('../models/ReviewSchema');
const User = require('../models/User');

router.post('/search', verifyTokenAndAdmin, async (req, res) => {
    const text = req.body.text;
    let userList = [];
    let count;
    let userInfo = [];
    const pageIndex = req.body.pageIndex;
    const itemsPerPage = req.body.itemsPerPage;
    const skipCount = (pageIndex - 1) * itemsPerPage;
    const sortBy = req.body.sortBy;
    let sortOptions;
    switch (sortBy) {
        case 'newest':
            {
                sortOptions = { createdAt: -1 };
            }
            break;
        case 'oldest':
            {
                sortOptions = { createdAt: 1 };
            }
            break;
        case 'ordermax':
            {
                sortOptions = { 'orderInfo.createOrderCount': -1 };
            }
            break;
        case 'cancelMax':
            sortOptions = { 'orderInfo.cancelByUserOrderCount': -1 };
            break;
        default: {
            sortOptions = { createdAt: -1 };
        }
    }

    try {
        if (text) {
            userList = await User.find({
                $and: [
                    {
                        $or: [
                            { $text: { $search: text, $diacriticSensitive: false, $caseSensitive: false } },
                            { username: { $regex: text, $options: 'i' } },
                            { email: { $regex: text, $options: 'i' } },
                        ],
                    },
                    { isAdmin: false },
                ],
            })
                .sort(sortOptions)
                .skip(skipCount)
                .limit(itemsPerPage);

            count = await User.countDocuments({
                $and: [
                    {
                        $or: [
                            { $text: { $search: text, $diacriticSensitive: false, $caseSensitive: false } },
                            { username: { $regex: text, $options: 'i' } },
                            { email: { $regex: text, $options: 'i' } },
                        ],
                    },
                    { isAdmin: false },
                ],
            });

            // const userPromises = userList.map((user) => {
            //     const countOrderPromise = Order.countDocuments({ userId: user._id });
            //     const countOrderDonePromise = Order.countDocuments({ userId: user._id, status: 'Done' });
            //     const countOrderCancelPromise = Order.countDocuments({ userId: user._id, status: 'Cancelled' });

            //     return Promise.all([countOrderPromise, countOrderDonePromise, countOrderCancelPromise]).then(
            //         ([countOrder, countOrderDone, countOrderCancel]) => {
            //             return {
            //                 id: user._doc._id,
            //                 username: user._doc.username,
            //                 name: user._doc.name,
            //                 phoneNumber: user._doc.phoneNumber,
            //                 countOrder,
            //                 countOrderDone,
            //                 countOrderCancel,
            //                 countOrderProgress: countOrder - countOrderDone - countOrderCancel,
            //             };
            //         },
            //     );
            // });

            // userInfo = await Promise.all(userPromises);
        } else {
            userList = await User.find({
                isAdmin: false,
            })
                .sort(sortOptions)
                .skip(skipCount)
                .limit(itemsPerPage);

            count = await User.countDocuments({
                isAdmin: false,
            });

            // const userPromises = userList.map((user) => {
            //     const countOrderPromise = Order.countDocuments({ userId: user._id });
            //     const countOrderDonePromise = Order.countDocuments({ userId: user._id, status: 'Done' });
            //     const countOrderCancelPromise = Order.countDocuments({ userId: user._id, status: 'Cancelled' });

            //     return Promise.all([countOrderPromise, countOrderDonePromise, countOrderCancelPromise]).then(
            //         ([countOrder, countOrderDone, countOrderCancel]) => {
            //             return {
            //                 id: user._doc._id,
            //                 username: user._doc.username,
            //                 name: user._doc.name,
            //                 phoneNumber: user._doc.phoneNumber,
            //                 createDate: user._doc.createdAt,
            //                 countOrder,
            //                 countOrderDone,
            //                 countOrderCancel,
            //                 countOrderProgress: countOrder - countOrderDone - countOrderCancel,
            //             };
            //         },
            //     );
            // });

            // userInfo = await Promise.all(userPromises);
        }

        res.status(200).json({ resultCode: 0, userList, count });
    } catch (err) {
        res.status(200).json({ resultCode: 1, message: 'Lỗi Server' });
    }
});

router.post('/getDetail', verifyTokenAndAdmin, async (req, res) => {
    const userId = req.body.userId;
    try {
        const user = await User.findById(userId);
        const countOrder = await Order.countDocuments({ userId: userId });
        const countOrderDone = await Order.countDocuments({ userId: userId, status: 'Done' });
        const countOrderCancel = await Order.countDocuments({ userId: userId, status: 'Cancelled' });
        const orderlist = await Order.find({ userId: userId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'products.productId',
                select: '_id title',
            })
            .limit(5);

        const ordercount = await Order.countDocuments({ userId: userId });

        res.status(200).json({
            resultCode: 0,
            user: {
                ...user._doc,
                countOrder,
                countOrderDone,
                countOrderCancel,
                countOrderProgress: countOrder - countOrderDone - countOrderCancel,
            },
            orderlist,
            ordercount,
        });
    } catch (err) {
        res.status(200).json({ resultCode: 1, message: 'Không tìm được người dùng này' });
    }
});

router.post('/searchorder', verifyTokenAndAdmin, async (req, res) => {
    const userId = req.body.userId;
    const pageIndex = req.body.pageIndex;
    const itemsPerPage = req.body.itemsPerPage;
    const skipCount = (pageIndex - 1) * itemsPerPage;
    const sortBy = req.body.sortBy;
    let sortOptions;
    switch (sortBy) {
        case 'newest':
            {
                sortOptions = { createdAt: -1 };
            }
            break;
        case 'oldest':
            {
                sortOptions = { createdAt: 1 };
            }
            break;
        default: {
            sortOptions = { createdAt: -1 };
        }
    }
    try {
        const orderlist = await Order.find({ userId: userId }).sort(sortOptions).skip(skipCount).limit(itemsPerPage);
        res.status(200).json({ resultCode: 0, orderlist });
    } catch (e) {
        res.status(200).json({ resultCode: 1, message: 'Không tìm được người dùng này' });
    }
});

router.post('/updatedisable', verifyTokenAndAdmin, async (req, res) => {
    const isDisable = req.body.isDisable;
    const userId = req.body.userId;
    try {
        const newUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    isDisable: isDisable,
                },
            },
            { new: true },
        );
        res.status(200).json({ resultCode: 0, newUser, message: 'Thay Đổi Trạng Thái Tài Khoản Thành Công' });
    } catch (e) {
        res.status(200).json({ resultCode: 1, message: '' });
    }
});

module.exports = router;
