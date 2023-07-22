const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        name: { type: String, required: true },
        isShipper: {
            type: Boolean,
            default: false,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        img: { type: String },
        phoneNumber: { type: String },
        location: {
            city: { type: String },
            address: { type: String },
        },
        isDisable: { type: Boolean, required: true, default: false },
        orderInfo: {
            createOrderCount: { type: Number, default: 0 },
            doneOrderCount: { type: Number, default: 0 },
            cancelByShopOrderCount: { type: Number, default: 0 },
            cancelByUserOrderCount: { type: Number, default: 0 },
        },
    },
    { timestamps: true },
);

UserSchema.index({ name: 'text' });
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
module.exports = mongoose.model('User', UserSchema, 'User');
