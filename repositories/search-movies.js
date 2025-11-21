const pool = require('../config/db');

exports.getAllFilmNames = async (query) => {
  let results = [];
  if (query) {
    try {
      const [rows] = await pool.execute(
        'SELECT name, poster_url FROM films WHERE name LIKE ?',
        [`%${query}%`]
      );
      results = rows.map(row => ({
        name: row.name,
        image: row.poster_url 
      }));
    } catch (err) {
      console.error(err);
    }
  }
  console.log(results);
  return results;
};

/**
 * Виконує розширений пошук з фільтрами.
 */
exports.getAllFilmNames = async (filters) => {
    try {

        let baseQuery = "SELECT " +
            "f.id, f.name, f.poster_url, f.imdb_rating, f.release_year, f.country, f.duration, " +
            "COALESCE(AVG(r.rating), 0) AS avg_rating, " +
            "COUNT(r.rating) AS vote_count " +
            "FROM films f";
        
        let joins = ["LEFT JOIN ratings r ON f.id = r.film_id"];
        let whereConditions = [];
        let params = [];

        if (filters.genre) {
            joins.push("JOIN film_genre fg ON f.id = fg.film_id");
            whereConditions.push("fg.genre_id = ?");
            params.push(filters.genre);
        }

        if (filters.price_type || filters.platform) {
            joins.push("JOIN film_platform fp ON f.id = fp.film_id");
        }
        if (filters.price_type) {
            if (filters.price_type === 'subscription') {
                whereConditions.push("fp.access_type = 'Підписка'");
            } else if (filters.price_type === 'free') {
                whereConditions.push("fp.access_type = 'Безкоштовно'");
            } else if (filters.price_type === 'rent') {
                whereConditions.push("fp.access_type LIKE 'Оренда%' OR fp.access_type LIKE 'Прокат%'");
            }
        }
        if (filters.platform) {
            whereConditions.push("fp.platform_id = ?");
            params.push(filters.platform);
        }

        if (filters.q) {
            whereConditions.push("f.normalized_name LIKE ?");
            params.push(`%${filters.q}%`);
        }
        if (filters.year_from) {
            whereConditions.push("f.release_year >= ?");
            params.push(filters.year_from);
            
        }
        if (filters.year_to) {
            whereConditions.push("f.release_year <= ?");
            params.push(filters.year_to);
        }
        if (filters.country) {
            whereConditions.push("f.country LIKE ?");
            params.push(`%${filters.country}%`);
        }
        if (filters.duration_max) {
            whereConditions.push("CAST(REGEXP_SUBSTR(f.duration, '^[0-9]+') AS UNSIGNED) <= ?");
            params.push(filters.duration_max);
        }
        if (filters.imdb_min) {
            whereConditions.push("CAST(f.imdb_rating AS DECIMAL(3,1)) >= ?");
            params.push(filters.imdb_min);
        }

        let finalQuery = baseQuery;
        if (joins.length > 0) {
            finalQuery += " " + joins.join(" ");
        }
        if (whereConditions.length > 0) {
            finalQuery += " WHERE " + whereConditions.join(" AND ");
        }
        
        finalQuery += " GROUP BY f.id, f.name, f.poster_url, f.imdb_rating, f.release_year, f.country, f.duration";
        
        finalQuery += " ORDER BY avg_rating DESC, vote_count DESC, CAST(f.release_year AS SIGNED) DESC";
        
        finalQuery += " LIMIT 1000"; 

        console.log("SQL Запит:", finalQuery);
        console.log("Параметри:", params);

        const [rows] = await pool.execute(finalQuery, params);
        
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            image: row.poster_url 
        }));

    } catch (err) {
        console.error('Помилка у search-movies.js (getAllFilmNames):', err);
        throw err;
    }
};