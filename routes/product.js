const router = require('express').Router();
const { verifyToken, verifyTokenAndAuthorization, verifyTokenAndAdmin } = require('./verifyToken');

const Product = require('../models/Product');
const CategoryInfo = require('../models/CategoryInfo');
const ImportProduct = require('../models/ImportProduct');
const ReviewSchema = require('../models/ReviewSchema');

//Create
router.post('/create', verifyTokenAndAdmin, async (req, res) => {
    const newProduct = new Product(req.body);
    try {
        const savedProduct = await newProduct.save();
        res.status(200).json({ resultCode: 0, savedProduct: savedProduct });
    } catch (err) {
        res.status(200).json(err);
    }
});

// Update
router.post('/update/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            {
                $set: req.body,
            },
            { new: true },
        );
        res.status(200).json({
            resultCode: 0,
            updatedProduct,
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Chỉnh sửa thất bại',
        });
    }
});

//Delete
router.post('/delete/:id', verifyTokenAndAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        res.status(200).json({ resultCode: 0, product, message: 'Product has been deleted' });
    } catch (err) {
        res.status(200).json({ resultCode: 1, message: 'Failed' });
    }
});

//Get product - User
router.post('/getproductdetailinit', async (req, res) => {
    const id = req.body.id;

    try {
        const product = await Product.findById(id);
        const commentList = await ReviewSchema.find({ productIds: { $in: [id] } })
            .sort({ createdAt: -1 }) // Sắp xếp theo thuộc tính createdAt giảm dần
            .limit(5) // Giới hạn lấy 5 bản ghi
            .populate({
                path: 'productIds',
                select: 'title',
            })
            .populate({
                path: 'userId',
                model: 'User',
                select: 'name',
            });

        const totalComment = await ReviewSchema.countDocuments({ productIds: { $in: [id] } });
        res.status(200).json({
            resultCode: 0,
            product,
            commentList,
            totalComment,
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Không tìm thấy sản phẩm này ',
        });
    }
});

//Get product - Admin
router.post('/getproductadmin', async (req, res) => {
    const id = req.body.id;

    try {
        const product = await Product.findById(id);

        const catInfo = await CategoryInfo.find({ categoryName: product.categories });
        res.status(200).json({
            resultCode: 0,
            product,
            catInfo,
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Không tìm thấy sản phẩm này ',
        });
    }
});

//Get product
router.get('/', async (req, res) => {
    const qNew = req.query.new;
    const qCat = req.query.cat;
    const qTitle = new RegExp(req.query.title, 'i');

    try {
        let products;
        if (qNew) {
            products = await Product.find().sort({ createdAt: -1 }).limit(8);
        } else if (qCat) {
            products = await Product.find({
                categories: {
                    $in: [qCat],
                },
            });
        } else if (qTitle) {
            products = await Product.find({ title: qTitle });
        } else {
            products = await Product.find();
        }

        res.status(200).json(products);
    } catch (err) {
        res.status(200).json(err);
    }
});

router.post('/getinithomeproduct', async (req, res) => {
    try {
        const productlist = await Product.find()
            .sort({ soldCount: -1 }) // Sắp xếp theo soldCount giảm dần
            .limit(8);

        const bestReviewList = await Product.find()
            .sort({ reviewPoint: -1 }) // Sắp xếp theo soldCount giảm dần
            .limit(4);

        const bestlaptopList = await Product.find({ categories: 'Laptop' })
            .sort({ soldCount: -1 }) // Sắp xếp theo soldCount giảm dần
            .limit(4);

        res.status(200).json({
            resultCode: 0,
            productlist,
            bestReviewList,
            bestlaptopList,
        });
    } catch (err) {
        console.log(err);
        res.status(200).json({ resultCode: 1, message: 'Lỗi Sever' });
    }
});

router.post('/addquantity', verifyTokenAndAdmin, async (req, res) => {
    const id = req.body.id;
    const quantity = req.body.quantity;

    try {
        const product = await Product.findById(id);
        const newInStock = product.inStock + quantity;

        const ImportInfo = {
            productId: id,
            oldInStock: product.inStock,
            newProductQuantity: quantity,
            newInStock: newInStock,
        };
        const newImport = new ImportProduct(ImportInfo);

        const newImportOrder = await newImport.save();
        const newProduct = await Product.findByIdAndUpdate(
            id,
            {
                $set: {
                    inStock: newInStock,
                    lastImportId: newImportOrder._id,
                },
            },
            { new: true },
        );
        res.status(200).json({ resultCode: 0, message: 'Nhập Hàng Thành Công' });
    } catch (err) {
        res.status(200).json({ resultCode: 1, message: 'Lỗi Sever' });
    }
});

router.post('/search', async (req, res) => {
    try {
        const pageIndex = req.body.pageIndex;
        const itemsPerPage = req.body.itemsPerPage;
        const { cat, priceFrom, priceTo, reqBrand, stock } = req.body.condition;
        const text = req.body.text;

        const skipCount = (pageIndex - 1) * itemsPerPage;
        let query;
        let countQuery;
        let sortOptions;

        if (text?.length > 0) {
            let searchTerms = text.split('%20');
            if (searchTerms.length === 1) {
                // If no splits occurred using "%20", try splitting using a space
                searchTerms = text.split(' ');
            }
            let strKeyword = searchTerms.join(' ');

            query = {
                $and: [
                    {
                        ...(cat && cat.length > 0 && { categories: { $in: cat } }),
                        ...(reqBrand && reqBrand.length > 0 && { brand: reqBrand }),
                        ...(stock === 'in' && { inStock: { $ne: 0 } }),
                        ...(stock === 'out' && { inStock: 0 }),
                        ...(priceFrom && { price: { $gte: priceFrom } }),
                        ...(priceTo && { price: { $lte: priceTo } }),
                        $text: {
                            $search: strKeyword,
                        },
                    },
                ],
            };

            countQuery = {
                $and: [
                    {
                        ...(cat && cat.length > 0 && { categories: { $in: cat } }),
                        ...(reqBrand && reqBrand.length > 0 && { brand: reqBrand }),
                        ...(stock === 'in' && { inStock: { $ne: 0 } }),
                        ...(stock === 'out' && { inStock: 0 }),
                        ...(priceFrom && { price: { $gte: priceFrom } }),
                        ...(priceTo && { price: { $lte: priceTo } }),
                        $text: {
                            $search: strKeyword,
                        },
                    },
                    // { $and: textSearchExpressions },
                ],
            };
        } else {
            query = {
                $and: [
                    {
                        ...(cat && cat.length > 0 && { categories: { $in: cat } }),
                        ...(stock === 'in' && { inStock: { $ne: 0 } }),
                        ...(stock === 'out' && { inStock: 0 }),
                        ...(reqBrand && reqBrand.length > 0 && { brand: reqBrand }),
                        ...(priceFrom && { price: { $gte: priceFrom } }),
                        ...(priceTo && { price: { $lte: priceTo } }),
                    },
                ],
            };

            countQuery = {
                $and: [
                    {
                        ...(cat && cat.length > 0 && { categories: { $in: cat } }),
                        ...(stock === 'in' && { inStock: { $ne: 0 } }),
                        ...(stock === 'out' && { inStock: 0 }),
                        ...(reqBrand && reqBrand.length > 0 && { brand: reqBrand }),
                        ...(priceFrom && { price: { $gte: priceFrom } }),
                        ...(priceTo && { price: { $lte: priceTo } }),
                    },
                ],
            };
        }

        if (req.body.sortBy) {
            switch (req.body.sortBy) {
                case 'point':
                    {
                        sortOptions = { reviewPoint: -1 };
                    }
                    break;
                case 'soldNumber':
                    {
                        sortOptions = { soldCount: -1 };
                    }
                    break;
                case 'reviewCount':
                    {
                        sortOptions = { reviewCount: -1 };
                    }
                    break;
                case 'newest':
                    {
                        sortOptions = { createdAt: -1 };
                    }
                    break;
                case 'oldest': {
                    sortOptions = { createdAt: 1 };
                }
            }
        } else {
            sortOptions = { reviewPoint: -1 };
        }

        const ProductList = Product.find(query).sort(sortOptions).skip(skipCount).limit(itemsPerPage);
        const CountProduct = Product.countDocuments(countQuery);

        const [products, totalCount] = await Promise.all([ProductList, CountProduct]);
        res.status(200).json({
            resultCode: 0,
            total: totalCount,
            products,
        });
    } catch (err) {
        console.log(err);
        res.status(200).json({ resultCode: 1, message: 'An error occurred' });
    }
});

module.exports = router;
