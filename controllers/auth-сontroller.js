const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/user-repository');

// Обробка POST /register
exports.handleRegister = async (req, res) => {
    try {
        const { email, password, confirm_password, gender, dob } = req.body;

        // --- Валідація ---
        if (!email || !password || !confirm_password || !gender || !dob) {
            return res.status(400).json({ message: "Будь ласка, заповніть всі поля" });
        }
        if (password !== confirm_password) {
            return res.status(400).json({ message: "Паролі не співпадають" });
        }
        // --- 2.  СЕРВЕРНА ВАЛІДАЦІЯ ---
        const passwordRegex = /^(?=.*\d)(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        const userDob = new Date(dob);
        const minDate = new Date('1920-01-01');
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: "Пароль не відповідає вимогам (мін. 8 символів, 1 велика, 1 цифра, 1 спец. символ)." });
        }
        if (userDob < minDate) {
            return res.status(400).json({ message: "Дата народження не може бути раніше 01.01.1920." });
        }
        if (userDob > today) {
            return res.status(400).json({ message: "Дата народження не може бути у майбутньому." });
        }
        
        const existingUser = await userRepo.findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: "Користувач з таким email вже існує" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await userRepo.createUser(email, hashedPassword, gender, dob);
        
        // Повернення JSON про успіх
        return res.status(201).json({ message: "Реєстрація успішна! Тепер ви можете увійти." });

    } catch (err) {
        console.error('Помилка реєстрації:', err);
        return res.status(500).json({ message: "Помилка сервера" });
    }
};

// Обробка POST /login
exports.handleLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userRepo.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ message: "Користувача з таким email не знайдено" });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Неправильний пароль" });
        }

        req.session.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        
        req.session.save((err) => {
            if (err) {
                console.error("Помилка збереження сесії:", err);
                return res.status(500).json({ message: "Помилка сервера при збереженні сесії" });
            }
            return res.status(200).json({ message: "Вхід успішний" });
        });

    } catch (err) {
        console.error('Помилка входу:', err);
        return res.status(500).json({ message: "Помилка сервера" });
    }
};

// Обробка GET /logout
exports.handleLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Помилка виходу:", err);
        }
        res.redirect('/'); 
    });
};

/**
 * Обробка POST /profile/update
 * Оновлює особисті дані користувача.
 */
exports.handleUpdateProfile = async (req, res) => {
    try {
        // Береться ID користувача з сесії
        const userId = req.session.user.id;
        // + нові дані з форми
        const { gender, dob } = req.body;

        // Валідація 
        const userDob = new Date(dob);
        const minDate = new Date('1920-01-01');
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (userDob < minDate || userDob > today) {
            return res.status(400).json({ message: "Вказана некоректна дата народження." });
        }
        if (!['m', 'f', 'a'].includes(gender)) {
            return res.status(400).json({ message: "Обрана некоректна стать." });
        }

        // Оновлення даних в БД
        await userRepo.updateUserProfile(userId, gender, dob);

        return res.status(200).json({ message: "Дані успішно оновлено!" });

    } catch (err) {
        console.error('Помилка оновлення профілю:', err);
        return res.status(500).json({ message: "Помилка сервера. Спробуйте пізніше." });
    }
};

exports.handleChangePassword = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { old_password, new_password, confirm_new_password } = req.body;

        // 1. Валідація
        if (!old_password || !new_password || !confirm_new_password) {
            return res.status(400).json({ message: "Будь ласка, заповніть всі поля пароля." });
        }
        if (new_password !== confirm_new_password) {
            return res.status(400).json({ message: "Новий пароль та підтвердження не співпадають." });
        }
        
        // 2. Валідація складності нового пароля
        const passwordRegex = /^(?=.*\d)(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(new_password)) {
            return res.status(400).json({ message: "Новий пароль не відповідає вимогам безпеки (мін. 8 символів, 1 велика, 1 цифра, 1 спец. символ)." });
        }

        // 3. Перевірка старого пароля
        const user = await userRepo.findUserById(userId);
        const isMatch = await bcrypt.compare(old_password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Старий пароль введено неправильно." });
        }

        // --- 4.ПЕРЕВІРКА: Чи не співпадає новий пароль зі старим? ---
        const isSameAsOld = await bcrypt.compare(new_password, user.password_hash);
        if (isSameAsOld) {
            return res.status(400).json({ message: "Новий пароль не повинен співпадати зі старим." });
        }
        // --- ----------------------------------------------------- ---

        // 5. Хешування та збереження 
        const salt = await bcrypt.genSalt(10);
        const newHashedPassword = await bcrypt.hash(new_password, salt);
        await userRepo.updateUserPassword(userId, newHashedPassword);
        
        return res.status(200).json({ message: "Пароль успішно оновлено!" });

    } catch (err) {
        console.error('Помилка зміни пароля:', err);
        return res.status(500).json({ message: "Помилка сервера." });
    }
};

/**
 * Обробка POST /profile/delete-account
 * Видаляє акаунт користувача.
 */
exports.handleDeleteAccount = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { password } = req.body; // Пароль для підтвердження

        if (!password) {
            return res.status(400).json({ message: "Будь ласка, введіть пароль для підтвердження." });
        }

        // 1. Перевірка пароля
        const user = await userRepo.findUserById(userId);
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Пароль введено неправильно. Акаунт не видалено." });
        }

        // 2. Видалення
        await userRepo.deleteUserById(userId);

        // 3. Вихід (знищення сесії)
        req.session.destroy((err) => {
            if (err) {
                console.error("Помилка під час знищення сесії при видаленні акаунта:", err);
                return res.status(500).json({ message: "Акаунт видалено, але сталася помилка виходу." });
            }
            return res.status(200).json({ message: "Акаунт успішно видалено.", redirectUrl: '/' });
        });

    } catch (err) {
        console.error('Помилка видалення акаунта:', err);
        return res.status(500).json({ message: "Помилка сервера." });
    }
};