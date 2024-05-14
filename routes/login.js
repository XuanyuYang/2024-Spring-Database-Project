const express = require('express');
const router = express.Router();

// POST /api/login
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { username, password1 } = req.body;

        const query = {
            text: 'SELECT userID FROM Users WHERE name = $1 AND password = $2',
            values: [username, password1],
        };
        const result = await pool.query(query);

        if (result.rows.length > 0) {
            const userId = result.rows[0].userID;
            res.json({ success: true, userId, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;