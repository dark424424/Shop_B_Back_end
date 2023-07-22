const mongoose = require('mongoose');
const InfoSchema = new mongoose.Schema({
    name: { type: String, required: true },
    value: { type: String },
});

const ProductSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        desc: { type: String, required: true },
        img: { type: String, required: true },
        categories: { type: String, required: true },
        brand: { type: String, required: true },
        price: { type: Number, required: true },
        inStock: { type: Number, default: 1 },
        info: { type: [String] },
        techInfo: [
            {
                title: { type: String, required: true },
                info: [
                    {
                        name: { type: String, required: true },
                        value: { type: String },
                    },
                ],
            },
        ],
        soldCount: { type: Number, required: true, default: 0 },
        reviewCount: { type: Number, required: true, default: 0 },
        reviewPoint: { type: Number, required: true, default: 0 },
        lastImportId: { type: String, ref: 'ImportOrder', required: false, default: '' },
    },
    { timestamps: true },
);

ProductSchema.index({ title: 'text' });
ProductSchema.index({ desc: 'text' });
ProductSchema.index({ categories: 1, brand: 1 });
module.exports = mongoose.model('Product', ProductSchema, 'Product');
