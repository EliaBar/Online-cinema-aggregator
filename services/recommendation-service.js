const ratingRepo = require('../repositories/rating-repository');
const recRepo = require('../repositories/recommendation-repository');
const topFilmsRepo = require('../repositories/top-films');
const movieRepo = require('../repositories/movie-repository'); 

/**
 * Система рекомндацій
 */
exports.getRecommendationsForUser = async (userId, moodTagId = null) => {
    
    // --- 1. Перевірка чи залишав користувач відгуки
    const userHasRatings = await ratingRepo.checkUserHasRatings(userId);

    // Якщо користувач новий або просто не має відгуків( (холодний старт)   
    if (!userHasRatings) {
        console.log(`[RecService] Користувач ${userId} (холодний старт).`);
        
        // Якщо новий користувач обрав емоцію
        if (moodTagId) {
            console.log(`[RecService] ...шукає за емоцією ${moodTagId}. Використовуємо резервну логіку.`);
            const topMoodFilms = await movieRepo.getTopFilmsByMoodTag(moodTagId);
            return {
                pageTitle: "Найпопулярніше за цим настроєм",
                films: topMoodFilms
            };
        }
        
        // Якщо новий користувач не обрав емоцію
        console.log(`[RecService] ...емоцію не обрано. Повертаємо Топ-рейтинг сайту.`);
        const topFilms = await topFilmsRepo.getTopPlatformRatedFilms();
        return {
            pageTitle: "Найпопулярніше на FilmForToday",
            films: topFilms
        };
    }

    // --- 2. Якщо користувач залишав відгуки ---
    console.log(`[RecService] Користувач ${userId} має оцінки. Запускаємо Item-Base...`);
    let recommendations = await recRepo.getItemBaseRecommendations(userId);
    let pageTitle = "Рекомендовано для Вас";

    //Якщо Item-Base нічого не знайшов
    if (recommendations.length === 0) {
        console.log(`[RecService] Item-Base нічого не знайшов. Вмикаємо резервну логіку...`);
        recommendations = await topFilmsRepo.getTopPlatformRatedFilms();
        pageTitle = "Найпопулярніше на FilmForToday";
    }

    // --- 3. Якщо був застосований фільтр з емоціями ---
    if (moodTagId) {
        console.log(`[RecService] ...фільтруємо ${recommendations.length} рекомендацій за емоцією ${moodTagId}`);

        // Отримує ID фільмів з рекомендацій, знаходить, які з них мають потрібний тег та фільтрує
        const filmIds = recommendations.map(f => f.id);
        const moodFilmIds = await movieRepo.getFilmIdsByMood(filmIds, moodTagId); 
        const filteredRecs = recommendations.filter(f => moodFilmIds.includes(f.id));
        
        //  Якщо серед рекомендацій є фільми з таким тегом, повертає їх
        if (filteredRecs.length > 0) {
            console.log(`[RecService] ...знайдено ${filteredRecs.length} персоналізованих фільмів.`);
            return { pageTitle: "Персоналізовано за настроєм", films: filteredRecs };
        } else {
            // 4. Якщо серед рекомендацій немає жодного фільму з таким тегом, повертає резервну логіку
            console.log(`[RecService] ...персоналізованих 0. Запускаємо резервну логіку для емоції ${moodTagId}.`);
            const topMoodFilms = await movieRepo.getTopFilmsByMoodTag(moodTagId);
            return {
                pageTitle: "Найпопулярніше за цим настроєм",
                films: topMoodFilms
            };
        }
    }

    // Якщо фільтр емоцій не був застосований, повертає стандартні рекомендації
    return { pageTitle, films: recommendations };
};