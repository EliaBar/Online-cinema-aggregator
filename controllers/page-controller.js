const topFilmsRepo = require('../repositories/top-films');
const searchRepo = require('../repositories/search-movies');
const userRepo = require('../repositories/user-repository');
const movieRepo = require('../repositories/movie-repository');
const ratingRepo = require('../repositories/rating-repository');
const logRepo = require('../repositories/log-repository');
const recommendationService = require('../services/recommendation-service');
const logic = require('../services/logic');
const security = require('../services/security');

async function getFilterData() {
    try {
        const [
            allGenres, 
            countryStrings,
            allYears,
            rawDurations,
            allPlatforms 
        ] = await Promise.all([
            movieRepo.getAllGenres(),
            movieRepo.getAllCountryStrings(),
            movieRepo.getAllReleaseYears(),
            movieRepo.getAllDurations(),
            movieRepo.getAllPlatforms() 
        ]);
        
        const allCountries = logic.processCountries(countryStrings);
        const durationLimits = logic.calculateDurationLimits(rawDurations);
        
        return { allGenres, allCountries, allYears, durationLimits, allPlatforms }; 

    } catch (error) {
        console.error("Помилка під час завантаження даних фільтрів:", error);
        return { 
            allGenres: [], 
            allCountries: [], 
            allYears: [], 
            durationLimits: { min: 60, max: 240 },
            allPlatforms: [] 
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
 * Контролер для сторінки  (GET /profile)
 */
exports.getProfilePage = async (req, res) => {
    try {
        // береться ID з сесії, яка була створена при вході
        const userId = req.session.user.id;
        
        const user = await userRepo.findUserById(userId);

        if (!user) {
            // Це дивно, але можливо користувача видалили, а сесія лишилась
            return res.redirect('/logout');
        }

        let formattedDate = '';
        if (user.date_of_birth) {
            const dob = new Date(user.date_of_birth);
            
            const yyyy = dob.getFullYear();
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
 * Контролер для сторінки Фільму (GET /film/:id)
 */
exports.getFilmDetailsPage = async (req, res) => {
    try {
        const filmId = req.params.id;
        const userId = req.session.user ? req.session.user.id : null;

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

        const groupedPrices = {};

        prices.forEach(price => {
            const platformName = price.name;

            if (!groupedPrices[platformName]) {
                
                let platformUrl = '#'; 
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
            
            groupedPrices[platformName].options.push({
                access_type: price.access_type,
                price: price.price
            });
        });

        for (const platformName in groupedPrices) {
            groupedPrices[platformName].options.sort((a, b) => {
                const priceA = a.price || 0;
                const priceB = b.price || 0;
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
            console.log(`Користувач ${userId} має оцінку ${userStarRating} для фільму ${filmId}`);
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

/**
 * Для сторінки  recommendations
 */
exports.getRecommendationsPage = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const moodTagId = req.query.mood_tag_id || null;

        const [recommendationData, allMoodTagsFromDB] = await Promise.all([
            recommendationService.getRecommendationsForUser(userId, moodTagId),
            movieRepo.getAllMoodTags() 
        ]);

        const allowedIds = new Set([
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 22, 23
        ]);
        
        const filteredMoodTags = allMoodTagsFromDB.filter(tag => 
            allowedIds.has(tag.mood_tag_id)
        );

        res.render('recommendations', {
            films: recommendationData.films,
            pageTitle: recommendationData.pageTitle,
            allMoodTags: filteredMoodTags, 
            currentMoodId: moodTagId  
        });

    } catch (err) {
        console.error('Помилка getRecommendationsPage:', err);
        res.status(500).send("Помилка сервера");
    }
};

exports.getFilmEditPage = async (req, res) => {
    try {
        const filmId = req.params.id;

        const [
            film,
            allGenres,
            currentGenreIds,
            countryStrings
        ] = await Promise.all([
            movieRepo.getFilmDetails(filmId),
            movieRepo.getAllGenres(),
            movieRepo.getFilmGenreIds(filmId), 
            movieRepo.getAllCountryStrings()
        ]);

        if (!film) {
            return res.status(404).send("Фільм не знайдено");
        }

        const imdbRatingList = [];
        for (let i = 10.0; i >= 1.0; i -= 0.1) {
            imdbRatingList.push(i.toFixed(1));
        }

        let durationValue = null;
        if (film.duration) {
            durationValue = Number.parseInt(film.duration, 10) || null;
        }

        let yearStart = film.release_year || "";
        let yearEnd = film.release_year || "";
        if (String(film.release_year).includes('-')) {
            const years = film.release_year.split('-');
            yearStart = years[0];
            yearEnd = years[1];
        }

        const countrySet = new Set();
        countryStrings.forEach(str => {
            const countries = str.split(','); 
            if (countries) {
                countries.forEach(country => {
                    if (country.trim()) countrySet.add(country.trim());
                });
            }
        });
        const allCountries = Array.from(countrySet).sort((a, b) => a.localeCompare(b));

        const allYears = [];
        for (let year = new Date().getFullYear() + 1; year >= 1888; year--) {
            allYears.push(year);
        }

        res.render('film-edit', {
            film: film,
            allGenres: allGenres,
            currentGenreIds: currentGenreIds,
            allCountries: allCountries,
            allYears: allYears,
            yearStart: yearStart,
            yearEnd: yearEnd,
            
            imdbRatingList: imdbRatingList, 
            durationValue: durationValue  
        });

    } catch (err) {
        console.error("Помилка getFilmEditPage:", err);
        res.status(500).send("Помилка сервера");
    }
};

/**
 * Обробляє POST /film/:id/edit
 * Зберігає зміни фільму.
 */

exports.handleUpdateFilm = async (req, res) => {
    try {
        const filmId = req.params.id;
        const adminUserId = req.session.user.id;
        
        const {
            poster_url,
            description,
            year_start,
            year_end,
            imdb_rating,
            age_limit,    
            duration,    
            country,
            genre
        } = req.body;

        let release_year;
        if (year_start && year_end) {
            release_year = (year_start === year_end) ? year_start : `${year_start}-${year_end}`;
        } else {
            release_year = year_start || null;
        }
        
        const genreIds = [].concat(genre || []);

        let formattedAgeLimit = null;
        if (age_limit) {
            formattedAgeLimit = `${age_limit}+`;
        }

        let formattedDuration = null;
        if (duration) {
            formattedDuration = `${duration} хв`;
        }

        const filmData = {
            poster_url,
            description,
            release_year,
            imdb_rating,
            age_limit: formattedAgeLimit, 
            duration: formattedDuration,  
            country,
            genreIds
        };

        await movieRepo.updateFilmDetails(filmId, filmData);
        logRepo.logAdminAction(adminUserId, 'edit_film', filmId);

        res.redirect(`/film/${filmId}?success=true`); 
    
    } catch (err) {
        console.error("Помилка handleUpdateFilm:", err);
        res.status(500).send("Помилка сервера");
    }
};

exports.handleDeleteFilm = async (req, res) => {
    try {
        const filmId = req.params.id;
        const adminUserId = req.session.user.id; 
        
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ message: "Будь ласка, введіть пароль для підтвердження." });
        }
        const adminUser = await userRepo.findUserById(adminUserId);

        const isMatch = await security.verifyPassword(password, adminUser.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Неправильний пароль. Видалення скасовано." });
        }
        await movieRepo.deleteFilmById(filmId);
        
        logRepo.logAdminAction(adminUserId, 'delete_film', filmId);
        console.log(`[Admin] Фільм з ID: ${filmId} успішно видалено.`);
        
        res.status(200).json({ 
            message: "Фільм успішно видалено!",
            redirectUrl: '/' 
        });
    
    } catch (err) {
        console.error("Помилка handleDeleteFilm:", err);
        res.status(500).json({ message: "Помилка сервера" });
    }
};
