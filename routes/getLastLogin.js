const express = require('express');
const router = express.Router();

// POST /api/getlastlogin
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { userID } = req.body;

        const query = {
            text: 'SELECT loginTime FROM LastLogin WHERE userID = $1',
            values: [userID],
        };
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.json({ loginTime: null });
        }
        const loginTime = result.rows[0].logintime;

        res.json({ loginTime });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;