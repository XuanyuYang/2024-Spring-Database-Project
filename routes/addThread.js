const express = require('express');
const router = express.Router();

// POST /api/addthread
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { tType, tCreatorID, tCreateTime, tReceiverID, mTitle, mLocation, textBody } = req.body;
        console.log(req.body);

        if (tType === "System") {
            return res.status(501).json({ success: false, message: 'System message not implemented yet' });
        }
        if (tType !== "SingleFriend" && tType !== "SingleNeighbor" && tType !== "Friends" && tType !== "Neighbors"
            && tType !== "Block" && tType !== "Hood") {
            res.status(400).json({ success: false, message: 'Invalid thread type: ' + tType });
        }

        let targetBlockID;
        let targetBlockIDs;
        // 如果向block和hood发信息，需要先检查是否已经加入block，然后获取可行的blockID列表
        if (tType === "Block") {
            const userBlockQuery = {
                text: 'SELECT blockID FROM UserBlock WHERE userID = $1',
                values: [tCreatorID],
            };
            const userBlockResult = await pool.query(userBlockQuery);
            if (userBlockResult.rows.length === 0) {
                return res.status(400).json({ success: false, message: 'Not a member of any block.' });
            }
            targetBlockID = userBlockResult.rows[0].blockid;
        } else if (tType === "Hood") {
            // 获取hoodID
            const userHoodQuery = {
                text: `SELECT hoodID FROM UserBlock JOIN Blocks ON UserBlock.blockID = Blocks.blockID WHERE userID = $1`,
                values: [tCreatorID],
            };
            const userHoodResult = await pool.query(userHoodQuery);
            if (userHoodResult.rows.length === 0) {
                return res.status(400).json({ success: false, message: 'Not a member of any hood.' });
            }
            const targetHoodID = userHoodResult.rows[0].hoodid;
            // 获取该hood的blockIDs
            const hoodBlockQuery = {
                text: `SELECT blockID FROM Blocks WHERE hoodID = $1`,
                values: [targetHoodID],
            };
            const hoodBlockResult = await pool.query(hoodBlockQuery);
            targetBlockIDs = hoodBlockResult.rows.map(row => row.blockid);
        }

        // 新建Thread，并获得该thread的threadID
        const insertThreadQuery = {
            text: `INSERT INTO Threads (tType, tCreatorID, tCreateTime, tReceiverID)
                   VALUES ($1, $2, $3, $4)
                   RETURNING threadID`,
            values: [tType, tCreatorID, tCreateTime, tReceiverID],
        };
        const insertThreadResult = await pool.query(insertThreadQuery);
        const threadID = insertThreadResult.rows[0].threadid;

        // 新建Message，并获得该message的messageID
        const pointText = `POINT(${mLocation.lng}, ${mLocation.lat})`;
        const insertMessageQuery = {
            text: 'INSERT INTO Messages (threadID, mTitle, mCreateTime, mCreatorID, mLocation, textBody) ' +
                   'VALUES ($1, $2, $3, $4, ' + pointText + ', $5) ' +
                   'RETURNING messageID',
            values: [threadID, mTitle, tCreateTime, tCreatorID, textBody],
        };
        const insertMessageResult = await pool.query(insertMessageQuery);
        const messageID = insertMessageResult.rows[0].messageid;

        // 记录发布者的message权限
        const insertQuery = {
            text: 'INSERT INTO Authenticity (messageID, userID, type) VALUES ($1, $2, $3)',
            values: [messageID, tCreatorID, 'reply'],
        };
        await pool.query(insertQuery);

        // 记录接收者的message权限
        switch (tType) {
            case "SingleFriend":
                const sf = {
                    text: 'INSERT INTO Authenticity (messageID, userID, type) VALUES ($1, $2, $3)',
                    values: [messageID, tReceiverID, 'reply'],
                };
                await pool.query(sf);
                break;
            case "SingleNeighbor":
                const sn = {
                    text: 'INSERT INTO Authenticity (messageID, userID, type) VALUES ($1, $2, $3)',
                    values: [messageID, tReceiverID, 'reply'],
                };
                await pool.query(sn);
                break;
            case "Friends":
                // 获取所有friendID
                const getFriendsQuery = {
                    text: 'SELECT friendID FROM Friends WHERE userID = $1',
                    values: [tCreatorID],
                };
                const friendResult = await pool.query(getFriendsQuery);
                const friendIDs = friendResult.rows.map(row => row.friendid);
                // 设置权限
                const f = friendIDs.map(friendID => ({
                    text: 'INSERT INTO Authenticity (messageID, userID, type) VALUES ($1, $2, $3)',
                    values: [messageID, friendID, 'reply'],
                }));
                await Promise.all(f.map(f => pool.query(f)));
                break;
            case "Neighbors":
                const getNeighborsQuery = {
                    text: 'SELECT neighborID FROM Neighbors WHERE userID = $1',
                    values: [tCreatorID],
                };
                const neighborResult = await pool.query(getNeighborsQuery);
                const neighborIDs = neighborResult.rows.map(row => row.neighborid);
                // 设置权限
                const n = neighborIDs.map(neighborID => ({
                    text: 'INSERT INTO Authenticity (messageID, userID, type) VALUES ($1, $2, $3)',
                    values: [messageID, neighborID, 'reply'],
                }));
                await Promise.all(n.map(n => pool.query(n)));
                break;
            case "Block":
                // 设置可写信息权限
                const writeQuery = {
                    text: `SELECT userID FROM UserBlock WHERE blockID = $1 AND userID != $2`,
                    values: [targetBlockID, tCreatorID],
                };
                const writeQueryResult = await pool.query(writeQuery);
                const writeIDs = writeQueryResult.rows.map(row => row.userid);
                const b1 = writeIDs.map(writeID => ({
                    text: 'INSERT INTO Authenticity (messageID, userID, type) VALUES ($1, $2, $3)',
                    values: [messageID, writeID, 'reply'],
                }));
                await Promise.all(b1.map(b1 => pool.query(b1)));
                // 设置可读信息权限
                const readQuery = {
                    text: `SELECT userID FROM UserFollow WHERE blockID = $1`,
                    values: [targetBlockID],
                };
                const readQueryResult = await pool.query(readQuery);
                const readIDs = readQueryResult.rows.map(row => row.userid);
                const b2 = readIDs.map(readID => ({
                    text: 'INSERT INTO Authenticity (messageID, userID, type) VALUES ($1, $2, $3)',
                    values: [messageID, readID, 'read'],
                }));
                await Promise.all(b2.map(b2 => pool.query(b2)));
                break;
            case "Hood":
                for (const tBlockID of targetBlockIDs) {
                    const wQuery = {
                        text: `SELECT userID FROM UserBlock WHERE blockID = $1 AND userID != $2`,
                        values: [tBlockID, tCreatorID],
                    };
                    const wResult = await pool.query(wQuery);
                    const wIDs = wResult.rows.map(row => row.userid);
                    const b2 = wIDs.map(wID => ({
                        text: 'INSERT INTO Authenticity (messageID, userID, type) VALUES ($1, $2, $3)',
                        values: [messageID, wID, 'reply'],
                    }));
                    await Promise.all(b2.map(b2 => pool.query(b2)));
                }
        }

        return res.json({ success: true, message: 'Thread and message created successfully.' });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;