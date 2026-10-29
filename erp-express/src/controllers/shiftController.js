const db = require('../config/db');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.getShifts = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM shifts ORDER BY start_time ASC');
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createShift = async (req, res) => {
    const { name, start_time, end_time, description, is_active } = req.body;
    try {
        if (!name || !start_time || !end_time) {
            return res.status(400).json({ success: false, message: 'Name, start time, and end time are required' });
        }
        await db.execute(
            'INSERT INTO shifts (name, start_time, end_time, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [
                name.trim(),
                start_time.trim(),
                end_time.trim(),
                description || null,
                is_active !== undefined ? (is_active ? 1 : 0) : 1
            ]
        );
        return res.status(201).json({ success: true, message: 'Shift created successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateShift = async (req, res) => {
    const { id } = req.params;
    const { name, start_time, end_time, description, is_active } = req.body;
    try {
        if (!name || !start_time || !end_time) {
            return res.status(400).json({ success: false, message: 'Name, start time, and end time are required' });
        }
        await db.execute(
            'UPDATE shifts SET name = ?, start_time = ?, end_time = ?, description = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
            [
                name.trim(),
                start_time.trim(),
                end_time.trim(),
                description || null,
                is_active ? 1 : 0,
                id
            ]
        );
        return res.json({ success: true, message: 'Shift updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteShift = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM shifts WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Shift deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
