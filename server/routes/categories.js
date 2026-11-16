const express = require('express');
const router = express.Router();

// Router khung cho /api/categories (TV3 phụ trách)
router.get('/', (req, res) => {
  res.json({ success: true, data: [] });
});

module.exports = router;
