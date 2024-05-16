const express = require('express');
const router = express.Router();

// POST /api/searchlocationmessage
router.post('/', async (req, res) => {
    try {
        const pool = require('../app').pool;
        const { userID, location, radius } = req.body;

        const pointText = `geometry(POINT(${location.lng}, ${location.lat}))`

        // 所有message
        const query = {
            text: `SELECT Authenticity.messageID, type, Messages.threadID, mTitle, mCreateTime,
                            mCreatorID, M.name AS mCreatorName, M.userPhoto AS mPhoto, mLocation, textBody,
                            tType, tCreatorID, T.name AS tCreatorName, T.userPhoto AS tPhoto, tCreateTime
                   FROM Authenticity JOIN Messages ON Authenticity.messageID = Messages.messageID
                   JOIN Threads ON Messages.threadID = Threads.threadID
                   JOIN Users AS M ON M.userID = Messages.mCreatorID
                   JOIN Users AS T ON T.userID = Threads.tCreatorID
                   WHERE Authenticity.userID = $1 AND ST_DWithin(geometry(mLocation), $2, $3)
                   ORDER BY mCreateTime DESC`,
            values: [userID, pointText, radius],
        };

        const queryResult = await pool.query(query);
        const result = queryResult.rows.map(row => ({
            messageID: row.messageid,
            userAuth: row.type,
            threadID: row.threadid,
            mTitle: row.mtitle,
            mCreateTime: row.mcreatetime,
            mCreatorID: row.mcreatorid,
            mPhoto: row.mphoto,
            mCreatorName: row.mcreatorname,
            mLocation: row.mlocation,
            textBody: row.textbody,
            threadType: row.ttype,
            tCreatorID: row.tcreatorid,
            tPhoto: row.tphoto,
            tCreatorName: row.tcreatorname,
            tCreateTime: row.tcreatetime
        }));

        res.json({ success: true, message: 'Succeeded.', data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;