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
 * Отримує ВСІ теги емоцій з довідника.
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
 * Отримує ВСІ значення тривалості з бази даних.
 * (Поверне масив рядків, напр. ["169 хв", "120 хв", "95 хв"])
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
 * Отримує ВСІ унікальні роки випуску з бази даних.
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
        return rows[0]; // { avgRating: 4.5, voteCount: 150 }
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

