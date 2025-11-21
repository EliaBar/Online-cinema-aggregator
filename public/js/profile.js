document.addEventListener("DOMContentLoaded", function() {

    // === ЛОГІКА ВІКОН ПРОФІЛЮ ===
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
    } else {
        console.warn("Елементи вкладок профілю (.profile-tab-link) не знайдено.");
    }


    // === ЛОГІКА ФОРМИ ПРОФІЛЮ (AJAX/FETCH) ===
    const profileForm = document.getElementById('personal-data-form');
    const genderInput = document.getElementById('profile-gender');
    const dobInput = document.getElementById('profile-dob');
    const saveBtn = document.getElementById('save-profile-btn');

    if (profileForm && genderInput && dobInput && saveBtn) {

        let originalGender = genderInput.value;
        let originalDob = dobInput.value;

        const checkForChanges = () => {
            const genderChanged = genderInput.value !== originalGender;
            const dobChanged = dobInput.value !== originalDob;
            saveBtn.disabled = !(genderChanged || dobChanged);
        };

        genderInput.addEventListener('change', checkForChanges);
        dobInput.addEventListener('input', checkForChanges);

        profileForm.addEventListener('submit', async function(event) {
            event.preventDefault();
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
                    showToast(result.message, 'success'); 
                    originalGender = data.gender;
                    originalDob = data.dob;
                    checkForChanges(); 
                } else {
                    showToast(result.message, 'error'); 
                    saveBtn.disabled = false;
                }
            } catch (err) {
                showToast('Помилка мережі.', 'error');
                saveBtn.disabled = false;
            }
        });
    }

    // ===  ЛОГІКА ФОРМИ "БЕЗПЕКА" (ЗМІНА ПАРОЛЯ) ===
    const securityForm = document.getElementById('security-form');
    const savePasswordBtn = document.getElementById('save-password-btn');

    if (securityForm && savePasswordBtn) {
        const oldPasswordInput = document.getElementById('old-password');
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-new-password');
        const inputs = [oldPasswordInput, newPasswordInput, confirmPasswordInput];

        const checkSecurityForm = () => {
            const allFilled = inputs.every(input => input.value.length > 0);
            savePasswordBtn.disabled = !allFilled;
        };
        inputs.forEach(input => input.addEventListener('input', checkSecurityForm));

        securityForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            savePasswordBtn.disabled = true;

            const formData = new FormData(securityForm);
            const data = Object.fromEntries(formData.entries());

            if (data.new_password !== data.confirm_new_password) {
                showToast('Новий пароль та підтвердження не співпадають.', 'error');
                savePasswordBtn.disabled = false;
                return;
            }
            
            const passwordRegex = /^(?=.*\d)(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(data.new_password)) {
                showToast('Новий пароль не відповідає вимогам безпеки.', 'error');
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
                    showToast(result.message, 'success');
                    securityForm.reset(); 
                } else {
                    showToast(result.message, 'error');
                    savePasswordBtn.disabled = false;
                }
            } catch (err) {
                showToast('Помилка мережі.', 'error');
                savePasswordBtn.disabled = false;
            }
        });
    }

    // === ЛОГІКА ФОРМИ "ВИДАЛИТИ АКАУНТ" ===
    const deleteAccountForm = document.getElementById('delete-account-form');
    const deletePasswordInput = document.getElementById('delete-password');
    const deleteAccountBtn = document.getElementById('delete-account-btn');

    if (deleteAccountForm && deletePasswordInput && deleteAccountBtn) {
        
        deletePasswordInput.addEventListener('input', () => {
            deleteAccountBtn.disabled = deletePasswordInput.value.length === 0;
        });

        deleteAccountForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (!confirm('Ви впевнені, що хочете видалити свій акаунт? Ця дія незворотна.')) {
                return;
            }

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
                    showToast(result.message, 'success');
                    setTimeout(() => window.location.href = result.redirectUrl || '/', 1500);
                } else {
                    showToast(result.message, 'error');
                    deleteAccountBtn.disabled = false; 
                }
            } catch (err) {
                showToast('Помилка мережі.', 'error');
                deleteAccountBtn.disabled = false;
            }
        });
    }
    

    // ===  ЛОГІКА ДЛЯ КНОПКИ "ВИЙТИ" ===

    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(event) {
            event.preventDefault(); 
            
            try {
                const response = await fetch('/logout', {
                    method: 'GET' 
                });
                
                const result = await response.json();

                if (response.ok) {
                    showToast(result.message, 'success');
                    
                    setTimeout(() => {
                        window.location.href = '/'; 
                    }, 1500); 
                    
                } else {
                    showToast(result.message, 'error');
                }
            } catch (err) {
                showToast('Помилка мережі. Спробуйте пізніше.', 'error');
            }
        });
    }

}); 