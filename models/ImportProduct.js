const mongoose = require('mongoose');

const ImportSchema = new mongoose.Schema(
    {
        productId: { type: String, ref: 'Product', required: true },
        oldInStock: { type: Number, required: true },
        newInStock: { type: Number, required: true },
        newProductQuantity: { type: Number, required: true },
    },
    { timestamps: true },
);

module.exports = mongoose.model('ImportOrder', ImportSchema, 'ImportOrder');
