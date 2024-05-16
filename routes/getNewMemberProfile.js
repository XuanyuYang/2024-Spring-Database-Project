const express = require('express');
const router = express.Router();

// POST /api/getnewmemberprofile
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { userID } = req.body;

        // 获取所属blockID和上次登录时间
        const userBlockQuery = {
            text: 'SELECT blockID, loginTime FROM UserBlock JOIN LastLogin ON LastLogin.userID = UserBlock.userID WHERE LastLogin.userID = $1',
            values: [userID],
        };
        const userBlockResult = await pool.query(userBlockQuery);
        if (userBlockResult.rows.length === 0) {
            return res.status(200).json({ success: true, message: "Success but no data, since not a block member.",  data: [] });
        }
        const blockID = userBlockResult.rows[0].blockid;
        const loginTime = userBlockResult.rows[0].logintime;

        // 获取符合要求的当前block的申请
        const query = {
            text: `SELECT DISTINCT Users.userID, name, userAddress, ST_X(geometry(homeLocation)) AS x, ST_Y(geometry(homeLocation)) AS y, userProfile, userPhoto
                   FROM BlockApplication JOIN UserBlock ON BlockApplication.fromID = UserBlock.userID
                   JOIN BlockApplicationDecision ON BlockApplicationDecision.bAppID = BlockApplication.bAppID
                   JOIN Users ON fromID = Users.userID
                   WHERE BlockApplication.bAppStatus = $1 AND UserBlock.blockID = $2 AND BlockApplicationDecision.decision = $1
                   AND BlockApplicationDecision.time >= $3 AND Users.userID != $4
            ;`,
            values: ['approved', blockID, loginTime, userID],
        };
        const queryResult = await pool.query(query);
        const result = queryResult.rows.map(row => ({
            userID: row.userid,
            name: row.name,
            userAddress: row.useraddress,
            homeLocation: {
                lng: row.x,
                lat: row.y
            },
            userProfile: row.userprofile,
            userPhoto: row.userphoto
        }));

        return res.status(200).json({ success: true, message: "Succeed.",  data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;