const express = require('express');
const router = express.Router();

// POST /api/processfriendapplication
router.post('/', async (req, res) => {
    try {
        const pool = require('../app').pool;
        const { userID, fAppID, decision } = req.body;

        // 获取对应申请
        const query = {
            text: 'SELECT * FROM FriendApplication WHERE fAppID = $1',
            values: [fAppID],
        };
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Friend application not found' });
        }

        // 更新 decision
        const updateQuery = {
            text: 'UPDATE FriendApplication SET fAppStatus = $1 WHERE fAppID = $2',
            values: [decision, fAppID],
        };
        await pool.query(updateQuery);

        // 如果 approved，添加好友
        if (decision === 'approved') {
            const { fromid, toid } = result.rows[0];
            const insertQuery = {
                text: 'INSERT INTO Friends (userID, friendID) VALUES ($1, $2), ($2, $1)',
                values: [fromid, toid],
            };
            await pool.query(insertQuery);
        }

        return res.status(200).json({ success: true, message: 'Friend application processed successfully.' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;