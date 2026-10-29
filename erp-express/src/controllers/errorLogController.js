const db = require('../config/db');

exports.getErrorLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM error_logs';
        let countQuery = 'SELECT COUNT(*) as count FROM error_logs';
        const params = [];
        const countParams = [];

        if (search) {
            const searchPattern = `%${search}%`;
            const whereClause = ' WHERE user_name LIKE ? OR role_name LIKE ? OR method LIKE ? OR url LIKE ? OR error_type_name LIKE ? OR response_message LIKE ?';
            query += whereClause;
            countQuery += whereClause;
            
            for (let i = 0; i < 6; i++) {
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
