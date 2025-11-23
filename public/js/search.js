document.addEventListener("DOMContentLoaded", function() {
   // ===  Логіка перемикання Пошук/Фільтри ===
    const searchComponent = document.getElementById("search-component");
    const toggleToFilterBtn = document.getElementById("toggle-to-filter");
    const toggleToTextBtn = document.getElementById("toggle-to-text");

    if (searchComponent && toggleToFilterBtn && toggleToTextBtn) {
        toggleToFilterBtn.addEventListener("click", function() {
            searchComponent.classList.add("filter-mode");
        });

        toggleToTextBtn.addEventListener("click", function() {
            searchComponent.classList.remove("filter-mode");
        });
    } else {
        console.error("Помилка: не вдалося знайти елементи для перемикання пошуку/фільтрів.");
    }

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
});
