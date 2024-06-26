const express = require('express');
const router = express.Router();

// POST /api/getfriend
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { userID } = req.body;
        // console.log(userID);

        const query = {
            text: 'SELECT friendID, name FROM Friends JOIN Users ON Friends.friendID = Users.userID WHERE Friends.userID = $1',
            values: [userID],
        };
        const result = await pool.query(query);

        const friends = result.rows.map(row => ({
            friendID: row.friendid,
            friendName: row.name
        }));

        res.json({ success: true, message: 'Friends retrieved successfully.', data: friends});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;