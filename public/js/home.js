document.addEventListener("DOMContentLoaded", function() {
     // ===  ЛОГІКА КАРУСЕЛІ ===
    const carousel = document.getElementById("top-offers-carousel");
    const prevBtn = document.getElementById("carousel-prev");
    const nextBtn = document.getElementById("carousel-next");

    if (carousel && prevBtn && nextBtn) {
        
        const scrollCarousel = (direction) => {
            const scrollAmount = carousel.clientWidth; 
            const gap = 20; 

            if (direction === 'next') {
                if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - gap) {
                    carousel.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                }
            } 
            
            else if (direction === 'prev') {
                // Перевіряємо, чи клієнт вжее на початку
                if (carousel.scrollLeft === 0) {
                    // Клієнт на початку - перестрибуємо в кінець
                    carousel.scrollTo({ left: carousel.scrollWidth, behavior: 'smooth' });
                } else {
                    // Просто прокручуємо вліво
                    carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                }
            }
        };
        nextBtn.addEventListener("click", () => scrollCarousel('next'));
        prevBtn.addEventListener("click", () => scrollCarousel('prev'));

    } else {
        console.error("Помилка: не вдалося знайти елементи каруселі.");
    }
});