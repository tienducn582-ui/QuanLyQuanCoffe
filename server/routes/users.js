const express = require('express');
const router = express.Router();

// Router khung cho /api/users (TV2 phụ trách)
router.get('/', (req, res) => {
  res.json({ success: true, data: [] });
});

module.exports = router;
