const express = require('express');
const router = express.Router();

// POST /api/addMessage
router.post('/', async (req, res) => {
    try {
        const pool = require('../app').pool;
        const { userID } = req.body;

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;