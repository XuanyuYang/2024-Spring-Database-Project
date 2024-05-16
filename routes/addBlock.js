const express = require('express');
const router = express.Router();

// POST /api/addblock
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { userId, timestamp } = req.body;
        console.log('Received parameters: userId:', userId, 'timestamp:', timestamp);

        const userLocationQuery = {
            text: 'SELECT ST_X(geometry(homeLocation)) AS longitude, ST_Y(geometry(homeLocation)) AS latitude FROM Users WHERE userID = $1',
            values: [userId],
        };
        const userLocationResult = await pool.query(userLocationQuery);
        const longitude = userLocationResult.rows[0].longitude;
        const latitude = userLocationResult.rows[0].latitude;

        // 查询符合条件的 blockID
        const pointText = `geometry(POINT(${longitude}, ${latitude}))`;
        const blockQuery = {
            text: 'SELECT blockID FROM Blocks WHERE ST_DWithin(geometry(blockCenter), ' + pointText + ', blockRadius) LIMIT 1',
        };
        const blockResult = await pool.query(blockQuery);

        if (blockResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No matching blocks.' });
        }

        const blockID = blockResult.rows[0].blockid;

        // 检查用户是否已经在block中
        const userBlockQuery = {
            text: 'SELECT COUNT(*) FROM UserBlock WHERE userID = $1 AND blockID = $2',
            values: [userId, blockID],
        };
        const userBlockResult = await pool.query(userBlockQuery);
        const userBlockCount = parseInt(userBlockResult.rows[0].count);

        if (userBlockCount > 0) {
            return res.status(400).json({ success: false, message: 'User is already a member of this block' });
        } else {
            // 将原有的申请全部终止，设置为rejected
            const updateQuery = {
                text: 'UPDATE BlockApplication SET bAppStatus = $1 WHERE fromID = $2 AND toBlockID = $3 AND bAppStatus = $4',
                values: ['rejected', userId, blockID, 'pending'],
            };
            await pool.query(updateQuery);

            // 计算当前block的成员数量
            const cntBlockQuery = {
                text: 'SELECT COUNT(*) FROM UserBlock WHERE blockID = $1',
                values: [blockID],
            };
            const cntBlockResult = await pool.query(cntBlockQuery);
            const blockMember = parseInt(cntBlockResult.rows[0].count);
            if (blockMember > 0) {
                // 有成员，插入新的 block 申请
                const insertQuery = {
                    text: 'INSERT INTO BlockApplication (fromID, toBlockID, bAppCreateTime, bAppStatus) VALUES ($1, $2, $3, $4)',
                    values: [userId, blockID, timestamp, 'pending'],
                };
                await pool.query(insertQuery);
                res.json({ success: true, message: 'Block application created successfully.' });
            } else {
                // 没有成员，则直接通过
                const insertQuery = {
                    text: 'INSERT INTO BlockApplication (fromID, toBlockID, bAppCreateTime, bAppStatus) VALUES ($1, $2, $3, $4)',
                    values: [userId, blockID, timestamp, 'approved'],
                };
                const userBlockInsertQuery = {
                    text: 'INSERT INTO UserBlock (userID, blockID) VALUES ($1, $2)',
                    values: [userId, blockID],
                };
                await Promise.all([
                    pool.query(insertQuery),
                    pool.query(userBlockInsertQuery),
                ]);

                // 如果之前follow了该block，那么移除follow
                const removeFollowQuery = {
                    text: 'DELETE FROM UserFollow WHERE userID = $1 AND blockID = $2',
                    values: [userId, blockID],
                };
                await pool.query(removeFollowQuery);

                res.json({ success: true, message: 'Joined Block.' });
            }
        }

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;