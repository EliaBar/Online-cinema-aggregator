 document.addEventListener("DOMContentLoaded", function() {
    // ===  Логіка перемикання Теми ===
    const themeToggleBtn = document.getElementById("theme-toggle");
    const body = document.body;
    
    if (themeToggleBtn) {
        const themeIcon = themeToggleBtn.querySelector('i');
        
        const applyTheme = (theme) => {
            if (theme === 'dark') {
                body.classList.add('dark-theme');
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            } else {
                body.classList.remove('dark-theme');
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            }
        };

        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);

        themeToggleBtn.addEventListener("click", function() {
            let newTheme = body.classList.contains('dark-theme') ? 'light' : 'dark';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    } else {
        console.error("Помилка: не вдалося знайти кнопку перемикання теми.");
    }


     // === ЛОГІКА БІЧНОГО МЕНЮ ===
    const menuToggleBtn = document.getElementById("menu-toggle");
    const menuCloseBtn = document.getElementById("menu-close");
    const sideMenu = document.getElementById("side-menu");
    const menuOverlay = document.getElementById("menu-overlay");

    if (menuToggleBtn && menuCloseBtn && sideMenu && menuOverlay) {
        
        // Функція відкриття меню
        const openMenu = () => {
            sideMenu.classList.add('is-active');
            menuOverlay.classList.add('is-active');
        };

        // Функція закриття меню
        const closeMenu = () => {
            sideMenu.classList.remove('is-active');
            menuOverlay.classList.remove('is-active');
        };

        // Обробники подій
        menuToggleBtn.addEventListener("click", openMenu); 
        menuCloseBtn.addEventListener("click", closeMenu); 
        menuOverlay.addEventListener("click", closeMenu); 
    } else {
        console.error("Помилка: не вдалося знайти елементи бічного меню.");
    }

    // === БЛОК 5: ЛОГІКА МОДАЛЬНИХ ВІКОН ВХОДУ ===
    const authModalOverlay = document.getElementById("auth-modal-overlay");
    const loginModal = document.getElementById("login-modal");
    const registerModal = document.getElementById("register-modal");
    const userIconBtn = document.getElementById("user-icon-btn");
    const personalCabinetBtn = document.getElementById("personal-cabinet-btn");
    const loginLinkFromRating = document.getElementById("login-link-from-rating");
    const goToRegisterBtn = document.getElementById("go-to-register");
    const goToLoginBtn = document.getElementById("go-to-login");
    const closeModalBtns = document.querySelectorAll(".close-modal-btn");

    // --- 1. Редірект після входу в акаунт---
    // Ця змінна буде зберігати, куди перекинути користувача після входу
    let postLoginRedirectUrl = '/'; // За замовчуванням - на головну

    const openModal = (redirectUrl) => {
        // 2. Записується, звідки прийшов користувач
        postLoginRedirectUrl = redirectUrl; 
        
        if (authModalOverlay) {
            authModalOverlay.classList.add("is-active");
            loginModal.classList.remove("is-hidden");
            registerModal.classList.add("is-hidden");
        }
    };

    const closeModal = () => {
        if (authModalOverlay) {
            authModalOverlay.classList.remove("is-active");
        }
    };

    // --- Прив'язка подій ---
    if (userIconBtn) {
        userIconBtn.addEventListener("click", () => openModal('/'));
    }
    if (personalCabinetBtn) {
        personalCabinetBtn.addEventListener("click", () => openModal('/profile'));
    }
    if (authModalOverlay) {
        authModalOverlay.addEventListener("click", function(event) {
            if (event.target === authModalOverlay) {
                closeModal();
            }
        });
    }
    if (loginLinkFromRating) {
    loginLinkFromRating.addEventListener("click", (e) => {
        e.preventDefault(); 
        openModal(window.location.pathname); 
    });
    }
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener("click", closeModal);
    });
    if (goToRegisterBtn && loginModal && registerModal) {
        goToRegisterBtn.addEventListener("click", () => {
            loginModal.classList.add("is-hidden");
            registerModal.classList.remove("is-hidden");
        });
    }
    if (goToLoginBtn && loginModal && registerModal) {
        goToLoginBtn.addEventListener("click", () => {
            registerModal.classList.add("is-hidden");
            loginModal.classList.remove("is-hidden");
        });
    }

    // === БЛОК 6: ЛОГІКА ВІДПРАВКИ ФОРМИ ВХОДУ ===
    const loginForm = document.getElementById('login-form');
    const loginErrorDiv = document.getElementById('login-error');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault(); 
            loginErrorDiv.textContent = ''; 
            
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) { 
                    // --- 5. ЛОГІКА УСПІХУ ---
                    loginErrorDiv.textContent = result.message + " Перенаправляємо...";
                    loginErrorDiv.style.color = 'green';
                    setTimeout(() => {
                        window.location.href = postLoginRedirectUrl;
                    }, 1000); 
                    
                } else {
                    loginErrorDiv.textContent = result.message;
                }
            } catch (err) {
                loginErrorDiv.textContent = 'Помилка мережі. Спробуйте пізніше.';
            }
        });
    }

    const registerForm = document.getElementById('register-form');
    const registerErrorDiv = document.getElementById('register-error');

    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            // 1. заборона на переезаватаження чторінки
            event.preventDefault(); 
            
            registerErrorDiv.textContent = ''; // Очищення старих помилок
            registerErrorDiv.style.color = 'red'; 
        
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());

            // --- 1. КЛІЄНТСЬКА ВАЛІДАЦІЯ ---
            const password = data.password;
            const dob = new Date(data.dob);
            const minDate = new Date('1920-01-01');
            const today = new Date();
            today.setHours(23, 59, 59, 999); 

            // Regex: мін 8, 1 велика, 1 цифра, 1 спец. символ
            const passwordRegex = /^(?=.*\d)(?=.*[A-Z])(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;

            if (password !== data.confirm_password) {
                registerErrorDiv.textContent = 'Паролі не співпадають.';
                return; 
            }
            if (!passwordRegex.test(password)) {
                registerErrorDiv.textContent = 'Пароль (мін. 8 символів, 1 велика, 1 цифра, 1 спец. символ).';
                return; 
            }
            if (dob < minDate) {
                registerErrorDiv.textContent = 'Дата народження не може бути раніше 1920 року.';
                return; 
            }
            if (dob > today) {
                registerErrorDiv.textContent = 'Дата народження не може бути у майбутньому.';
                return; 
            }

            try {
                // 2. Дані відправляються, якщо валідація пройшла
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {

                    registerErrorDiv.textContent = result.message;
                    registerErrorDiv.style.color = 'green'; 
                    registerForm.reset(); 
                } else {
                    registerErrorDiv.textContent = result.message;
                    registerErrorDiv.style.color = 'red'; 
                }
            } catch (err) {
                registerErrorDiv.textContent = 'Помилка мережі. Спробуйте пізніше.';
            }
        });
    }

    // === БЛОК X: ЛОГІКА ДЛЯ ПЕРЕМИКАННЯ ВИДИМОСТІ ПАРОЛЯ ===


const passwordToggleIcons = document.querySelectorAll('.password-toggle-icon');

passwordToggleIcons.forEach(icon => {
    icon.addEventListener('click', function() {
        const inputField = this.previousElementSibling; 

        if (inputField && inputField.tagName === 'INPUT') {
            if (inputField.type === 'password') {
                inputField.type = 'text';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            } else {
                inputField.type = 'password';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            }
        }
    });
});
 });

