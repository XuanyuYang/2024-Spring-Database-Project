const express = require('express');
const router = express.Router();

// GET /api/gethood
router.get('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;

        const query = 'SELECT hoodID, hoodName, hoodCenter, hoodRadius FROM Hoods';
        const result = await pool.query(query);
        const hoods = result.rows.map(row => ({
            hoodID: row.hoodid,
            hoodName: row.hoodname,
            hoodCenter: row.hoodcenter,
            hoodRadius: row.hoodradius
        }));

        res.json({ success: true, blocks: hoods });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;