document.addEventListener("DOMContentLoaded", function() {

// ================ ЛОГІКА РЕЙТИНГУ  ================
    const starWidget = document.querySelector('.star-rating-widget');
    
    if (starWidget) {
        const stars = starWidget.querySelectorAll('i');
        const filmId = starWidget.getAttribute('data-film-id');
        
        let currentRating = Number.parseInt(starWidget.getAttribute('data-current-rating'), 10) || 0;

        const setStars = (rating) => {
            stars.forEach(star => {
                const starValue = parseInt(star.getAttribute('data-value'), 10);
                if (starValue <= rating) {
                    star.classList.remove('far');
                    star.classList.add('fas', 'active');
                } else {
                    star.classList.remove('fas', 'active');
                    star.classList.add('far');
                }
            });
        };
        setStars(currentRating);

        stars.forEach(star => {
            star.addEventListener('mouseover', () => {
                const rating = Number.parseInt(star.getAttribute('data-value'), 10);
                stars.forEach((s, i) => {
                    const sValue = Number.parseInt(s.getAttribute('data-value'), 10);
                    if (sValue <= rating) {
                        s.classList.add('fas', 'hover');
                        s.classList.remove('far');
                    } else {
                        s.classList.remove('fas', 'hover');
                        s.classList.add('far');
                    }
                });
            });

            star.addEventListener('mouseout', () => {
                stars.forEach(s => s.classList.remove('hover'));
                setStars(currentRating); 
            });

            star.addEventListener('click', async () => {
                const ratingValue = Number.parseInt(star.getAttribute('data-value'), 10);
                const newRating = (ratingValue === currentRating) ? 0 : ratingValue;
                
                showToast('Збереження...', 'info');
                
                try {
                    const response = await fetch(`/film/${filmId}/rate-star`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rating_value : newRating }) 
                    });
                    const result = await response.json();

                    if (response.ok) {
                        currentRating = newRating;
                        setStars(currentRating);  
                        showToast(result.message, 'success');
                    } else {
                        showToast(result.message, 'error');
                        setStars(currentRating); 
                    }
                } catch (err) {
                    showToast('Помилка мережі.', 'error');
                    setStars(currentRating); 
                }
            });
        });
    }

    // ===  ЛОГІКА ТЕГІВ ЕМОЦІЙ ===
    const moodWidget = document.querySelector('.mood-tag-widget');
    if (moodWidget) {
        const buttons = moodWidget.querySelectorAll('.mood-tag-btn');
        const messageDiv = document.getElementById('mood-rating-message');
        const filmId = moodWidget.getAttribute('data-film-id');
        

        const sendMoodTags = async () => {
            const activeButtons = moodWidget.querySelectorAll('.mood-tag-btn.active');
            const moodTagIds = Array.from(activeButtons).map(btn => 
                Number.parseInt(btn.getAttribute('data-tag-id'), 10)
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
                    showToast(result.message, 'success');
                } else {
                    showToast(result.message, 'error'); 
                }
            } catch (err) {
                showToast('Помилка мережі.', 'error'); 
            }
            setTimeout(() => messageDiv.textContent = '', 2000);
        };

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const activeCount = moodWidget.querySelectorAll('.mood-tag-btn.active').length;
                const isCurrentlyActive = button.classList.contains('active');

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
