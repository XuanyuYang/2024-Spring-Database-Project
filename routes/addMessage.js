const express = require('express');
const router = express.Router();

// POST /api/addmessage
router.post('/', async (req, res) => {
    try {
        const pool = require('../app').pool;
        const { userID, threadID, mTitle, mCreateTime, mLocation, textBody } = req.body;

        // 获取当前thread的类型，和接收者（如有）
        const threadQuery = {
            text: 'SELECT tType, tCreatorID, tReceiverID FROM Threads WHERE threadID = $1',
            values: [threadID],
        };
        const threadResult = await pool.query(threadQuery);
        const tType = threadResult.rows[0].ttype;
        const tCreatorID = threadResult.rows[0].tcreatorid;
        const tReceiverID = threadResult.rows[0].treceiverid;

        // 检查当前用户的回复权限
        // 只需要检查block和hood thread类型的访问权限
        let replyUsers = [];
        let readUsers = [];
        if (tType === "Block" || tType === "Hood") {
            // 获取block列表，储存到targetBlockIDs
            let targetBlockIDs;
            if (tType === "Block") {
                const blockQuery = {
                    text: 'SELECT blockID FROM UserBlock WHERE userID = $1',
                    values: [tCreatorID],
                };
                const blockResult = await pool.query(blockQuery);
                targetBlockIDs = blockResult.rows.map(row => row.blockid);
            } else {
                // hoodID
                const hoodQuery = {
                    text: `SELECT hoodID FROM UserBlock JOIN Blocks ON UserBlock.blockID = Blocks.blockID WHERE userID = $1`,
                    values: [tCreatorID],
                };
                const hoodResult = await pool.query(hoodQuery);
                const hoodID = hoodResult.rows[0].hoodid;
                // 获取对应的blocks
                const bhQuery = {
                    text: `SELECT blockID FROM Blocks WHERE hoodID = $1`,
                    values: [hoodID],
                };
                const bhResult = await pool.query(bhQuery);
                targetBlockIDs = bhResult.rows.map(row => row.blockid);
            }
            // 获取BlockIDs对应的用户
            for (const tBlockID of targetBlockIDs) {
                const wQuery = {
                    text: `SELECT userID FROM UserBlock WHERE blockID = $1 AND userID != $2`,
                    values: [tBlockID, tCreatorID],
                };
                const wResult = await pool.query(wQuery);
                const wIDs = wResult.rows.map(row => row.userid);
                replyUsers = replyUsers.concat(wIDs);
                // 顺便获取可读列表
                if (tType === "Block") {
                    const rQuery = {
                        text: `SELECT userID FROM UserFollow WHERE blockID = $1`,
                        values: [tBlockID],
                    };
                    const rResult = await pool.query(rQuery);
                    const rIDs = rResult.rows.map(row => row.userid);
                    readUsers = readUsers.concat(rIDs);
                }
            }
            // 判断userID是否在其中
            if (userID !== tCreatorID && !replyUsers.includes(userID)) {
                return res.status(400).json({ success: false, message: 'The thread is read only.' });
            }
        }

        // 权限验证，消息可以创建
        // 新建Message，并获得messageID
        const pointText = mLocation ? `POINT(${mLocation.lng}, ${mLocation.lat})` : null;
        const insertMessageQuery = {
            text: 'INSERT INTO Messages (threadID, mTitle, mCreateTime, mCreatorID, mLocation, textBody) ' +
                'VALUES ($1, $2, $3, $4, ' + pointText + ', $5) ' +
                'RETURNING messageID',
            values: [threadID, mTitle, mCreateTime, userID, textBody],
        };
        const insertMessageResult = await pool.query(insertMessageQuery);
        const messageID = insertMessageResult.rows[0].messageid;

        // 总之thread的发布者一定有reply权限
        const insertQuery = {
            text: 'INSERT INTO Authenticity (messageID, userID, type) VALUES ($1, $2, $3)',
            values: [messageID, tCreatorID, 'reply'],
        };
        await pool.query(insertQuery);

        // 接收者权限
        // 能够发布者必然有该thread的reply权限，因此根据同样流程查一遍即可
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
                // reply权限
                const b1 = replyUsers.map(writeID => ({
                    text: 'INSERT INTO Authenticity (messageID, userID, type) VALUES ($1, $2, $3)',
                    values: [messageID, writeID, 'reply'],
                }));
                await Promise.all(b1.map(b1 => pool.query(b1)));
                // read权限
                const b2 = readUsers.map(readID => ({
                    text: 'INSERT INTO Authenticity (messageID, userID, type) VALUES ($1, $2, $3)',
                    values: [messageID, readID, 'read'],
                }));
                await Promise.all(b2.map(b2 => pool.query(b2)));
                break;
            case "Hood":
                // Hood messages只有reply权限
                const h = replyUsers.map(wID => ({
                    text: 'INSERT INTO Authenticity (messageID, userID, type) VALUES ($1, $2, $3)',
                    values: [messageID, wID, 'reply'],
                }));
                await Promise.all(h.map(h => pool.query(h)));
        }

        return res.json({ success: true, message: 'Message created successfully.' });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;