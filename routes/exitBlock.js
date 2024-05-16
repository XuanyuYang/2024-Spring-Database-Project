const express = require('express');
const router = express.Router();

// POST /api/exitblock
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { userID } = req.body;

        // 判断是否在block中
        const query = {
            text: 'SELECT * FROM UserBlock WHERE userID = $1',
            values: [userID],
        };
        const result = await pool.query(query);
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'You are not a member of any block.' });
        }

        // 删除tuple
        const deleteQuery = {
            text: 'DELETE FROM UserBlock WHERE userID = $1',
            values: [userID],
        };
        await pool.query(deleteQuery);

        res.json({ success: true, message: 'Removed from block successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;