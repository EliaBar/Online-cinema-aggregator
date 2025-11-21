const userRepo = require('../repositories/user-repository');
const logic = require('../services/logic'); 
const security = require('../services/security'); 

exports.handleRegister = async (req, res) => {
    try {
        const { email, password, confirm_password, gender, dob } = req.body;

        if (!email || !password || !confirm_password || !gender || !dob) {
            return res.status(400).json({ message: "Будь ласка, заповніть всі поля" });
        }

        if (!logic.doPasswordsMatch(password, confirm_password)) {
            return res.status(400).json({ message: "Паролі не співпадають" });
        }
        if (!logic.isValidPassword(password)) {
            return res.status(400).json({ message: "Пароль не відповідає вимогам (мін. 8 символів, 1 велика, 1 цифра, 1 спец. символ(@$!%*?&))." });
        }
        if (!logic.isValidDob(dob)) {
            return res.status(400).json({ message: "Некоректна дата народження." });
        }
        if (!logic.isValidGender(gender)) {
             return res.status(400).json({ message: "Обрана некоректна стать." });
        }
        
        const existingUser = await userRepo.findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: "Користувач з таким email вже існує" });
        }

        const hashedPassword = await security.hashPassword(password);
        
        await userRepo.createUser(email, hashedPassword, gender, dob);
        
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

        const isMatch = await security.verifyPassword(password, user.password_hash);
        
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
            return res.status(500).json({ message: "Помилка під час виходу." });
        }
        res.status(200).json({ message: "Ви успішно вийшли з системи!" });
    });
};

// Обробка POST /profile/update
exports.handleUpdateProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { gender, dob } = req.body;

        if (!logic.isValidDob(dob)) {
            return res.status(400).json({ message: "Вказана некоректна дата народження." });
        }
        if (!logic.isValidGender(gender)) {
            return res.status(400).json({ message: "Обрана некоректна стать." });
        }

        await userRepo.updateUserProfile(userId, gender, dob);

        return res.status(200).json({ message: "Дані успішно оновлено!" });

    } catch (err) {
        console.error('Помилка оновлення профілю:', err);
        return res.status(500).json({ message: "Помилка сервера. Спробуйте пізніше." });
    }
};

// Обробка POST /profile/change-password
exports.handleChangePassword = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { old_password, new_password, confirm_new_password } = req.body;

        if (!old_password || !new_password || !confirm_new_password) {
            return res.status(400).json({ message: "Будь ласка, заповніть всі поля пароля." });
        }
        
        // Використовуємо utils/logic
        if (!logic.doPasswordsMatch(new_password, confirm_new_password)) {
            return res.status(400).json({ message: "Новий пароль та підтвердження не співпадають." });
        }
        if (!logic.isValidPassword(new_password)) {
            return res.status(400).json({ message: "Новий пароль не відповідає вимогам безпеки." });
        }

        const user = await userRepo.findUserById(userId);
        
        const isMatch = await security.verifyPassword(old_password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Старий пароль введено неправильно." });
        }

        const isSameAsOld = await security.verifyPassword(new_password, user.password_hash);
        if (isSameAsOld) {
            return res.status(400).json({ message: "Новий пароль не повинен співпадати зі старим." });
        }

        const newHashedPassword = await security.hashPassword(new_password);
        await userRepo.updateUserPassword(userId, newHashedPassword);
        
        return res.status(200).json({ message: "Пароль успішно оновлено!" });

    } catch (err) {
        console.error('Помилка зміни пароля:', err);
        return res.status(500).json({ message: "Помилка сервера." });
    }
};

// Обробка POST /profile/delete-account
exports.handleDeleteAccount = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { password } = req.body; 

        if (!password) {
            return res.status(400).json({ message: "Будь ласка, введіть пароль для підтвердження." });
        }

        const user = await userRepo.findUserById(userId);
        
        const isMatch = await security.verifyPassword(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Пароль введено неправильно. Акаунт не видалено." });
        }

        await userRepo.deleteUserById(userId);

        req.session.destroy((err) => {
            if (err) {
                console.error("Помилка під час знищення сесії:", err);
                return res.status(500).json({ message: "Акаунт видалено, але сталася помилка виходу." });
            }
            return res.status(200).json({ message: "Акаунт успішно видалено.", redirectUrl: '/' });
        });

    } catch (err) {
        console.error('Помилка видалення акаунта:', err);
        return res.status(500).json({ message: "Помилка сервера." });
    }
};