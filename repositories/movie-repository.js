const pool = require('../config/db'); 
/**
 * Отримує повний список жанрів з бази даних,
 * відсортований за алфавітом.
 */
exports.getAllGenres = async () => {
    try {
        const [rows] = await pool.execute(
            'SELECT genre_id, name FROM genre ORDER BY name ASC'
        );
        return rows;
        
    } catch (err) {
        console.error('Помилка у genreRepository (getAllGenres):', err);
        throw err; 
    }
};

/**
 * Отримує всі теги емоцій.
 */
exports.getAllMoodTags = async () => {
    try {
        const [rows] = await pool.execute("SELECT * FROM mood_tags");
        return rows;
    } catch (err) {
        console.error("Помилка getAllMoodTags:", err);
        throw err;
    }
};

exports.getAllCountryStrings = async () => {
    try {
        const [rows] = await pool.execute(
            "SELECT DISTINCT country FROM films WHERE country IS NOT NULL AND country != '' ORDER BY country ASC"
        );
        return rows.map(row => row.country);
        
    } catch (err) {
        console.error('Помилка у movieRepository (getAllCountryStrings):', err);
        throw err;
    }
};

/**
 * Отримує всі значення тривалості з бази даних.
 * (Поверне масив рядків,  ["169 хв", "120 хв", "95 хв"])
 */
exports.getAllDurations = async () => {
    try {
        const [rows] = await pool.execute(
            "SELECT duration FROM films WHERE duration IS NOT NULL AND duration != ''"
        );
        return rows.map(row => row.duration);
    } catch (err) {
        console.error('Помилка у movieRepository (getAllDurations):', err);
        throw err;
    }
};

/**
 * Отримує всі унікальні роки випуску з бази даних.
 */
exports.getAllReleaseYears = async () => {
    try {
        const [rows] = await pool.execute(
            // CONVERT(... SIGNED) перетворює текст на число для правильного сортування
            "SELECT DISTINCT CONVERT(release_year, SIGNED) as year FROM films " +
            "WHERE release_year IS NOT NULL AND release_year != '' " +
            "ORDER BY year DESC" 
        );
        return rows.map(row => row.year); 
    } catch (err) {
        console.error('Помилка у movieRepository (getAllReleaseYears):', err);
        throw err;
    }
};

exports.getAllPlatforms = async () => {
    try {
        const [rows] = await pool.execute(
            'SELECT platform_id, name FROM platform ORDER BY name ASC'
        );
        return rows;
    } catch (err) {
        console.error('Помилка у movieRepository (getAllPlatforms):', err);
        throw err;
    }
};

/**
 * Отримує мінімум та максимум тривалість з бази даних.
 */
exports.getDurationLimits = async () => {
    try {
        const [rows] = await pool.execute(
            "SELECT " +
            "MIN(CAST(REGEXP_SUBSTR(duration, '^[0-9]+') AS UNSIGNED)) as minDuration, " +
            "MAX(CAST(REGEXP_SUBSTR(duration, '^[0-9]+') AS UNSIGNED)) as maxDuration " +
            "FROM films WHERE duration IS NOT NULL AND duration != ''"
        );
        
        if (rows.length > 0 && rows[0].minDuration) {
            return {
                min: rows[0].minDuration,
                max: rows[0].maxDuration
            };
        }
        return { min: 60, max: 240 };
        
    } catch (err) {
        console.error('Помилка у movieRepository (getDurationLimits):', err);
        throw err;
    }
};

/**
 * Отримує 1 фільм за ID та всі пов'язані з ним дані.
 */
exports.getFilmDetails = async (filmId) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM films WHERE id = ?", [filmId]);
        return rows[0]; 
    } catch (err) {
        console.error("Помилка getFilmDetails:", err);
        throw err;
    }
};

/**
 * Отримує список жанрів для 1 фільму.
 */
exports.getFilmGenres = async (filmId) => {
    try {
        const [rows] = await pool.execute(
            "SELECT g.name FROM genre g JOIN film_genre fg ON g.genre_id = fg.genre_id WHERE fg.film_id = ?",
            [filmId]
        );
        return rows.map(row => row.name); 
    } catch (err) {
        console.error("Помилка getFilmGenres:", err);
        throw err;
    }
};

exports.getFilmGenreIds = async (filmId) => {
    try {
        const [rows] = await pool.execute(
            "SELECT genre_id FROM film_genre WHERE film_id = ?",
            [filmId]
        );
        return rows.map(row => row.genre_id); 
    } catch (err) {
        console.error("Помилка getFilmGenreIds:", err);
        throw err;
    }
}

/**
 * Отримує список цін для 1 фільму.
 */
exports.getFilmPrices = async (filmId) => {
    try {
        const [rows] = await pool.execute(
            "SELECT p.name, fp.access_type, fp.price " +
            "FROM platform p JOIN film_platform fp ON p.platform_id = fp.platform_id " +
            "WHERE fp.film_id = ?",
            [filmId]
        );
        return rows; 
    } catch (err) {
        console.error("Помилка getFilmPrices:", err);
        throw err;
    }
};

/**
 * Отримує середній  рейтинг для 1 фільму.
 */
exports.getFilmAverageRating = async (filmId) => {
    try {
        const [rows] = await pool.execute(
            "SELECT AVG(rating) as avgRating, COUNT(rating) as voteCount FROM ratings WHERE film_id = ?",
            [filmId]
        );
        return rows[0];
    } catch (err) {
        console.error("Помилка getFilmAverageRating:", err);
        throw err;
    }
};

/**
 * Отримує ТОП-3 емоцій для 1 фільму .
 */
exports.getTopFilmMoods = async (filmId) => {
    try {
        const [rows] = await pool.execute(
            "SELECT mt.name, mt.emoji, COUNT(fmr.mood_tag_id) as tag_count " +
            "FROM film_mood_ratings fmr " +
            "JOIN mood_tags mt ON fmr.mood_tag_id = mt.mood_tag_id " +
            "WHERE fmr.film_id = ? " +
            "GROUP BY fmr.mood_tag_id " +
            "ORDER BY tag_count DESC " +
            "LIMIT 3",
            [filmId]
        );
        return rows; 
    } catch (err) {
        console.error("Помилка getTopFilmMoods:", err);
        throw err;
    }
};

/**
 * Перевіряє, які з наданих filmIds мають вказаний moodTagId.
 */
exports.getTopFilmsByMoodTag = async (moodTagId) => {
    try {
        const [rows] = await pool.execute(
            `
            WITH FilmTotalVotes AS (
                SELECT
                    film_id,
                    COUNT(*) AS total_votes
                FROM film_mood_ratings
                GROUP BY film_id
            ),
            SpecificMoodCounts AS (
                SELECT
                    film_id,
                    COUNT(*) AS tag_count
                FROM film_mood_ratings
                WHERE mood_tag_id = ?
                GROUP BY film_id
            )
            SELECT
                f.id,
                f.name,
                f.poster_url AS image,
                smc.tag_count,
                (smc.tag_count / ftv.total_votes) AS relevance_percentage
            FROM SpecificMoodCounts smc
            JOIN FilmTotalVotes ftv ON smc.film_id = ftv.film_id
            JOIN films f ON smc.film_id = f.id
            WHERE
                (smc.tag_count / ftv.total_votes) >= 0.20  
            ORDER BY
                smc.tag_count DESC 
            LIMIT 10;
            `,
            [moodTagId]
        );
        return rows;
    } catch (err) {
        console.error("Помилка getTopFilmsByMoodTag:", err);
        throw err;
    }
};

/**
 * Перевіряє, які з наданих filmIds мають вказаний moodTagId
 * (з урахуванням 20% порогу).
 */
exports.getFilmIdsByMood = async (filmIdArray, moodTagId) => {
    if (!filmIdArray || filmIdArray.length === 0) {
        return [];
    }
    try {
        const placeholders = filmIdArray.map(() => '?').join(',');
        
        const [rows] = await pool.execute(
            `
            WITH FilmTotalVotes AS (
                SELECT
                    film_id,
                    COUNT(*) AS total_votes
                FROM film_mood_ratings
                WHERE film_id IN (${placeholders})
                GROUP BY film_id
            ),
            SpecificMoodCounts AS (
                SELECT
                    film_id,
                    COUNT(*) AS tag_count
                FROM film_mood_ratings
                WHERE mood_tag_id = ? 
                AND film_id IN (${placeholders})
                GROUP BY film_id
            )
            SELECT
                smc.film_id
            FROM SpecificMoodCounts smc
            JOIN FilmTotalVotes ftv ON smc.film_id = ftv.film_id
            WHERE
                (smc.tag_count / ftv.total_votes) >= 0.20
            `,
            [...filmIdArray, moodTagId, ...filmIdArray] 
        );
        return rows.map(row => row.film_id);
    } catch (err) {
        console.error("Помилка getFilmIdsByMood:", err);
        throw err;
    }
};

exports.updateFilmDetails = async (filmId, data) => {
    // 'data' - це об'єкт, що містить:
    // { poster_url, description, release_year, imdb_rating, 
    //   age_limit, duration, country, genreIds }
    
    const connection = await pool.getConnection(); 
    try {
        await connection.beginTransaction();
        await connection.execute(
            `UPDATE films 
             SET poster_url = ?, description = ?, release_year = ?, 
                 imdb_rating = ?, age_limit = ?, duration = ?, country = ?
             WHERE id = ?`,
            [
                data.poster_url,
                data.description,
                data.release_year,
                data.imdb_rating,
                data.age_limit,
                data.duration,
                data.country,
                filmId
            ]
        );

        await connection.execute(
            "DELETE FROM film_genre WHERE film_id = ?",
            [filmId]
        );

        if (data.genreIds && data.genreIds.length > 0) {
            const genreValues = data.genreIds.map(genreId => [filmId, parseInt(genreId)]);
            
            await connection.query(
                "INSERT INTO film_genre (film_id, genre_id) VALUES ?",
                [genreValues]
            );
        }

        await connection.commit();
        return true;

    } catch (err) {
        await connection.rollback();
        console.error('Помилка в userRepository (updateFilmDetails):', err);
        throw err; 
    } finally {
        connection.release(); 
    }
};

exports.deleteFilmById = async (filmId) => {
    try {
        await pool.execute(
            "DELETE FROM films WHERE id = ?",
            [filmId]
        );
        return true;
    } catch (err) {
        console.error('Помилка в userRepository (deleteFilmById):', err);
        throw err;
    }
};