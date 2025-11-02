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