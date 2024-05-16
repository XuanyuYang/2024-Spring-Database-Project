const express = require('express');
const router = express.Router();

// POST /api/processblockapplication
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { userId, bAppID, decision, timestamp } = req.body;

        // 插入新的处理记录
        const insertDecisionQuery = {
            text: 'INSERT INTO BlockApplicationDecision (bAppID, userID, decision, time) VALUES ($1, $2, $3, $4)',
            values: [bAppID, userId, decision, timestamp],
        };
        await pool.query(insertDecisionQuery);

        if (decision === 'rejected') {
            return res.status(200).json({ success: true, message: 'Rejection processed successfully.' });
        } else if (decision === 'approved') {
            // 检查是否可以通过申请
            // 获取对应 blockID 的成员数量
            const userBlockQuery = {
                text: `SELECT COUNT(*) AS count
                       FROM UserBlock
                       WHERE blockID = (SELECT blockID
                                        FROM UserBlock
                                        WHERE userID = $1);`,
                values: [userId],
            };
            const userBlockResult = await pool.query(userBlockQuery);
            const memberCnt = userBlockResult.rows[0].count;

            // 获取通过申请的数量
            const approvedDecisionQuery = {
                text: 'SELECT COUNT(*) FROM BlockApplicationDecision WHERE bAppID = $1 AND decision = $2',
                values: [bAppID, 'approved'],
            };
            const approvedDecisionResult = await pool.query(approvedDecisionQuery);
            const approvedCnt = approvedDecisionResult.rows[0].count;

            // 至少三人同意，或小于三人时全员同意，通过申请
            if (approvedCnt >= Math.min(3, memberCnt)) {
                const updateStatusQuery = {
                    text: 'UPDATE BlockApplication SET bAppStatus = $1 WHERE bAppID = $2',
                    values: ['approved', bAppID],
                };
                await pool.query(updateStatusQuery);

                // 加入block
                const blockAppQuery = {
                    text: 'SELECT fromID, toBlockID FROM BlockApplication WHERE bAppID = $1',
                    values: [bAppID],
                };
                const blockAppResult = await pool.query(blockAppQuery);

                const insertUserBlockQuery = {
                    text: 'INSERT INTO UserBlock (userID, blockID) VALUES ($1, $2)',
                    values: [blockAppResult.rows[0].fromid, blockAppResult.rows[0].toblockid],
                };
                await pool.query(insertUserBlockQuery);

                // 如果已经follow了该block，退出follow
                const removeFollowQuery = {
                    text: 'DELETE FROM UserFollow WHERE userID = $1 AND blockID = $2',
                    values: [blockAppResult.rows[0].fromid, blockAppResult.rows[0].toblockid],
                };
                await pool.query(removeFollowQuery);

                return res.status(200).json({ success: true, message: 'Approval processed successfully. The application is approved.' });
            }

            return res.status(200).json({ success: true, message: 'Approval processed successfully.' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;