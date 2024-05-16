const express = require('express');
const router = express.Router();

// POST /api/updateprofile
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { userID, name, password, userAddress, homeLocation, userProfile, userPhoto } = req.body;

        // console.log(req.body);

        if (!name || !password) {
            return res.status(400).json({ success: false, message: 'Name and password are required' });
        }

        // 检查username
        // 获取原来的name
        const getnameQuery = {
            text: 'SELECT name FROM Users WHERE userID = $1',
            values: [userID],
        };
        const getnameResult = await pool.query(getnameQuery);
        const oriName = getnameResult.rows[0].name;

        // 改了name则需要检查重复
        if (name !== oriName) {
            const checkQuery = {
                text: 'SELECT * FROM Users WHERE name = $1',
                values: [name],
            };
            const checkResult = await pool.query(checkQuery);
            if (checkResult.rows.length !== 0) {
                return res.status(400).json({ success: false, message: 'Username already exists' });
            }
        }

        // 更新信息
        const pointText = homeLocation ? `POINT(${homeLocation.lng}, ${homeLocation.lat})` : null;
        const updateQuery = {
            text: 'UPDATE Users SET name = $1, password = $2, userAddress = $3, homeLocation = $4, userProfile = $5, userPhoto = $6 WHERE userID = $7',
            values: [name, password, userAddress, pointText, userProfile, userPhoto, userID],
        };
        await pool.query(updateQuery);

        // 检查block
        // 查询当前所属block
        const userBlockQuery = {
            text: 'SELECT blockID FROM UserBlock WHERE userID = $1',
            values: [userID],
        };
        const userBlockResult = await pool.query(userBlockQuery);
        if (userBlockResult.rows.length === 0) {
            // 不属于block，不需要更新
            return res.json({ success: true, message: 'User information updated successfully' });
        }
        const oriBlockID = userBlockResult.rows[0].blockid;

        // 查询应当属于的block
        let newBlockID = [];
        if (pointText !== null) {
            const blockQuery = {
                text: 'SELECT blockID FROM Blocks WHERE ST_DWithin(geometry(blockCenter), $1, blockRadius)',
                values: ['geometry(pointText)'],
            };
            const blockResult = await pool.query(blockQuery);
            newBlockID = blockResult.rows.map(row => row.blockID);
        }

        // 如果没有符合要求的结果，或pointText为null，或原来的block不在新地址范围内，则移除原来的block归属
        if (newBlockID.length === 0 || pointText === null || !newBlockID.includes(oriBlockID)) {
            const deleteQuery = {
                text: 'DELETE FROM UserBlock WHERE userID = $1 AND blockID = $2',
                values: [userID, oriBlockID],
            };
            await pool.query(deleteQuery);
        }

        res.json({ success: true, message: 'User information updated successfully. User is removed from original block.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;