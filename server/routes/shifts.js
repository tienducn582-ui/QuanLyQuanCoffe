const express = require('express');
const router = express.Router();

// Router khung cho /api/shifts (TV1 phụ trách)
router.get('/', (req, res) => {
  res.json({ success: true, data: [] });
});

module.exports = router;
