const pool = require('../config/db');
const logic = require('../services/logic'); 

exports.logSearchQuery = async (queryText) => {
    try {
        if (!logic.isValidSearchQuery(queryText)) {
            return; 
        }

        const cleanQuery = queryText.toLowerCase().trim();

        await pool.execute(
            `INSERT INTO search_log (query_text, search_count, is_processed, last_searched_at)
             VALUES (?, 1, 0, NOW())
             ON DUPLICATE KEY UPDATE
                search_count = search_count + 1,
                is_processed = 0, 
                last_searched_at = NOW()`,
            [cleanQuery]
        );

    } catch (err) {
        console.error('Помилка у logRepository (logSearchQuery):', err);
    }
};

/**
 * @param {number} adminUserId - ID адміна з req.session.user.id
 * @param {string} actionType - 'edit_film' або 'delete_film'
 * @param {number} filmId - ID фільму, який було змінено
 */
exports.logAdminAction = async (adminUserId, actionType, filmId) => {
    try {
        await pool.execute(
            "INSERT INTO admin_logs (admin_user_id, action_type, target_film_id) VALUES (?, ?, ?)",
            [adminUserId, actionType, filmId]
        );
        console.log(`[Admin Log] User ${adminUserId} виконав ${actionType} на фільмі ${filmId}`);
    
    } catch (err) {
        console.error('Помилка в logRepository (logAdminAction):', err);
    }
};