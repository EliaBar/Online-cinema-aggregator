document.addEventListener("DOMContentLoaded", function() {
   // === БЛОК 1: Логіка перемикання Пошук/Фільтри ===
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
});