const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get user state (earnings, etc.)
router.get('/state', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
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

module.exports = router;