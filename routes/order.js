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

//Create
router.post('/create', verifyTokenAndAuthorization, async (req, res) => {
    const newOrder = new Order(req.body);
    const products = req.body.products;
    try {
        if (products.length > 0) {
            const savedOrder = await newOrder.save();
            const newUser = await User.findByIdAndUpdate(
                req.body.userId,
                { $inc: { 'orderInfo.createOrderCount': 1 } }, // Sử dụng toán tử $inc để tăng giá trị của createOrderCount lên 1
                { new: true },
            );

            res.status(200).json({
                resultCode: 0,
                savedOrder,
            });
        } else {
            res.status(200).json({
                resultCode: 1,
                message: 'Vui lòng chọn hàng hóa trước khi bấm thanh toán !!!',
            });
        }
    } catch (err) {
        console.log(err);
        res.status(200).json({
            resultCode: 1,
            message: 'Tạo đơn thất bại !!!',
        });
    }
});

// router.post('/updatetest', async (req, res) => {
//     try {
//         const updateResult = await User.updateMany(
//             {},
//             {
//                 $set: {
//                     orderInfo: {
//                         createOrderCount: 0,
//                         doneOrderCount: 0,
//                         cancelByShopOrderCount: 0,
//                         cancelByUserOrderCount: 0,
//                     },
//                 },
//             },
//         );
//         res.status(200).json({
//             resultCode: 0,
//             message: 'Thành Công',
//         });
//     } catch (e) {
//         res.status(200).json({
//             resultCode: 1,
//             message: 'Thất Bại',
//         });
//     }
// });

router.post('/verify', verifyTokenAndAdmin, async (req, res) => {
    const id = req.body.id;
    try {
        const order = await Order.findById(id);

        let hasEnoughStock = true;

        // order.products.forEach(async (product) => {
        //     const oldProduct = await Product.findById(product.productId);

        //     if (oldProduct) {
        //         const newInStock = oldProduct.inStock - product.quantity;
        //         await Product.findByIdAndUpdate(
        //             product.productId,
        //             {
        //                 $set: {
        //                     inStock: newInStock,
        //                 },
        //             },
        //             { new: true },
        //         );
        //     }
        // });

        for (const product of order.products) {
            const oldProduct = await Product.findById(product.productId);

            if (oldProduct) {
                const newInStock = oldProduct.inStock - product.quantity;

                if (newInStock < 0) {
                    hasEnoughStock = false;
                    break; // Exit the loop if there is not enough stock
                }

                await Product.findByIdAndUpdate(
                    product.productId,
                    {
                        $set: {
                            inStock: newInStock,
                        },
                    },
                    { new: true },
                );
            }
        }

        if (!hasEnoughStock) {
            return res.status(200).json({
                resultCode: 1,
                message: 'Không đủ hàng để duyệt',
            });
        }

        const updatedOrder = await Order.findByIdAndUpdate(id, { $set: { status: 'Inprogress' } }, { new: true });
        return res.status(200).json({
            resultCode: 0,
            updatedOrder,
        });
    } catch (err) {
        return res.status(200).json({
            resultCode: 1,
            message: 'Xác nhận đơn thất bại !!!',
        });
    }
});

router.post('/cancel', verifyTokenAndAdmin, async (req, res) => {
    const id = req.body.id;
    const reason = req.body.reason;
    const type = req.body.type;
    try {
        const order = await Order.findById(id);

        if (order.status === 'Inprogress') {
            order.products.forEach(async (product) => {
                const oldProduct = await Product.findById(product.productId);

                if (oldProduct) {
                    const newInStock = oldProduct.inStock + product.quantity;
                    await Product.findByIdAndUpdate(
                        product.productId,
                        {
                            $set: {
                                inStock: newInStock,
                            },
                        },
                        { new: true },
                    );
                }
            });
        }
        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            { $set: { status: 'Cancelled', cancelReason: reason } },
            { new: true },
        );

        if (type === 0) {
            const newUser = await User.findByIdAndUpdate(
                order.userId,
                { $inc: { 'orderInfo.cancelByShopOrderCount': 1 } }, // Sử dụng toán tử $inc để tăng giá trị của createOrderCount lên 1
                { new: true },
            );
        } else if (type === 1) {
            const newUser = await User.findByIdAndUpdate(
                order.userId,
                { $inc: { 'orderInfo.cancelByUserOrderCount': 1 } }, // Sử dụng toán tử $inc để tăng giá trị của createOrderCount lên 1
                { new: true },
            );
        }

        return res.status(200).json({
            resultCode: 0,
            updatedOrder,
        });
    } catch (err) {
        return res.status(200).json({
            resultCode: 1,
            message: 'Hủy Đơn thất bại !!!',
        });
    }
});

// Update;
router.post('/update/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            {
                $set: req.body,
            },
            { new: true },
        );
        res.status(200).json({ resultCode: 0, updatedOrder });
    } catch (err) {
        res.status(200).json(err);
    }
});

//Delete
router.post('/delete/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.status(200).json({ resultCode: 0, message: 'Order has been deleted' });
    } catch (err) {
        res.status(200).json({ resultCode: 1, message: 'Delete Failed' });
    }
});

//Get user cart
router.post('/find/:id', verifyTokenAndAuthorization, async (req, res) => {
    const status = req.body.status;
    const userId = req.body.userId;
    let orders = [];

    let query = { userId: userId };

    if (status && status.length > 0) {
        query.status = { $in: status };
    }
    try {
        if (status) {
            orders = await Order.find(query).sort({ createdAt: -1 }).populate({
                path: 'products.productId',
                select: '_id title desc',
            });
        } else {
            orders = await Order.find(query).sort({ createdAt: -1 }).populate({
                path: 'products.productId',
                select: '_id title desc',
            });
        }

        res.status(200).json({
            resultCode: 0,
            orderList: orders,
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Something went wrong',
        });
    }
});

// Get All
router.post('/getorder', verifyTokenAndAdmin, async (req, res) => {
    const status = req.body.status;
    const sort = req.body.sort;
    let sortOptions;
    switch (sort) {
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
        const orders = await Order.find({ status: { $in: [status] } })
            .sort(sortOptions)
            .populate({
                path: 'products.productId',
                select: '_id title inStock',
            });
        res.status(200).json({
            resultCode: 0,
            orderList: orders,
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Da xay ra loi',
        });
    }
});

router.post('/getorderwithpaging', verifyTokenAndAdmin, async (req, res) => {
    const status = req.body.status;
    const pageIndex = req.body.pageIndex;
    const itemsPerPage = req.body.itemsPerPage;
    const skipCount = (pageIndex - 1) * itemsPerPage;
    const sort = req.body.sort;
    let sortOptions;
    switch (sort) {
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
        const orders = await Order.find({ status: { $in: status } })
            .sort(sortOptions)
            .populate({
                path: 'products.productId',
                select: '_id title inStock',
            })
            .skip(skipCount)
            .limit(itemsPerPage);

        const total = await Order.countDocuments({ status: { $in: status } });
        res.status(200).json({
            resultCode: 0,
            orderList: orders,
            total,
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Da xay ra loi',
        });
    }
});

// Get order detail
router.post('/getorderdetail/:id', verifyTokenAndAuthorizationForOrder, async (req, res) => {
    try {
        const id = req.params.id;
        const order = await Order.findById(id).populate({
            path: 'products.productId',
            select: '_id title desc',
        });
        res.status(200).json({
            resultCode: 0,
            orderDetail: order,
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Da xay ra loi',
        });
    }
});

// Get order detail admin
router.post('/getorderdetailadmin', verifyTokenAndAdmin, async (req, res) => {
    try {
        const id = req.body.id;
        const order = await Order.findById(id).populate({
            path: 'products.productId',
            select: '_id title desc',
        });
        res.status(200).json({
            resultCode: 0,
            orderDetail: order,
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Da xay ra loi',
        });
    }
});

router.post('/done', verifyTokenAndAdmin, async (req, res) => {
    const id = req.body.id;
    const imgEvidence = req.body.img;
    try {
        const orders = await Order.findByIdAndUpdate(
            req.body.id,
            {
                $set: {
                    status: 'Done',
                    evidence: imgEvidence,
                },
            },
            { new: true },
        );
        if (orders.products.length > 0) {
            const array = Promise.all(
                orders.products.map(async (product) => {
                    let UpdateProduct = await Product.findById(product.productId);
                    const newSoldCount = UpdateProduct.soldCount + product.quantity;
                    const newProduct = await Product.findByIdAndUpdate(
                        product.productId,
                        {
                            $set: {
                                soldCount: newSoldCount,
                            },
                        },
                        { new: true },
                    );

                    let soldProduct = new SoldItem({
                        productId: product.productId,
                        userId: req.body.userId,
                        singlePrice: product.singlePrice,
                        category: UpdateProduct.categories,
                        price: product.totalPrice,
                        quantity: product.quantity,
                    });

                    soldProduct = await soldProduct.save();
                    return soldProduct._id;
                }),
            );
            const result = await array;
            const newUser = await User.findByIdAndUpdate(
                orders.userId,
                { $inc: { 'orderInfo.doneOrderCount': 1 } }, // Sử dụng toán tử $inc để tăng giá trị của createOrderCount lên 1
                { new: true },
            );

            res.status(200).json({
                resultCode: 0,
                listProductSold: result,
            });
        } else {
            res.status(200).json({
                resultCode: 1,
                message: 'No Products',
            });
        }
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Error Server',
        });
    }
});

// Get Income by category
router.post('/incomebycat', verifyTokenAndAdmin, async (req, res) => {
    const cat = req.body.cat;
    const countMonthAgo = req.body.time;
    const date = new Date();
    const toMonth = new Date(date.setMonth(date.getMonth() - countMonthAgo + 1));

    const monthsArray = [];
    let currentDateCopy = new Date(date);

    for (let i = countMonthAgo; i >= 1; i--) {
        const monthId = currentDateCopy.getMonth() + 1; // Tháng tính từ 0 (tháng 0 là tháng 1), vì vậy chúng ta cộng 1 để có tháng từ 1 đến 12
        const year = currentDateCopy.getFullYear();
        const monthObj = {
            _id: {
                month: monthId,
                year: year,
            },
        };
        monthsArray.push(monthObj);

        currentDateCopy.setMonth(currentDateCopy.getMonth() + 1);
    }
    try {
        const income = await SoldItem.aggregate([
            {
                $match: {
                    createdAt: { $gte: toMonth },
                    ...(cat && {
                        category: cat,
                    }),
                },
            },
            {
                $project: {
                    month: { $month: '$createdAt' },
                    year: { $year: '$createdAt' },
                    sales: '$price',
                },
            },
            {
                $group: {
                    _id: { month: '$month', year: '$year' },
                    total: { $sum: '$sales' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        const resultIcome = monthsArray.map((item) => {
            const matchingIncome = income.find((incomeObj) => {
                return incomeObj._id.month === item._id.month && incomeObj._id.year === item._id.year;
            });
            if (matchingIncome) {
                return matchingIncome;
            } else {
                return { _id: item._id, total: 0 };
            }
        });

        res.status(200).json({
            resultCode: 0,
            resultIcome,
        });
    } catch (e) {
        res.status(200).json({
            resultCode: 1,
            message: 'Error Server',
        });
    }
});

// Get revenue by month
router.post('/revenuebymonth', verifyTokenAndAdmin, async (req, res) => {
    const countMonthAgo = req.body.time;
    const date = new Date();
    const toMonth = new Date(date.setMonth(date.getMonth() - countMonthAgo + 1));

    try {
        const total = await SoldItem.aggregate([
            { $match: { createdAt: { $gte: toMonth } } },
            {
                $group: {
                    _id: null,
                    totalSale: { $sum: '$quantity' },
                    totalPrice: { $sum: '$price' },
                },
            },
        ]);

        const categoryRateInfo = await SoldItem.aggregate([
            { $match: { createdAt: { $gte: toMonth } } },
            {
                $group: {
                    _id: '$category',
                    totalPrice: { $sum: '$price' },
                },
            },
            { $sort: { totalPrice: -1 } },
            { $limit: 4 },
        ]);

        res.status(200).json({
            resultCode: 0,
            total,
            categoryRateInfo,
        });
    } catch (e) {
        res.status(200).json({
            resultCode: 1,
            message: 'Error Server',
        });
    }
});

// Count Order
router.post('/ordercount', verifyTokenAndAdmin, async (req, res) => {
    const countMonthAgo = req.body.time;
    const date = new Date();
    const toMonth = new Date(date.setMonth(date.getMonth() - countMonthAgo + 1));

    try {
        const total = await SoldItem.aggregate([
            { $match: { createdAt: { $gte: toMonth } } },
            {
                $group: {
                    _id: null,
                    totalSale: { $sum: '$quantity' },
                    totalPrice: { $sum: '$price' },
                },
            },
        ]);
        const categoryQuantityRateInfo = await SoldItem.aggregate([
            { $match: { createdAt: { $gte: toMonth } } },
            {
                $group: {
                    _id: '$category',
                    totalSold: { $sum: '$quantity' },
                },
            },
            { $sort: { totalSold: -1 } },
            { $limit: 4 },
        ]);

        res.status(200).json({
            resultCode: 0,
            total,
            categoryQuantityRateInfo,
        });
    } catch (e) {
        res.status(200).json({
            resultCode: 1,
            message: 'Error Server',
        });
    }
});

// GET INIT Home ADmin Info
router.post('/inithomeinfo', verifyTokenAndAdmin, async (req, res) => {
    const productId = req.query.pid;
    const userId = req.query.uid;
    const date = new Date();
    const lastMonth = new Date(date.setMonth(date.getMonth() - 1));
    const prevMonth = new Date(new Date().setMonth(lastMonth.getMonth() - 10));
    const threeMonthAgo = new Date(new Date().setMonth(lastMonth.getMonth() - 1));

    try {
        const income = await SoldItem.aggregate([
            {
                $match: {
                    createdAt: { $gte: prevMonth },
                    ...(productId && {
                        productId: productId,
                    }),
                    ...(userId && {
                        userId: userId,
                    }),
                },
            },
            {
                $project: {
                    month: { $month: '$createdAt' },
                    year: { $year: '$createdAt' },
                    sales: '$price',
                },
            },
            {
                $group: {
                    _id: { month: '$month', year: '$year' },
                    total: { $sum: '$sales' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        const categoryRateInfo = await SoldItem.aggregate([
            { $match: { createdAt: { $gte: threeMonthAgo } } },
            {
                $group: {
                    _id: '$category',
                    totalPrice: { $sum: '$price' },
                },
            },
            { $sort: { totalPrice: -1 } },
            { $limit: 4 },
        ]);

        const categoryQuantityRateInfo = await SoldItem.aggregate([
            { $match: { createdAt: { $gte: threeMonthAgo } } },
            {
                $group: {
                    _id: '$category',
                    totalSold: { $sum: '$quantity' },
                },
            },
            { $sort: { totalSold: -1 } },
            { $limit: 4 },
        ]);

        const total = await SoldItem.aggregate([
            { $match: { createdAt: { $gte: threeMonthAgo } } },
            {
                $group: {
                    _id: null,
                    totalSale: { $sum: '$quantity' },
                    totalPrice: { $sum: '$price' },
                },
            },
        ]);

        const openOrderCount = await Order.countDocuments({ status: 'Open' });
        const inprogressOrderCount = await Order.countDocuments({ status: 'Inprogress' });
        const outStockCount = await Product.countDocuments({ inStock: 0 });

        res.status(200).json({
            resultCode: 0,
            incomeList: income,
            categoryRate: categoryRateInfo,
            categoryQuantity: categoryQuantityRateInfo,
            total,
            openOrderCount,
            inprogressOrderCount,
            outStockCount,
        });
    } catch (err) {
        res.status(200).json(err);
    }
});

router.post('/review', verifyTokenAndAuthorization, async (req, res) => {
    const { userId, orderId, review, star } = req.body;

    try {
        const order = await Order.findById(orderId);
        let productIdArray = Promise.all(
            order.products.map(async (product) => {
                const oldProduct = await Product.findById(product.productId);
                let newPoint = (oldProduct.reviewPoint * oldProduct.reviewCount + star) / (oldProduct.reviewCount + 1);
                console.log(newPoint);
                let roundedPoint = parseFloat(newPoint.toFixed(2));
                await Product.findByIdAndUpdate(
                    product.productId,
                    {
                        $set: {
                            reviewPoint: roundedPoint,
                            reviewCount: oldProduct.reviewCount + 1,
                        },
                    },
                    { new: true },
                );
                return product.productId;
            }),
        );
        await Order.findByIdAndUpdate(orderId, {
            $set: {
                isReview: true,
            },
        });
        let array = await productIdArray;
        const newReview = await new Review({ ...req.body, productIds: array });
        const savedReview = await newReview.save();
        res.status(200).json({
            resultCode: 0,
            savedReview,
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Xảy ra lỗi ở server vui lòng thử lại sau',
        });
    }
});

module.exports = router;
