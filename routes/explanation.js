const express = require('express');
const router = express.Router();
const BnsSection = require('../models/bns_sec'); // your mongoose model

router.get('/:section', async (req, res) => {
  try {
    const sec = req.params.section;

    const result = await BnsSection.findOne({ section: sec });

    if (!result) {
      return res.status(404).json({ error: 'Section not found in DB' });
    }

    res.json(result); // or render an EJS page if frontend is served
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
