const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
    city: { type: String, required: true },
    address: { type: String, required: true },
});

const OrderSchema = new mongoose.Schema(
    {
        userId: { type: String, ref: 'User', required: true },
        products: [
            {
                productId: { type: String, ref: 'Product', required: true },
                quantity: { type: Number, default: 1, required: true },
                singlePrice: { type: Number, required: true },
                totalPrice: { type: Number, required: true },
            },
        ],
        amount: { type: Number, required: true },
        address: {
            type: AddressSchema,
            required: true,
        },
        status: { type: String, enum: ['Open', 'Inprogress', 'Done', 'Cancelled'], default: 'Open' },
        consignee: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        note: { type: String },
        isReview: { type: Boolean, default: false },
        evidence: { type: String },
        cancelReason: { type: String },
    },
    { timestamps: true },
);

OrderSchema.index({ userId: 1 });
module.exports = mongoose.model('Order', OrderSchema, 'Order');
