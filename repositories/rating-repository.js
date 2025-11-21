const pool = require('../config/db');

/**
 * Отримує оцінку (1-5) конкретного користувача для фільму.
 */
exports.getUserStarRating = async (userId, filmId) => {
    try {
        const [rows] = await pool.execute(
            "SELECT rating FROM ratings WHERE user_id = ? AND film_id = ?",
            [userId, filmId]
        );
        return rows[0] ? rows[0].rating : null; 
    } catch (err) {
        console.error("Помилка getUserStarRating:", err);
        throw err;
    }
};

/**
 * Отримує список ID емоцій, які користувач обрав для фільму.
 */
exports.getUserMoodTagIds = async (userId, filmId) => {
    try {
        const [rows] = await pool.execute(
            "SELECT mood_tag_id FROM film_mood_ratings WHERE user_id = ? AND film_id = ?",
            [userId, filmId]
        );
        return rows.map(row => row.mood_tag_id); 
    } catch (err) {
        console.error("Помилка getUserMoodTagIds:", err);
        throw err;
    }
};

/**
 * Зберігає (або оновлює) оцінку.
 */
exports.saveStarRating = async (userId, filmId, ratingValue) => {
    try {
        await pool.execute(
            "INSERT INTO ratings (user_id, film_id, rating) VALUES (?, ?, ?) " +
            "ON DUPLICATE KEY UPDATE rating = VALUES(rating)",
            [userId, filmId, ratingValue]
        );
        return true;
    } catch (err) {
        console.error("Помилка saveStarRating:", err);
        throw err;
    }
};

exports.deleteStarRating = async (userId, filmId) => {
    try {
        await pool.execute(
            "DELETE FROM ratings WHERE user_id = ? AND film_id = ?",
            [userId, filmId]
        );
        return true;
    } catch (err) {
        console.error("Помилка deleteStarRating:", err);
        throw err;
    }
};

/**
 * Зберігає емоції (повністю перезаписує старий вибір користувача).
 */
exports.saveMoodRatings = async (userId, filmId, moodTagIds) => {
    const connection = await pool.getConnection(); 
    try {
        await connection.beginTransaction();
        
        await connection.execute(
            "DELETE FROM film_mood_ratings WHERE user_id = ? AND film_id = ?",
            [userId, filmId]
        );
        
        if (moodTagIds && moodTagIds.length > 0) {
            const values = moodTagIds.map(tagId => [userId, filmId, tagId]);
            
            await connection.query(
                "INSERT INTO film_mood_ratings (user_id, film_id, mood_tag_id) VALUES ?",
                [values]
            );
        }
        
        await connection.commit(); 
        return true;

    } catch (err) {
        await connection.rollback(); 
        console.error("Помилка saveMoodRatings:", err);
        throw err;
    } finally {
        connection.release(); 
    }
};

/**
 * перевіряє, чи має користувач хоча б одну оцінку.
 */
exports.checkUserHasRatings = async (userId) => {
    try {
        const [rows] = await pool.execute(
            "SELECT 1 FROM ratings WHERE user_id = ? LIMIT 1",
            [userId]
        );
        return rows.length > 0;
    } catch (err) {
        console.error("Помилка checkUserHasRatings:", err);
        throw err;
    }
};