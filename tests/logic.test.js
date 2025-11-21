const logic = require('../services/logic');

describe('Business Logic Unit Tests', () => {

    // ==========================================
    // ТЕСТИ ОБРОБКИ ДАНИХ (Фільтри)
    // ==========================================

    // --- Обробка країн ---
    test('processCountries: should split, trim and sort countries unique', () => {
        const input = ["США, Канада", "Франція", "США", "  "];
        const result = logic.processCountries(input);
        expect(result).toEqual(["Канада", "США", "Франція"]);
    });

    test('processCountries: should handle empty or invalid input', () => {
        expect(logic.processCountries([])).toEqual([]);
        expect(logic.processCountries(null)).toEqual([]);
    });

    // --- Обробка тривалості ---
    test('calculateDurationLimits: should find correct min and max from strings', () => {
        const input = ["100 хв", "90", "200 хв", "invalid"];
        const result = logic.calculateDurationLimits(input);
        expect(result).toEqual({ min: 90, max: 200 });
    });

    test('calculateDurationLimits: should return defaults for empty data', () => {
        expect(logic.calculateDurationLimits([])).toEqual({ min: 60, max: 240 });
        expect(logic.calculateDurationLimits(["abc", "def"])).toEqual({ min: 60, max: 240 });
    });


    // ==========================================
    // ТЕСТИ ВАЛІДАЦІЇ (Безпека та Форми)
    // ==========================================

    // --- Валідація Оцінок (0-5) ---
    test('isValidStarRating: should allow 0-5', () => {
        expect(logic.isValidStarRating(0)).toBe(true);  
        expect(logic.isValidStarRating(5)).toBe(true);
        expect(logic.isValidStarRating("3")).toBe(true); 
    });

    test('isValidStarRating: should reject invalid numbers', () => {
        expect(logic.isValidStarRating(6)).toBe(false);
        expect(logic.isValidStarRating(-1)).toBe(false);
        expect(logic.isValidStarRating("abc")).toBe(false);
        expect(logic.isValidStarRating(null)).toBe(false);
    });

    // --- Валідація Пароля (Regex) ---
    test('isValidPassword: should accept strong password', () => {
        expect(logic.isValidPassword('StrongPass1!')).toBe(true);
        expect(logic.isValidPassword('MyP@ssw0rd')).toBe(true);
    });

    test('isValidPassword: should reject weak passwords', () => {
        expect(logic.isValidPassword('weak')).toBe(false);        
        expect(logic.isValidPassword('NoDigit!')).toBe(false);   
        expect(logic.isValidPassword('nouppercase1!')).toBe(false); 
        expect(logic.isValidPassword('NoSpecial1')).toBe(false);  
        expect(logic.isValidPassword('')).toBe(false);          
    });

    // --- Валідація Співпадіння Паролів ---
    test('doPasswordsMatch: should compare correctly', () => {
        expect(logic.doPasswordsMatch('123', '123')).toBe(true);
        expect(logic.doPasswordsMatch('123', '124')).toBe(false);
    });

    // --- Валідація Дати Народження ---
    test('isValidDob: should accept valid dates', () => {
        expect(logic.isValidDob('2000-01-01')).toBe(true);
        expect(logic.isValidDob('1920-01-01')).toBe(true); 
    });

    test('isValidDob: should reject invalid dates', () => {
        expect(logic.isValidDob('1919-12-31')).toBe(false);
        const future = new Date();
        future.setFullYear(future.getFullYear() + 1);
        expect(logic.isValidDob(future.toISOString())).toBe(false); 
        expect(logic.isValidDob('not-a-date')).toBe(false); 
        expect(logic.isValidDob(null)).toBe(false);
    });

    // --- Валідація Статі ---
    test('isValidGender: should accept m, f, a', () => {
        expect(logic.isValidGender('m')).toBe(true);
        expect(logic.isValidGender('f')).toBe(true);
        expect(logic.isValidGender('a')).toBe(true);
    });

    test('isValidGender: should reject others', () => {
        expect(logic.isValidGender('male')).toBe(false);
        expect(logic.isValidGender('x')).toBe(false);
        expect(logic.isValidGender('')).toBe(false);
    });

    test('isValidSearchQuery: should accept valid queries', () => {
        expect(logic.isValidSearchQuery('Barbie')).toBe(true);
        expect(logic.isValidSearchQuery('Матриця')).toBe(true);
        expect(logic.isValidSearchQuery('1+1')).toBe(true);
        expect(logic.isValidSearchQuery('  Dune  ')).toBe(true); 
    });

    test('isValidSearchQuery: should reject too short queries', () => {
        expect(logic.isValidSearchQuery('a')).toBe(false);
        expect(logic.isValidSearchQuery('1')).toBe(false);
        expect(logic.isValidSearchQuery('')).toBe(false);
        expect(logic.isValidSearchQuery(null)).toBe(false);
    });

    test('isValidSearchQuery: should reject queries without letters/digits', () => {
        expect(logic.isValidSearchQuery('...')).toBe(false);
        expect(logic.isValidSearchQuery('?!')).toBe(false);
        expect(logic.isValidSearchQuery('   ')).toBe(false);
    });

    test('isValidSearchQuery: should reject repetitive characters', () => {
        expect(logic.isValidSearchQuery('aaaaa')).toBe(false);
        expect(logic.isValidSearchQuery('11111')).toBe(false);
        expect(logic.isValidSearchQuery('abba')).toBe(true);
    });

});