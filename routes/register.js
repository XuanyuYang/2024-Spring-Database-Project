const express = require('express');
const router = express.Router();

// POST /api/register
router.post('/', async (req, res, next) => {
    try {
        const pool = require('../app').pool;
        const { name, password2, userAddress, homeLocation, userProfile, userPhoto } = req.body;

        if (!name || !password2) {
            return res.status(400).json({ success: false, message: 'Name and password are required' });
        }

        const checkQuery = {
            text: 'SELECT * FROM Users WHERE name = $1',
            values: [name],
        };
        const checkResult = await pool.query(checkQuery);

        if (checkResult.rows.length > 0) {
            res.status(400).json({ success: false, message: 'Username already exists' });
        } else {
            // 添加新用户
            const pointText = homeLocation ? `POINT(${homeLocation.lng}, ${homeLocation.lat})` : null;
            const insertQuery = {
                text: 'INSERT INTO Users (name, password, userAddress, homeLocation, userProfile, userPhoto) VALUES ($1, $2, $3, ' + pointText + ', $4, $5)',
                values: [name, password2, userAddress, userProfile, userPhoto],
            };

            // 将允许为空的字段设置为 null
            const insertValues = insertQuery.values.map(value => value === undefined ? null : value);
            await pool.query({
                ...insertQuery,
                values: insertValues,
            });
            res.json({ success: true, message: 'User registered successfully' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;