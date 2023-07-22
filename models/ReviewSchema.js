const mongoose = require('mongoose');
const ReviewSchema = new mongoose.Schema(
    {
        userId: { type: String, ref: 'User', required: true },
        orderId: { type: String, ref: 'Order', required: true },
        review: { type: String, required: true },
        star: { type: Number, required: true },
        productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    },
    { timestamps: true },
);

ReviewSchema.index({ productIds: 1 });
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ orderId: 1 });
module.exports = mongoose.model('Review', ReviewSchema, 'Review');
