const mongoose = require('mongoose');

const SoldItemSchema = new mongoose.Schema(
    {
        productId: { type: String, ref: 'Product', required: true },
        userId: { type: String, ref: 'User', required: true },
        singlePrice: { type: String },
        category: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
    },
    { timestamps: true },
);
SoldItemSchema.index({ category: 1 });
SoldItemSchema.index({ productId: 1 });
SoldItemSchema.index({ userId: 1 });
module.exports = mongoose.model('SoldItem', SoldItemSchema, 'SoldItem');
