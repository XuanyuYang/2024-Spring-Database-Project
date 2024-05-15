const express = require('express');
const router = express.Router();

// POST /api/getblockapplication
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { userId } = req.body;

        // 获取user所属block
        const userBlockQuery = {
            text: 'SELECT blockID FROM UserBlock WHERE userID = $1',
            values: [userId],
        };
        const userBlockResult = await pool.query(userBlockQuery);

        if (userBlockResult.rows.length === 0) {
            return res.json({ success: true, message: 'You are not a member of a block.', data: [] });
        }
        const blockID = userBlockResult.rows[0].blockid;

        // 获取所有用户可见的该block的application
        const blockAppQuery = {
            text: `
                WITH AllApplications AS (
                    SELECT bAppID, userID, name, bAppStatus, bAppCreateTime
                    FROM BlockApplication
                            JOIN Users ON Users.userID = BlockApplication.fromID
                    WHERE toBlockID = $1
                ),
                userDecided AS (
                    SELECT bAppID, decision FROM BlockApplicationDecision
                    WHERE userID = $2
                )
                SELECT AllApplications.bAppID, userID, name, bAppStatus, bAppCreateTime, decision
                FROM AllApplications LEFT OUTER JOIN userDecided
                ON AllApplications.bAppID = userDecided.bAppID
                ORDER BY bAppCreateTime DESC ;
            `,
            values: [blockID, userId],
        };
        const blockAppResult = await pool.query(blockAppQuery);

        const blockApplications = blockAppResult.rows.map(row => ({
            bAppID: row.bappid,
            fromID: row.userid,
            name: row.name,
            bAppCreateTime: row.bappcreatetime,
            appStatus: row.bappstatus,
            userDecision: row.decision
        }));

        res.json({ success: true, blockID, message: 'Block applications found', data: blockApplications });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;