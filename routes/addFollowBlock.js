const express = require('express');
const router = express.Router();

// POST /api/addfollowblock
router.post('/', async (req, res) => {
    try {
        const pool = require('../app').pool;
        const { userID, blockIDs } = req.body;

        // 检查合法性
        for (const blockID of blockIDs) {
            // 获取当前block name
            const blockQuery = {
                text: 'SELECT blockName FROM Blocks WHERE blockID = $1',
                values: [blockID],
            };
            const blockResult = await pool.query(blockQuery);
            const blockName = blockResult.rows[0].blockname;

            const userBlockQuery = {
                text: 'SELECT * FROM UserBlock WHERE userID = $1 AND blockID = $2',
                values: [userID, blockID],
            };
            const userBlockResult = await pool.query(userBlockQuery);
            if (userBlockResult.rows.length > 0) {
                return res.status(400).json({ success: false, message: 'Cannot follow your own block: ' + blockName });
            }

            const userFollowQuery = {
                text: 'SELECT * FROM UserFollow WHERE userID = $1 AND blockID = $2',
                values: [userID, blockID],
            };
            const userFollowResult = await pool.query(userFollowQuery);
            if (userFollowResult.rows.length > 0) {
                return res.status(400).json({ success: false, message: 'Already following this bloc: ' + blockName });
            }
        }

        // 添加
        for (const blockID of blockIDs) {
            const insertQuery = {
                text: 'INSERT INTO UserFollow (userID, blockID) VALUES ($1, $2)',
                values: [userID, blockID],
            };
            await pool.query(insertQuery);
        }

        return res.json({ success: true, message: 'Successfully followed the block.' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;