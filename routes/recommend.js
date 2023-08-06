const router = require('express').Router();
const { verifyToken, verifyTokenAndAuthorization, verifyTokenAndAdmin } = require('./verifyToken');

const Product = require('../models/Product');
const CategoryInfo = require('../models/CategoryInfo');
const ImportProduct = require('../models/ImportProduct');
const ReviewSchema = require('../models/ReviewSchema');

router.post('/outofstock', verifyTokenAndAdmin, async (req, res) => {
    const currentDate = new Date();
    const thresholdDays = 7;

    try {
        const producList = await Product.find();
        const outOfStockList = await Promise.all(
            producList.map(async (product) => {
                if (product.lastImportId && product.lastImportId !== '') {
                    const lastImportOrder = await ImportProduct.findById(product.lastImportId);
                    const timeDiff = (currentDate.getTime() - lastImportOrder.createdAt.getTime()) / (1000 * 3600 * 24);
                    const soldCount = lastImportOrder.newInStock - product.inStock;
                    if (soldCount > 0 && timeDiff > 1) {
                        const speedSell = soldCount / timeDiff;

                        const remainingDay = product.inStock / speedSell;
                        const newProduct = {
                            id: product._id,
                            title: product.title,
                            inStock: product.inStock,
                            img: product.img,
                            remainingDay: remainingDay,
                            sold: soldCount,
                            timeDiff: timeDiff,
                        };

                        return newProduct;
                    }
                    return null;
                }
                return null;
            }),
        );

        const filteredOutOfStockList = outOfStockList.filter(
            (item) => (item !== null && item.remainingDay < thresholdDays) || (item !== null && item.inStock === 0),
        );

        res.status(200).json({
            resultCode: 0,
            filteredOutOfStockList,
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Da xay ra loi',
        });
    }
});

module.exports = router;
