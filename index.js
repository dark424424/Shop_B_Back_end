const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
// const userRoute = require('./routes/user');
const authRoute = require('./routes/auth');
const productRoute = require('./routes/product');
const reviewRoute = require('./routes/review');
const orderRoute = require('./routes/order');
const categoryInfoRoute = require('./routes/category');
const recommendRoute = require('./routes/recommend');
const userRoute = require('./routes/user');

dotenv.config();

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log('connected'))
    .catch((err) => console.log(err));

app.use(express.json());

app.use(cors());
app.use('/api/auth', authRoute);
// app.use('/api/users', userRoute);
app.use('/api/products', productRoute);
app.use('/api/review', reviewRoute);
app.use('/api/orders', orderRoute);
app.use('/api/category', categoryInfoRoute);
app.use('/api/recommend', recommendRoute);
app.use('/api/user', userRoute);
app.listen(process.env.PORT || 5000, () => {
    console.log('running');
});
