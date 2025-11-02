 document.addEventListener("DOMContentLoaded", function() {
    // === БЛОК 7: ЛОГІКА ВІКОН ПРОФІЛЮ  ===
    // (Працює лише на сторінці /profile)
    const profileTabs = document.querySelectorAll('.profile-tab-link');
    const profileContents = document.querySelectorAll('.profile-content-section');

    if (profileTabs.length > 0 && profileContents.length > 0) {
            profileTabs.forEach(tab => {
                if (!tab.classList.contains('logout-link')) {
                    
                    tab.addEventListener('click', function(event) {
                        event.preventDefault(); 
                        
                        const targetId = tab.getAttribute('data-tab-target');
                        if (!targetId) return;

                        const targetContent = document.querySelector(targetId);
                        if (!targetContent) return;

                        profileTabs.forEach(t => t.classList.remove('is-active'));
                        profileContents.forEach(c => c.classList.remove('is-active'));

                        tab.classList.add('is-active');
                        targetContent.classList.add('is-active');
                    });
                }
            });
        }

    // --- ЛОГІКА ДЛЯ КНОПКИ 'ЗБЕРЕГТИ' ---
    const profileForm = document.getElementById('personal-data-form');
    const genderInput = document.getElementById('profile-gender');
    const dobInput = document.getElementById('profile-dob');
    const saveBtn = document.getElementById('save-profile-btn');
    const personalDataMessage = document.getElementById('personal-data-message');

    if (profileForm && genderInput && dobInput && saveBtn) {
        
        // 1. Зберігаємо початкові значення
        const originalGender = genderInput.value;
        const originalDob = dobInput.value;

        // 2. Функція, яка перевіряє, чи є зміни
        const checkForChanges = () => {
            const genderChanged = genderInput.value !== originalGender;
            const dobChanged = dobInput.value !== originalDob;

            // 3. Активуємо або деактивуємо кнопку
            if (genderChanged || dobChanged) {
                saveBtn.disabled = false;
            } else {
                saveBtn.disabled = true;
            }
        };

        // 4. Додаємо слухачів на поля
        genderInput.addEventListener('change', checkForChanges);
        dobInput.addEventListener('input', checkForChanges);
    }


    // === БЛОК 8: ЛОГІКА ВІДПРАВКИ ФОРМИ ПРОФІЛЮ (AJAX/FETCH) ===
    if (profileForm) {
        profileForm.addEventListener('submit', async function(event) {
            event.preventDefault(); 
            
            personalDataMessage.textContent = ''; 
            saveBtn.disabled = true; 

            const formData = new FormData(profileForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/profile/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    personalDataMessage.textContent = result.message;
                    personalDataMessage.style.color = 'green';
                    // Перезавантажуємо сторінку через 2 секунди
                    setTimeout(() => window.location.reload(), 2000);
                    
                } else {
                    // Помилка
                    personalDataMessage.textContent = result.message;
                    personalDataMessage.style.color = 'red';
                    saveBtn.disabled = false; 
                }

            } catch (err) {
                personalDataMessage.textContent = 'Помилка мережі. Спробуйте пізніше.';
                personalDataMessage.style.color = 'red';
                saveBtn.disabled = false;
            }
        });
    }

        // === БЛОК 9: ЛОГІКА ФОРМИ "БЕЗПЕКА" (ЗМІНА ПАРОЛЯ) ===
        const securityForm = document.getElementById('security-form');
        const savePasswordBtn = document.getElementById('save-password-btn');
        const securityMessage = document.getElementById('security-message');

        if (securityForm && savePasswordBtn) {
            const oldPasswordInput = document.getElementById('old-password');
            const newPasswordInput = document.getElementById('new-password');
            const confirmPasswordInput = document.getElementById('confirm-new-password');
            const inputs = [oldPasswordInput, newPasswordInput, confirmPasswordInput];

            // 1. Логіка "disabled"
            const checkSecurityForm = () => {
                // Активуємо, тільки якщо всі 3 поля заповнені
                const allFilled = inputs.every(input => input.value.length > 0);
                savePasswordBtn.disabled = !allFilled;
            };
            inputs.forEach(input => input.addEventListener('input', checkSecurityForm));

            // 2. Логіка відправки (AJAX/Fetch)
            securityForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                securityMessage.textContent = '';
                savePasswordBtn.disabled = true;

                const formData = new FormData(securityForm);
                const data = Object.fromEntries(formData.entries());

                // Клієнтська валідація 
                if (data.new_password !== data.confirm_new_password) {
                    securityMessage.textContent = 'Новий пароль та підтвердження не співпадають.';
                    securityMessage.style.color = 'red';
                    savePasswordBtn.disabled = false;
                    return;
                }

                try {
                    const response = await fetch('/profile/change-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();

                    if (response.ok) {
                        securityMessage.textContent = result.message;
                        securityMessage.style.color = 'green';
                        securityForm.reset(); 
                    } else {
                        securityMessage.textContent = result.message;
                        securityMessage.style.color = 'red';
                        savePasswordBtn.disabled = false; 
                    }
                } catch (err) {
                    securityMessage.textContent = 'Помилка мережі. Спробуйте пізніше.';
                    securityMessage.style.color = 'red';
                    savePasswordBtn.disabled = false;
                }
            });
        }

        // === БЛОК 10:  ЛОГІКА ФОРМИ "ВИДАЛИТИ АКАУНТ" ===
        const deleteAccountForm = document.getElementById('delete-account-form');
        const deletePasswordInput = document.getElementById('delete-password');
        const deleteAccountBtn = document.getElementById('delete-account-btn');
        const deleteAccountMessage = document.getElementById('delete-account-message');

        if (deleteAccountForm && deletePasswordInput && deleteAccountBtn) {
            
            // 1. Логіка "disabled"
            deletePasswordInput.addEventListener('input', () => {
                // Активуємо, тільки якщо поле пароля не порожнє
                deleteAccountBtn.disabled = deletePasswordInput.value.length === 0;
            });

            // 2. Логіка відправки (AJAX/Fetch)
            deleteAccountForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                
                if (!confirm('Ви впевнені, що хочете видалити свій акаунт? Ця дія незворотна.')) {
                    return; 
                }

                deleteAccountMessage.textContent = '';
                deleteAccountBtn.disabled = true;

                const formData = new FormData(deleteAccountForm);
                const data = Object.fromEntries(formData.entries());

                try {
                    const response = await fetch('/profile/delete-account', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();

                    if (response.ok) {
                        alert(result.message); // Повідомляємо
                        window.location.href = result.redirectUrl || '/'; 
                    } else {
                        // Помилка
                        deleteAccountMessage.textContent = result.message;
                        deleteAccountMessage.style.color = 'red';
                        deleteAccountBtn.disabled = false; 
                    }
                } catch (err) {
                    deleteAccountMessage.textContent = 'Помилка мережі. Спробуйте пізніше.';
                    deleteAccountMessage.style.color = 'red';
                    deleteAccountBtn.disabled = false;
                }
            });
        }

});