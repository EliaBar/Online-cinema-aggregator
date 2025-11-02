document.addEventListener("DOMContentLoaded", function() {

    // === БЛОК 1: ЛОГІКА ЗІРКОВОГО РЕЙТИНГУ ===
    const starWidget = document.querySelector('.star-rating-widget');
    if (starWidget) {
        const stars = starWidget.querySelectorAll('i');
        const messageDiv = document.getElementById('star-rating-message');
        const filmId = starWidget.getAttribute('data-film-id');
        let currentRating = 0;
        
        const activeStar = starWidget.querySelector('i.active:last-of-type');
        if (activeStar) {
            currentRating = parseInt(activeStar.getAttribute('data-value'), 10);
        }

        const setStars = (rating) => {
            stars.forEach(star => {
                if (parseInt(star.getAttribute('data-value'), 10) <= rating) {
                    star.classList.remove('far');
                    star.classList.add('fas', 'active');
                } else {
                    star.classList.remove('fas', 'active');
                    star.classList.add('far');
                }
            });
        };

        stars.forEach(star => {
            star.addEventListener('mouseover', () => {
                const rating = parseInt(star.getAttribute('data-value'), 10);
                // Підсвічування зірок при наведенні
                stars.forEach((s, i) => {
                    s.classList.toggle('hover', i < rating);
                });
            });

            star.addEventListener('mouseout', () => {
                stars.forEach(s => s.classList.remove('hover'));
                setStars(currentRating);
            });

            star.addEventListener('click', async () => {
                const ratingValue = parseInt(star.getAttribute('data-value'), 10);
                
                // Якщо клікнули на ту саму зірку, знімається оцінка (ставиться 0)
                const newRating = (ratingValue === currentRating) ? 0 : ratingValue;
                
                messageDiv.textContent = 'Збереження...';
                
                try {
                    const response = await fetch(`/film/${filmId}/rate-star`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rating_value: newRating })
                    });
                    const result = await response.json();

                    if (response.ok) {
                        currentRating = newRating; 
                        setStars(currentRating);
                        messageDiv.textContent = result.message;
                        messageDiv.style.color = 'green';
                    } else {
                        messageDiv.textContent = result.message;
                        messageDiv.style.color = 'red';
                    }
                } catch (err) {
                    messageDiv.textContent = 'Помилка мережі.';
                    messageDiv.style.color = 'red';
                }
                setTimeout(() => messageDiv.textContent = '', 2000);
            });
        });
    }

    // === БЛОК 2: ЛОГІКА ТЕГІВ ЕМОЦІЙ ===
    const moodWidget = document.querySelector('.mood-tag-widget');
    if (moodWidget) {
        const buttons = moodWidget.querySelectorAll('.mood-tag-btn');
        const messageDiv = document.getElementById('mood-rating-message');
        const filmId = moodWidget.getAttribute('data-film-id');
        
        // Функція для відправки даних на сервер
        const sendMoodTags = async () => {
            const activeButtons = moodWidget.querySelectorAll('.mood-tag-btn.active');
            const moodTagIds = Array.from(activeButtons).map(btn => 
                parseInt(btn.getAttribute('data-tag-id'), 10)
            );
            
            messageDiv.textContent = 'Збереження...';
            try {
                const response = await fetch(`/film/${filmId}/rate-mood`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mood_tag_ids: moodTagIds }) 
                });
                const result = await response.json();
                
                if (response.ok) {
                    messageDiv.textContent = result.message;
                    messageDiv.style.color = 'green';
                } else {
                    messageDiv.textContent = result.message;
                    messageDiv.style.color = 'red';
                }
            } catch (err) {
                messageDiv.textContent = 'Помилка мережі.';
                messageDiv.style.color = 'red';
            }
            setTimeout(() => messageDiv.textContent = '', 2000);
        };

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const activeCount = moodWidget.querySelectorAll('.mood-tag-btn.active').length;
                const isCurrentlyActive = button.classList.contains('active');

                // Логіка: можна обрати, якщо < 5,
                // АБО можна "відтиснути" кнопку, якщо вона вже активна
                if (activeCount < 5 || isCurrentlyActive) {
                    button.classList.toggle('active');
                    sendMoodTags(); 
                } else {
                    messageDiv.textContent = 'Можна обрати не більше 5-ти емоцій.';
                    messageDiv.style.color = 'red';
                    setTimeout(() => messageDiv.textContent = '', 2000);
                }
            });
        });
    }
});