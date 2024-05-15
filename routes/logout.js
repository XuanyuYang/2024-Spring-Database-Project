const express = require('express');
const router = express.Router();

// POST /api/logout
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { userId, lastLogin } = req.body;

        const checkQuery = {
            text: 'SELECT * FROM LastLogin WHERE userID = $1',
            values: [userId],
        };
        const checkResult = await pool.query(checkQuery);

        if (checkResult.rows.length > 0) {
            // 更新记录
            const updateQuery = {
                text: 'UPDATE LastLogin SET loginTime = $1 WHERE userID = $2',
                values: [lastLogin, userId],
            };
            await pool.query(updateQuery);
        } else {
            // 或创建记录
            const insertQuery = {
                text: 'INSERT INTO LastLogin (userID, loginTime) VALUES ($1, $2)',
                values: [userId, lastLogin],
            };
            await pool.query(insertQuery);
        }

        res.json({ success: true, message: 'Last login updated successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;