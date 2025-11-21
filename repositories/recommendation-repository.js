// repositories/recommendationRepository.js
const pool = require('../config/db');

/**
 * Отримує персоналізовані рекомендації для користувача.
 */
exports.getItemBaseRecommendations = async (userId) => {
    try {
        /*
         * ЛОГІКА ITEM-BASE:
         * 1. (TargetUserHighRatings): Знаходимо фільми, які користувач високо оцінив (>= 4).
         * 2. (UsersWhoLikedSameFilms): Знаходимо інших користувачів, 
         * яким також сподобалися ці фільми.
         * 3. (RecommendedItems): Збираємо всі інші фільми, які сподобалися 
         * цій "схожій" групі користувачів.
         * 4. (Фінальний SELECT): Рахуємо, які з цих  фільмів 
         * зустрічалися найчастіше, і рекомендуємо їх.
         */
        
        const [rows] = await pool.execute(
            `
            WITH TargetUserHighRatings AS (
                SELECT film_id FROM ratings WHERE user_id = ? AND rating >= 4
            ),
            UsersWhoLikedSameFilms AS (
                SELECT DISTINCT user_id FROM ratings
                WHERE film_id IN (SELECT film_id FROM TargetUserHighRatings)
                AND user_id != ? 
            ),
            RecommendedItems AS (
                SELECT
                    r.film_id,
                    COUNT(r.film_id) AS recommendation_score -- Рахуємо збіги
                FROM ratings r
                JOIN UsersWhoLikedSameFilms u ON r.user_id = u.user_id
                WHERE
                    r.rating >= 4
                    AND r.film_id NOT IN (SELECT film_id FROM ratings WHERE user_id = ?)
                GROUP BY r.film_id
            )
            SELECT
                f.id,
                f.name,
                f.poster_url AS image,
                ri.recommendation_score
            FROM RecommendedItems ri
            JOIN films f ON ri.film_id = f.id
            ORDER BY ri.recommendation_score DESC
            LIMIT 20;
            `,
            [userId, userId, userId] 
        );
        return rows;

    } catch (err) {
        console.error("Помилка getItemBaseRecommendations:", err);
        throw err;
    }
};