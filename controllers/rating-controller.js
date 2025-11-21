const ratingRepo = require('../repositories/rating-repository');
const logic = require('../services/logic');

exports.postStarRating = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const filmId = req.params.id;
        
        const { rating_value } = req.body; 

        if (!logic.isValidStarRating(rating_value)) {
            return res.status(400).json({ message: "Некоректна оцінка." });
        }

        if (rating_value === 0) {
            await ratingRepo.deleteStarRating(userId, filmId);
            res.status(200).json({ message: "Оцінку видалено!" });
        } else {
            await ratingRepo.saveStarRating(userId, filmId, rating_value);
            res.status(200).json({ message: "Оцінку збережено!" });
        }

    } catch (err) {
        res.status(500).json({ message: "Помилка сервера." });
    }
};

exports.postMoodRating = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const filmId = req.params.id;
        const { mood_tag_ids } = req.body;

        if (!Array.isArray(mood_tag_ids)) {
            return res.status(400).json({ message: "Некоректний формат даних." });
        }

        await ratingRepo.saveMoodRatings(userId, filmId, mood_tag_ids);
        res.status(200).json({ message: "Емоції збережено!" });

    } catch (err) {
        res.status(500).json({ message: "Помилка сервера." });
    }
};