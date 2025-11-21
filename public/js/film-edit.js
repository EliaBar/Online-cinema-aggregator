document.addEventListener("DOMContentLoaded", function() {

    // ===  ВАЛІДАЦІЯ РОКІВ (Початок < Кінець) ===
    const yearStartSelect = document.getElementById('year_start');
    const yearEndSelect = document.getElementById('year_end');

    if (yearStartSelect && yearEndSelect) {
        const updateYearEndOptions = () => {
            const startYear = Number.parseInt(yearStartSelect.value, 10);
            
            Array.from(yearEndSelect.options).forEach(option => {
                const endYear = Number.parseInt(option.value, 10);
                if (endYear < startYear) {
                    option.disabled = true;
                    option.style.display = 'none';
                } else {
                    option.disabled = false;
                    option.style.display = 'block';
                }
            });

            if (Number.parseInt(yearEndSelect.value, 10) < startYear) {
                yearEndSelect.value = yearStartSelect.value; 
            }
        };

        yearStartSelect.addEventListener('change', updateYearEndOptions);
        updateYearEndOptions();
    }

    // ===  МУЛЬТИСЕЛЕКТ ЖАНРІВ  ===
    const multiselectEdit = document.getElementById('genre-multiselect-edit');
    const triggerEdit = document.getElementById('genre-trigger-edit');
    const checkboxesEdit = document.querySelectorAll('#genre-multiselect-edit input[name="genre"]');

    if (multiselectEdit && triggerEdit && checkboxesEdit.length > 0) {
        
        const updateTriggerTextEdit = () => {
            const selectedCheckboxes = document.querySelectorAll('#genre-multiselect-edit input[name="genre"]:checked');
            const selectedLabels = Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-label'));
            
            const triggerTextSpan = triggerEdit.querySelector('span');
            if (selectedLabels.length === 0) {
                triggerTextSpan.textContent = 'Оберіть жанри...';
            } else if (selectedLabels.length > 3) {
                triggerTextSpan.textContent = `Обрано: ${selectedLabels.length}`;
            } else {
                triggerTextSpan.textContent = selectedLabels.join(', ');
            }
        };
        
        triggerEdit.addEventListener('click', (e) => {
            e.stopPropagation(); 
            multiselectEdit.classList.toggle('is-active');
        });
        
        document.addEventListener('click', (e) => {
            if (multiselectEdit.classList.contains('is-active') && !multiselectEdit.contains(e.target)) {
                multiselectEdit.classList.remove('is-active');
            }
        });
        
        checkboxesEdit.forEach(cb => {
            cb.addEventListener('change', function(e) {
                const checkedCount = document.querySelectorAll('#genre-multiselect-edit input[name="genre"]:checked').length;
                
                if (checkedCount > 3) {
                    showToast('Можна обрати не більше 3-х жанрів.', 'error');
                    this.checked = false; 
                }
                updateTriggerTextEdit();
            });
        });

        updateTriggerTextEdit();
    }

    // === ЛОГІКА ВИДАЛЕННЯ ФІЛЬМУ ===
    const deleteFilmBtn = document.getElementById('delete-film-btn');
    const deleteFilmPasswordInput = document.getElementById('delete-film-password');

    if (deleteFilmBtn && deleteFilmPasswordInput) {
        deleteFilmPasswordInput.addEventListener('input', () => {
            if (deleteFilmPasswordInput.value.length > 0) {
                deleteFilmBtn.disabled = false;
            } else {
                deleteFilmBtn.disabled = true;
            }
        });

        deleteFilmBtn.addEventListener('click', async () => {
            if (!confirm('Ви ВПЕВНЕНІ, що хочете видалити цей фільм? Ця дія незворотна.')) {
                return; 
            }

            // Отримуємо ID фільму з URL
            const form = document.getElementById('film-edit-form'); 
            const actionUrl = form.getAttribute('action'); 
            const filmId = actionUrl.split('/')[2]; 
            
            // Отримуємо пароль
            const password = deleteFilmPasswordInput.value;

            deleteFilmBtn.disabled = true;
            showToast('Перевірка пароля...', 'info');

            try {
                const response = await fetch(`/film/${filmId}/delete`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: password }) 
                });
                
                const result = await response.json();

                if (response.ok) {
                    showToast(result.message, 'success');
                    setTimeout(() => { window.location.href = result.redirectUrl || '/'; }, 1500);
                } else {
                    showToast(result.message, 'error');
                    deleteFilmBtn.disabled = false;
                    deleteFilmPasswordInput.value = ''; 
                }
            } catch (err) {
                showToast('Помилка мережі.', 'error');
                deleteFilmBtn.disabled = false;
            }
        });
    }
});
