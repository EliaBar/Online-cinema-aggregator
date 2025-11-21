const bcrypt = require('bcryptjs');
/**
 * Хешує пароль.
 * @param {string} password - Відкритий пароль
 * @returns {Promise<string>} - Хеш пароля
 */
exports.hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

/**
 * Перевіряє, чи підходить пароль до хешу.
 * @param {string} password - Відкритий пароль
 * @param {string} hash - Хеш з бази даних
 * @returns {Promise<boolean>} - true, якщо збігаються
 */
exports.verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};