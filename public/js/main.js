 /**
 * Створює спливаюче "toast" сповіщення.
 * @param {string} message - Текст повідомлення
 * @param {string} type - 'success' (зелений) або 'error' (червоний)
 * @param {number} duration - Час у мс 
 */
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return; 

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.4s ease forwards';
        
        setTimeout(() => {
            if (toast.parentNode === container) {
                container.removeChild(toast);
            }
        }, 400); 
        
    }, duration);
}
 
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

    // === ЛОГІКА МОДАЛЬНИХ ВІКОН ВХОДУ ===
    const authModalOverlay = document.getElementById("auth-modal-overlay");
    const loginModal = document.getElementById("login-modal");
    const registerModal = document.getElementById("register-modal");
    const userIconBtn = document.getElementById("user-icon-btn");
    const personalCabinetBtn = document.getElementById("personal-cabinet-btn");
    const loginLinkFromRating = document.getElementById("login-link-from-rating");
    const goToRegisterBtn = document.getElementById("go-to-register");
    const goToLoginBtn = document.getElementById("go-to-login");
    const closeModalBtns = document.querySelectorAll(".close-modal-btn");

    // ---  Редірект після входу в акаунт---
    // Ця змінна буде зберігати, куди перекинути користувача після входу
    let postLoginRedirectUrl = '/'; // За замовчуванням - на головну

    const openModal = (redirectUrl) => {
        // Записується, звідки прийшов користувач
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

    // ===  ЛОГІКА ВІДПРАВКИ ФОРМ (AJAX/FETCH) ===

    // --- Форма Входу ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault(); 
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
                    showToast(result.message, 'success'); 
                    setTimeout(() => {
                        window.location.href = postLoginRedirectUrl; 
                    }, 1000); 
                } else {
                    showToast(result.message, 'error');
                }
            } catch (err) {
                showToast('Помилка мережі. Спробуйте пізніше.', 'error'); 
            }
        });
    }
    const registerForm = document.getElementById('register-form');

    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault(); 
            
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());

            const password = data.password;
            const dob = new Date(data.dob);
            const minDate = new Date('1920-01-01');
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            const passwordRegex = /^(?=.*\d)(?=.*[A-Z])(?=.*[@$!%*?#&_-])[A-Za-z\d@$!%*?#&_-]{8,}$/;

            if (password !== data.confirm_password) {
                showToast('Паролі не співпадають.', 'error');
                return; 
            }
            if (!passwordRegex.test(password)) {
                showToast('Пароль (мін. 8 символів, 1 велика, 1 цифра, 1 спец. символ).', 'error');
                return;
            }
            if (dob < minDate) {
                showToast('Дата народження не може бути раніше 1920 року.', 'error');
                return;
            }
            if (dob > today) {
                showToast('Дата народження не може бути у майбутньому.', 'error');
                return;
            }
 
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showToast(result.message, 'success');
                    registerForm.reset(); 
                } else {
                    showToast(result.message, 'error');
                }
            } catch (err) {
                showToast('Помилка мережі. Спробуйте пізніше.', 'error');
            }
        });
    }
    // ===  ЛОГІКА ДЛЯ ПЕРЕМИКАННЯ ВИДИМОСТІ ПАРОЛЯ ===


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

