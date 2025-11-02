const topFilmsRepo = require('../repositories/top-films');
const searchRepo = require('../repositories/search-movies');
const userRepo = require('../repositories/user-repository');
const movieRepo = require('../repositories/movie-repository');
const ratingRepo = require('../repositories/rating-repository');
const logRepo = require('../repositories/log-repository');

async function getFilterData() {
    try {
        const [
            allGenres, 
            countryStrings,
            allYears,
            durationLimits,
            allPlatforms 
        ] = await Promise.all([
            movieRepo.getAllGenres(),
            movieRepo.getAllCountryStrings(),
            movieRepo.getAllReleaseYears(),
            movieRepo.getDurationLimits(),
            movieRepo.getAllPlatforms() 
        ]);
        
        const countrySet = new Set();
        countryStrings.forEach(str => {
            const countries = str.split(','); 
            countries.forEach(country => {
                if(country.trim()) countrySet.add(country.trim());
            });
        });
        const allCountries = Array.from(countrySet).sort();
        
        return { allGenres, allCountries, allYears, durationLimits, allPlatforms }; 

    } catch (error) {
        console.error("Помилка під час завантаження даних фільтрів:", error);
        return { 
            allGenres: [], 
            allCountries: [], 
            allYears: [], 
            durationLimits: { min: 60, max: 240 },
            allPlatforms: [] // <-- НОВЕ
        };
    }
}


// -----------------------------------------------------------------
// ОСНОВНІ КОНТРОЛЕРИ
// -----------------------------------------------------------------

/**
 * Контролер для Головної сторінки (GET /)
 */
exports.getHomePage = async (req, res) => {
    try {
        const [topMovies, filterData] = await Promise.all([
            topFilmsRepo.getTopRatedFilms(),
            getFilterData()
        ]);
        
        res.render('index', { 
            topMovies: topMovies,
            ...filterData 
        });
        
    } catch (err) {
        console.error('Помилка getHomePage:', err);
        res.status(500).send("Помилка сервера");
    }
};

/**
 * Контролер для сторінки Пошуку (GET /search-results)
 */
exports.getSearchResults = async (req, res) => {
    const filters = {
        q: req.query.q || null,
        genre: req.query.genre || null,
        year_from: req.query.year_from || null,
        year_to: req.query.year_to || null,
        country: req.query.country || null,
        price_type: req.query.price_type || null,
        duration_max: req.query.duration_max || null,
        platform: req.query.platform || null,
        imdb_min: req.query.imdb_min || null    
    };
    
    try {
        const [results, filterData] = await Promise.all([
            searchRepo.getAllFilmNames(filters),
            getFilterData()
        ]);
        
        if (results.length === 0 && filters.q) {
            console.log(`[SearchController] 0 результатів. Логування запиту: '${filters.q}'`);
            logRepo.logSearchQuery(filters.q);
        }

        res.render('search-results', { 
            results: results, 
            q: req.query.q || '',
            ...filterData 
        });
        
    } catch (err) {
        console.error('Помилка у searchController:', err);
        res.status(500).send("Помилка сервера");
    }
};

exports.getAboutPage = async (req, res) => {
    try {
        res.render('about'); 
    } catch (err) {
        console.error(err);
        res.status(500).send("Помилка сервера");
    }
};


/**
 * Контролер для сторінки "Особистий кабінет" (GET /profile)
 * Тепер він завантажує дані користувача з сесії
 */
exports.getProfilePage = async (req, res) => {
    try {
        // береться ID з сесії, яка була створена при вході
        const userId = req.session.user.id;
        
        // Знаходимо актуальні дані користувача в БД
        const user = await userRepo.findUserById(userId);

        if (!user) {
            // Це дивно, але можливо користувача видалили, а сесія лишилась
            return res.redirect('/logout');
        }

        let formattedDate = '';
        if (user.date_of_birth) {
            // 1. Отримується об'єкт дати (який бачить сервер, напр. 2000-10-25)
            const dob = new Date(user.date_of_birth);
            
            const yyyy = dob.getFullYear();
            // getMonth() повертає 0-11, тому +1
            const mm = String(dob.getMonth() + 1).padStart(2, '0'); 
            const dd = String(dob.getDate()).padStart(2, '0');
            
            formattedDate = `${yyyy}-${mm}-${dd}`;
        }

        res.render('profile', { 
            user: user,
            dob_formatted: formattedDate
        }); 
        
    } catch (err) {
        console.error('Помилка getProfilePage:', err);
        res.status(500).send("Помилка сервера");
    }
};

/**
 * ОНОВЛЕНИЙ Контролер для сторінки Фільму (GET /film/:id)
 */
exports.getFilmDetailsPage = async (req, res) => {
    try {
        const filmId = req.params.id;
        const userId = req.session.user ? req.session.user.id : null;

        // 1. Отримуємо всі дані паралельно 
        const [
            film,
            genres,
            prices, 
            avgRating,
            allMoodTags,
            topFilmMoods
        ] = await Promise.all([
            movieRepo.getFilmDetails(filmId),
            movieRepo.getFilmGenres(filmId),
            movieRepo.getFilmPrices(filmId),
            movieRepo.getFilmAverageRating(filmId),
            movieRepo.getAllMoodTags(),
            movieRepo.getTopFilmMoods(filmId)
        ]);

        if (!film) {
            return res.status(404).send("Фільм не знайдено");
        }

        // --- 2.  ГРУПУВАННЯ ТА СОРТУВАННЯ ЦІН ---
        const groupedPrices = {};

        // 2.1 Перебираються всі ціни, що прийшли з БД
        prices.forEach(price => {
            const platformName = price.name;

            // 2.2 Якщо платформа ще не оброблялась, створюємо для неї запис
            if (!groupedPrices[platformName]) {
                
                // Визначаємо правильне URL для цієї платформи
                let platformUrl = '#'; // Заглушка
                if (platformName === 'Megogo') {
                    platformUrl = film.url;
                } else if (platformName === 'Sweet.tv') {
                    platformUrl = film.url_sweet_tv;
                }
                
                groupedPrices[platformName] = {
                    url: platformUrl,
                    options: []
                };
            }
            
            // 2.4 Додаєтья опція ціни
            groupedPrices[platformName].options.push({
                access_type: price.access_type,
                price: price.price
            });
        });

        // 2.5 Сортуються опції для кожної платформи
        for (const platformName in groupedPrices) {
            groupedPrices[platformName].options.sort((a, b) => {
                const priceA = a.price || 0;
                const priceB = b.price || 0;
                // Сортування від вищої ціни до нижчої
                return priceB - priceA; 
            });
        }

        // 3. Отримуються дані користувача 
        let userStarRating = null;
        let userMoodTagIds = [];
        if (userId) {
            [userStarRating, userMoodTagIds] = await Promise.all([
                ratingRepo.getUserStarRating(userId, filmId),
                ratingRepo.getUserMoodTagIds(userId, filmId)
            ]);
        }
        res.render('film-details', {
            film: film,
            genres: genres,
            groupedPrices: groupedPrices,
            avgRating: avgRating,
            allMoodTags: allMoodTags,
            topFilmMoods: topFilmMoods,
            userStarRating: userStarRating,
            userMoodTagIds: userMoodTagIds,
            filmId: filmId
        });
    } catch (err) {
        console.error("Помилка getFilmDetailsPage:", err);
        res.status(500).send("Помилка сервера");
    }
};