const express = require('express');
const router = express.Router();

// POST /api/addfriend
router.post('/', async (req, res) => {
    try {
        const pool = require('../app').pool;
        const { userID, username, timestamp } = req.body;

        // 查询friendID
        const userQuery = {
            text: 'SELECT userID FROM Users WHERE name = $1',
            values: [username],
        };
        const userResult = await pool.query(userQuery);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'The friend you want to add does not exist.' });
        }
        const friendID = userResult.rows[0].userid;

        // 判断好友关系是否已经存在
        const checkFriendshipQuery = {
            text: 'SELECT * FROM Friends WHERE (userID = $1 AND friendID = $2) OR (userID = $2 AND friendID = $1)',
            values: [userID, friendID],
        };
        const friendshipResult = await pool.query(checkFriendshipQuery);

        if (friendshipResult.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'You are already friends with this user.' });
        }

        // 修改历史未通过申请
        const updateQuery = {
            text: 'UPDATE FriendApplication SET fAppStatus = $1 WHERE fromID = $2 AND toID = $3',
            values: ['rejected', userID, friendID],
        };
        await pool.query(updateQuery);

        // 插入新的申请
        const insertQuery = {
            text: 'INSERT INTO FriendApplication (fromID, toID, fAppCreateTime, fAppStatus) VALUES ($1, $2, $3, $4)',
            values: [userID, friendID, timestamp, 'pending'],
        };
        await pool.query(insertQuery);

        return res.status(200).json({ success: true, message: 'Friend request sent.' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;