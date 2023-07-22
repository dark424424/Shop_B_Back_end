const router = require('express').Router();
const User = require('../models/User');
const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');

//REGISTER
router.post('/register', async (req, res) => {
    const username = req.body.username;
    const email = req.body.email;

    // Kiểm tra xem username đã tồn tại hay chưa
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
        return res.status(200).json({ resultCode: 1, message: 'Tài Khoản Đã Tồn Tại' });
    }

    // Kiểm tra xem email đã tồn tại hay chưa
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
        return res.status(200).json({ resultCode: 1, message: 'Email đã được sử dụng bởi một tài khoản khác' });
    }

    const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        name: req.body.username,
        password: CryptoJS.AES.encrypt(req.body.password, process.env.PASS_SEC).toString(),
    });

    try {
        const savedUser = await newUser.save();
        res.status(201).json({ resultCode: 0, savedUser });
    } catch (err) {
        res.status(201).json({ resultCode: 1, message: 'Lỗi server' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({
            username: req.body.username,
        });
        if (!user) {
            res.status(200).json({ resultCode: 1, message: 'Không tồn tại tài khoản này !!! ' });
            return;
        }
        if (user.isDisable) {
            res.status(200).json({ resultCode: 1, message: 'Tài Khoản của bạn đã bị khóa !!' });
            return;
        }
        const hashedPassword = CryptoJS.AES.decrypt(user.password, process.env.PASS_SEC);
        const OriginalPassword = hashedPassword.toString(CryptoJS.enc.Utf8);

        if (OriginalPassword != req.body.password) {
            res.status(200).json({ resultCode: 1, message: 'Vui lòng kiểm tra lại tài khoản và mật khẩu !!! ' });
            return;
        }

        const accessToken = jwt.sign(
            {
                id: user._id,
                isShipper: user.isShipper,
                isAdmin: user.isAdmin,
            },
            process.env.JWT_SEC,

            {
                expiresIn: '1d',
            },
        );

        const { password, ...others } = user._doc;

        res.status(200).json({ resultCode: 0, user: others, accessToken });
    } catch (err) {
        res.status(200).json({ resultCode: 1, message: 'Xảy ra lỗi ở khi đăng nhập !!!' });
    }
});

router.post('/loginadmin', async (req, res) => {
    try {
        const user = await User.findOne({
            username: req.body.username,
        });
        if (!user) {
            return res.status(200).json({ resultCode: 1, message: 'Wrong credentials' });
        }

        const hashedPassword = CryptoJS.AES.decrypt(user.password, process.env.PASS_SEC);
        const OriginalPassword = hashedPassword.toString(CryptoJS.enc.Utf8);
        if (OriginalPassword != req.body.password) {
            res.status(200).json({ resultCode: 1, message: 'Vui lòng kiểm tra lại tài khoản và mật khẩu !!! ' });
            return;
        }

        if (user.isAdmin) {
            const accessToken = jwt.sign(
                {
                    id: user._id,
                    isAdmin: user.isAdmin,
                },
                process.env.JWT_SEC,

                {
                    expiresIn: '1d',
                },
            );

            const { password, ...others } = user._doc;

            res.status(200).json({ resultCode: 0, user: others, accessToken });
        } else {
            return res.status(200).json({ resultCode: 1, message: 'You are not Admin!' });
        }
    } catch (err) {
        return res.status(200).json({ resultCode: 1, message: 'Xảy ra lỗi khi đăng nhập' });
    }
});

router.post('/update', async (req, res) => {
    try {
        const email = req.body.email;
        const userId = req.body.userId;

        // Kiểm tra xem email đã tồn tại hay chưa
        const existingEmail = await User.findOne({ email });
        if (existingEmail && existingEmail._id.toString() !== userId) {
            return res.status(200).json({ resultCode: 1, message: 'Email đã được sử dụng bởi một tài khoản khác' });
        }
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: req.body,
            },
            { new: true },
        );
        const { password, ...others } = updatedUser._doc;

        res.status(200).json({
            resultCode: 0,
            user: others,
            message: 'Thay đổi thông tin tài khoản thành công',
        });
    } catch (err) {
        res.status(200).json({
            resultCode: 1,
            message: 'Chỉnh sửa thất bại',
        });
    }
});
module.exports = router;
