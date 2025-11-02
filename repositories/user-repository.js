const pool = require('../config/db');

exports.createUser = async (email, hashedPassword, gender, dob) => {
    try {
        const [result] = await pool.execute(
            "INSERT INTO users (email, password_hash, date_of_birth, gender, role) VALUES (?, ?, ?, ?, 'user')",
            [email, hashedPassword, dob, gender] 
        );
        return result.insertId;
    } catch (err) {
        console.error('Помилка в userRepository (createUser):', err);
        throw err;
    }
};

exports.findUserByEmail = async (email) => {
    try {
        // Використовуємо ваші назви: email
        const [rows] = await pool.execute(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );
        return rows[0]; 
    } catch (err) {
        console.error('Помилка в userRepository (findUserByEmail):', err);
        throw err;
    }
};

exports.findUserById = async (id) => {
    try {
        const [rows] = await pool.execute(
            "SELECT id, email, password_hash, date_of_birth, gender, role FROM users WHERE id = ?",
            [id]
        );
        return rows[0]; 
    } catch (err) {
        console.error('Помилка в userRepository (findUserById):', err);
        throw err;
    }
};


/**
 * Оновлює особисті дані (стать, дата народження) для користувача.
 */
exports.updateUserProfile = async (userId, gender, dob) => {
    try {
        const [result] = await pool.execute(
            "UPDATE users SET gender = ?, date_of_birth = ? WHERE id = ?",
            [gender, dob, userId]
        );
        return result.affectedRows > 0; // Поверне true, якщо оновлення відбулось
    } catch (err) {
        console.error('Помилка в userRepository (updateUserProfile):', err);
        throw err;
    }
};

exports.updateUserPassword = async (userId, newHashedPassword) => {
    try {
        await pool.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            [newHashedPassword, userId]
        );
        return true;
    } catch (err) {
        console.error('Помилка в userRepository (updateUserPassword):', err);
        throw err;
    }
};

/**
 * Повністю видаляє користувача з бази даних.
 */
exports.deleteUserById = async (userId) => {
    try {
        await pool.execute(
            "DELETE FROM users WHERE id = ?",
            [userId]
        );
        return true;
    } catch (err) {
        console.error('Помилка в userRepository (deleteUserById):', err);
        throw err;
    }
};