const mongoose = require('mongoose');

const CategoryInfoSchema = new mongoose.Schema(
    {
        categoryName: { type: String, required: true, unique: true },
        listTechInfo: [
            {
                title: { type: String, required: true },
                info: { type: [String] },
            },
        ],
    },
    { timestamps: true },
);

// ProductSchema.index({ name: 'text' });
// ProductSchema.index({ categories: 1, brand: 1 });
module.exports = mongoose.model('CategoryInfo', CategoryInfoSchema, 'CategoryInfo');
