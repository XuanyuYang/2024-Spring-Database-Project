const express = require('express');
const router = express.Router();

// GET /api/getblock
router.get('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;

        const query = 'SELECT blockID, blockName, blockCenter, blockRadius FROM Blocks';
        const result = await pool.query(query);
        const blocks = result.rows.map(row => ({
            blockID: row.blockid,
            blockName: row.blockname,
            blockCenter: row.blockcenter,
            blockRadius: row.blockradius
        }));

        res.json({ success: true, blocks: blocks });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;