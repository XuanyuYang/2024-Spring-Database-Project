const express = require('express');
const router = express.Router();

// POST /api/getneighbor
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { userID } = req.body;

        const query = {
            text: 'SELECT neighborID, name FROM Neighbors JOIN Users ON Neighbors.neighborID = Users.userID WHERE Neighbors.userID = $1',
            values: [userID],
        };
        const result = await pool.query(query);

        const neighbors = result.rows.map(row => ({
            neighborID: row.neighborid,
            neighborName: row.name
        }));

        res.json({ success: true, message: 'Neighbors retrieved successfully.', data: neighbors});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;