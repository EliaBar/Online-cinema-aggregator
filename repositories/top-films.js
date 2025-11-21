const pool = require('../config/db');
exports.getTopRatedFilms = async () => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, name, poster_url FROM films ORDER BY imdb_rating DESC LIMIT 10'
        );
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            image: row.poster_url 
        }));
    } catch (err) {
        console.error('Помилка у top-films.js:', err);
        throw err;
    }
};

exports.getTopPlatformRatedFilms = async () => {
    try {
        const [rows] = await pool.execute(
            "SELECT " +
            "f.id, f.name, f.poster_url, f.release_year, " + 
            "COALESCE(AVG(r.rating), 0) AS avg_rating, " +
            "COUNT(r.rating) AS vote_count " +
            "FROM films f " +
            "LEFT JOIN ratings r ON f.id = r.film_id " +
            "GROUP BY f.id, f.name, f.poster_url, f.release_year " +
            "ORDER BY avg_rating DESC, vote_count DESC, CAST(f.release_year AS SIGNED) DESC " +
            "LIMIT 20"
        );
        
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            image: row.poster_url 
        }));

    } catch (err) {
        console.error('Помилка у top-films.js (getTopPlatformRatedFilms):', err);
        throw err;
    }
};