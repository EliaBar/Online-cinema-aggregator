const pool = require('../config/db');

/**
 * Логує невдалий пошуковий запит.
 * Якщо запит вже існує, збільшує лічильник (search_count).
 * Якщо запит вже був оброблений (is_processed = 1), він скидає 
 * його в 0, щоб парсер міг перевірити його знову.
 */
exports.logSearchQuery = async (queryText) => {
    try {
        const cleanQuery = queryText.toLowerCase().trim();
        
        if (cleanQuery.length < 3) { 
            return; 
        }

        await pool.execute(
            `INSERT INTO search_log (query_text, search_count, is_processed, last_searched_at)
             VALUES (?, 1, 0, NOW())
             ON DUPLICATE KEY UPDATE
                search_count = search_count + 1,
                is_processed = 0, 
                last_searched_at = NOW()`,
            [cleanQuery]
        );
        console.log(`[LogRepo] Запит '${cleanQuery}' успішно залоговано.`);

    } catch (err) {
        console.error('Помилка у logRepository (logSearchQuery):', err);
    }
};