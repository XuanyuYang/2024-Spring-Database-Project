const express = require('express');
const router = express.Router();

// POST /api/addneighbor
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { userID, neighborname } = req.body;

        // console.log("get data: " + userID + " " + neighborname);
        // console.log("type is: " + (typeof userID) + " " + (typeof neighborname));

        // 查询neighborID
        const userQuery = {
            text: 'SELECT userID FROM Users WHERE name = $1',
            values: [neighborname],
        };
        const userResult = await pool.query(userQuery);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'The neighbor you want to add does not exist.' });
        }
        const neighborID = userResult.rows[0].userid;

        // 是否已经添加了该邻居
        const checkQuery = {
            text: 'SELECT * FROM Neighbors WHERE userID = $1 AND neighborID = $2',
            values: [userID, neighborID],
        };
        const checkResult = await pool.query(checkQuery);
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'You have already added this neighbor.' });
        }

        // 获取对应 blockID
        const userBlockQuery = {
            text: 'SELECT blockID FROM UserBlock WHERE userID = $1',
            values: [userID],
        };
        const userBlockResult = await pool.query(userBlockQuery);
        if (userBlockResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'You are not member of a block.' });
        }
        const userBlockID = userBlockResult.rows[0].blockid;

        const neighborBlockQuery = {
            text: 'SELECT blockID FROM UserBlock WHERE userID = $1',
            values: [neighborID],
        };
        const neighborBlockResult = await pool.query(neighborBlockQuery);
        if (neighborBlockResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'The neighbor is not a member of a block.' });
        }
        const neighborBlockID = neighborBlockResult.rows[0].blockid;

        if (userBlockID === neighborBlockID) {
            // 插入新数据
            const insertQuery = {
                text: 'INSERT INTO Neighbors (userID, neighborID) VALUES ($1, $2)',
                values: [userID, neighborID],
            };
            await pool.query(insertQuery);

            return res.status(200).json({ success: true, message: 'Neighbor added successfully.' });
        }

        return res.status(400).json({ success: false, message: 'You are not in the same block.' });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;