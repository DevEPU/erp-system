const db = require('../config/db');

exports.getActivityLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM activity_logs';
        let countQuery = 'SELECT COUNT(*) as count FROM activity_logs';
        const params = [];
        const countParams = [];

        if (search) {
            const searchPattern = `%${search}%`;
            const whereClause = ' WHERE user_name LIKE ? OR document_type LIKE ? OR action_type LIKE ? OR action_detail LIKE ? OR ip_address LIKE ? OR whid LIKE ? OR nama_device LIKE ?';
            query += whereClause;
            countQuery += whereClause;
            
            for (let i = 0; i < 7; i++) {
                params.push(searchPattern);
                countParams.push(searchPattern);
            }
        }

        query += ' ORDER BY tgl DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await db.execute(query, params);
        const [totalRows] = await db.execute(countQuery, countParams);
        const total = totalRows[0].count;

        return res.json({
            status: 'success',
            data: rows,
            total,
            current_page: page,
            last_page: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Server error: ' + error.message });
    }
};
