const express = require('express');
const router = express.Router();

// POST /api/getfriendapplication
router.post('/', async (req, res) => {
    try {
        const pool = require('../app').pool;
        const { userID } = req.body;

        // 获取对应申请，按照 fAppCreateTime 降序排序
        const query = {
            text: `SELECT fAppID, fromID, name, fAppCreateTime, fAppStatus, fAppStatus AS decision FROM FriendApplication
                    JOIN Users ON fromID = Users.userID
                    WHERE toID = $1 ORDER BY fAppCreateTime DESC`,
            values: [userID],
        };
        const result = await pool.query(query);

        return res.status(200).json({ success: true, message: 'Friend applications retrieved successfully.', data: result.rows });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;