/**
 * Обробляє вхідний список країн, щоб повернути для пошуку всі країни без повторень.
 */
exports.processCountries = (countryStrings) => {
    if (!Array.isArray(countryStrings)) return [];
    const countrySet = new Set();
    countryStrings.forEach(str => {
        if (typeof str === 'string') {
            const countries = str.split(',');
            countries.forEach(country => {
                const trimmed = country.trim();
                if (trimmed) countrySet.add(trimmed);
            });
        }
    });
    return Array.from(countrySet).sort((a, b) => b - a);
};

/**
 * Приймає масив рядків ["22 хв", "120 хв", "NULL"]
 * Повертає об'єкт { min: 22, max: 120 }
 */
exports.calculateDurationLimits = (durationStrings) => {
    if (!Array.isArray(durationStrings) || durationStrings.length === 0) {
        return { min: 60, max: 240 }; // Дефолтні значення
    }

    const numbers = durationStrings
        .map(str => {
            if (typeof str !== 'string') return 0;
            // шукає першу групу цифр
            const match = str.match(/^(\d+)/); 
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0); // Прибирає нулі та помилки

    if (numbers.length === 0) {
        return { min: 60, max: 240 };
    }

    return {
        min: Math.min(...numbers),
        max: Math.max(...numbers)
    };
};

/**
 * Перевіряє, чи є оцінка валідною (0, 1, 2, 3, 4, 5).
 * Приймає рядок або число.
 */
exports.isValidStarRating = (rating) => {
    const val = parseInt(rating, 10);
    return !isNaN(val) && [0, 1, 2, 3, 4, 5].includes(val);
};

/**
 * Перевіряє складність пароля.
 * Мін. 8 символів, 1 велика літера, 1 цифра, 1 спец. символ.
 */
exports.isValidPassword = (password) => {
    if (!password) return false;
    // Ваш Regex
    const regex = /^(?=.*\d)(?=.*[A-Z])(?=.*[@$!%*?#&])[A-Za-z\d@@$!%*?#&]{8,}$/;
    return regex.test(password);
};

/**
 * Перевіряє дату народження.
 * дата має бути в діапазоні: від 01.01.1920 до сьогодні.
 */
exports.isValidDob = (dob) => {
    if (!dob) return false;
    const date = new Date(dob);
    const minDate = new Date('1920-01-01');
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Кінець поточного дня

    // Перевіряє, чи дата валідна (не NaN)
    if (isNaN(date.getTime())) return false;

    return date >= minDate && date <= today;
};

/**
 * Перевіряє валідність статі.
 */
exports.isValidGender = (gender) => {
    return ['m', 'f', 'a'].includes(gender);
};

/**
 * Перевіряє, чи співпадають паролі.
 */
exports.doPasswordsMatch = (p1, p2) => {
    return p1 === p2;
};

/**
 * Перевіряє коректіність невдалого запиту перед збереження в бд, щоб не обробляти сміття.
 */

exports.isValidSearchQuery = (queryText) => {
    if (!queryText || typeof queryText !== 'string') return false;
    
    const cleanQuery = queryText.toLowerCase().trim();

    // 1. Довжина (не менше 2 символів)
    if (cleanQuery.length < 2) {
        return false;
    }

    // 2. Має містити хоча б одну літеру або цифру
    // (Латиниця, кирилиця, цифри)
    const hasMeaningfulChars = /[a-zA-Z0-9а-яА-ЯіІїЇєЄґҐ]/.test(cleanQuery);
    if (!hasMeaningfulChars) {
        return false;
    }

    // 3. Не складається з однакових символів, на приклад, "аааааа"
    const isRepetitive = /^(.)\1+$/.test(cleanQuery);
    if (isRepetitive) {
        return false;
    }

    return true;
};
