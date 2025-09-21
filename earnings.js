const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Start ads - returns current todayEarnings and todayWatchTime
router.post('/start', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if it's a new day and reset if needed
    const now = new Date();
    const lastDate = user.lastEarningDate;
    if (lastDate.getDate() !== now.getDate() || lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear()) {
      user.todayEarnings = 0;
      user.todayWatchTime = 0;
      user.lastEarningDate = now;
      await user.save();
    }

    res.json({
      todayEarnings: user.todayEarnings,
      todayWatchTime: user.todayWatchTime,
      totalEarnings: user.totalEarnings,
      totalWatchTime: user.totalWatchTime
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update earnings and watch time
router.post('/update', auth, async (req, res) => {
  const { elapsedTime } = req.body; // in seconds

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if it's a new day and reset if needed (same as above)
    const now = new Date();
    const lastDate = user.lastEarningDate;
    if (lastDate.getDate() !== now.getDate() || lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear()) {
      user.todayEarnings = 0;
      user.todayWatchTime = 0;
      user.lastEarningDate = now;
    }

    // Calculate additional earnings without exceeding the daily cap
    const potentialEarnings = elapsedTime / 300; // since 300 seconds = 1 rupee
    const remainingDailyCap = 1.0 - user.todayEarnings;
    const additionalEarnings = Math.min(potentialEarnings, remainingDailyCap);

    // Update user
    user.todayEarnings += additionalEarnings;
    user.totalEarnings += additionalEarnings;
    user.todayWatchTime += elapsedTime;
    user.totalWatchTime += elapsedTime;
    await user.save();

    res.json({
      todayEarnings: user.todayEarnings,
      todayWatchTime: user.todayWatchTime,
      totalEarnings: user.totalEarnings,
      totalWatchTime: user.totalWatchTime
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Stop ads - same as update for now, but we might want to do something else in the future
router.post('/stop', auth, async (req, res) => {
  // We'll handle the same as update
  // ... same code as update
});

module.exports = router;