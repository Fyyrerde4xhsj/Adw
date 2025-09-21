const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const nodemailer = require('nodemailer');

const router = express.Router();

// Submit withdrawal request
router.post('/', auth, async (req, res) => {
  const { upiId, amount } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check withdrawal conditions
    if (user.totalWatchTime < 300) {
      return res.status(400).json({ msg: 'You need to watch ads for at least 5 minutes to qualify for withdrawal' });
    }

    if (amount < 5 || amount > 10) {
      return res.status(400).json({ msg: 'Withdrawal amount must be between ₹5 and ₹10' });
    }

    if (user.totalEarnings < amount) {
      return res.status(400).json({ msg: 'Insufficient earnings' });
    }

    // Create withdrawal record
    const withdrawal = new Withdrawal({
      userId: req.user.id,
      upiId,
      amount,
      status: 'pending'
    });
    await withdrawal.save();

    // Deduct the amount from user's totalEarnings
    user.totalEarnings -= amount;
    await user.save();

    // Send email
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: 'ankurboro236@gmail.com',
      subject: 'Withdrawal Request',
      html: `
        <p>Username: ${user.username}</p>
        <p>UPI ID: ${upiId}</p>
        <p>Amount: ₹${amount}</p>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    res.json({ msg: 'Withdrawal request submitted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get withdrawal history
router.get('/history', auth, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(withdrawals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;