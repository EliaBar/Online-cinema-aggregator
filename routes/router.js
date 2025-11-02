const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page-controller');
const authController = require('../controllers/auth-сontroller');
const ratingController = require('../controllers/rating-controller')
const authMiddleware = require('../middleware/auth-middleware');

// Головна сторінка
router.get('/', pageController.getHomePage);

router.get('/search-results', pageController.getSearchResults);

router.get('/about', pageController.getAboutPage);
router.get('/profile', authMiddleware.isAuthenticated, pageController.getProfilePage);

router.post('/register', authController.handleRegister);
router.post('/login', authController.handleLogin);
router.get('/logout', authController.handleLogout);

router.post('/profile/update', authMiddleware.isAuthenticated, authController.handleUpdateProfile);

router.post('/profile/change-password', authMiddleware.isAuthenticated, authController.handleChangePassword);
router.post('/profile/delete-account', authMiddleware.isAuthenticated, authController.handleDeleteAccount);

router.get('/film/:id', pageController.getFilmDetailsPage);
router.post('/film/:id/rate-star', authMiddleware.isAuthenticated, ratingController.postStarRating);
router.post('/film/:id/rate-mood', authMiddleware.isAuthenticated, ratingController.postMoodRating);

module.exports = router;