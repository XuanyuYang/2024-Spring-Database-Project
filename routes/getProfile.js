const express = require('express');
const router = express.Router();

// POST /api/getprofile
router.post('/', async (req, res) => {
    try {
        const pool = require('../app').pool;
        const { userID } = req.body;

        const query = {
            text: 'SELECT * FROM Users WHERE userID = $1',
            values: [userID],
        };

        const queryResult = await pool.query(query);
        const result = queryResult.rows.map(row => ({
            userID: row.userid,
            name: row.name,
            password: row.password,
            userAddress: row.useraddress,
            homeLocation: {
                lng: row.homelocation ? row.homelocation.x : null,
                lat: row.homelocation ? row.homelocation.y : null
            },
            userProfile: row.userprofile,
            userPhoto: row.userphoto
        }));

        res.json({ success: true, message: 'Profile sent.', data: result });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;