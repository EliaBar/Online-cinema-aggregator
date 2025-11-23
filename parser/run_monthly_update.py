import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from core import (
    create_connection, load_cookies, save_and_normalize_data,
    search_megogo, parse_film_page_megogo,
    search_sweettv, parse_film_page_sweettv
)

def main():
    conn = create_connection()
    cookies = load_cookies()
    
    options = Options()
    options.add_argument("--start-maximized")
    options.add_argument("--headless") 
    driver = webdriver.Chrome(options=options)
    driver.get("https://sweet.tv")
    time.sleep(2)
    for cookie in cookies:
        try: driver.add_cookie(cookie)
        except: pass
    
    try:
        with conn.cursor() as cursor:
            plat_cache = {}; gen_cache = {}
            cursor.execute("SELECT * FROM platform")
            for p in cursor.fetchall(): plat_cache[p['name']] = p['platform_id']
            cursor.execute("SELECT * FROM genre")
            for g in cursor.fetchall(): gen_cache[g['name']] = g['genre_id']
            cursor.execute("SELECT id, name FROM films")
            films = cursor.fetchall()
            print(f"\n--- Щомісячне оновлення: {len(films)} фільмів ---")

            for film in films:
                film_id = film['id']
                film_name = film['name']
                print(f"\n--- Оновлення ID {film_id}: '{film_name}' ---")

                megogo_data = None
                sweettv_data = None
                m_poster_fallback = None
                s_poster_fallback = None

                # Megogo
                m_match = search_megogo(film_name)
                if m_match:
                    megogo_data = parse_film_page_megogo(m_match['url'])
                    m_poster_fallback = m_match.get('poster_url')

                # Sweet.tv
                need_s_poster = not m_poster_fallback and not (megogo_data and megogo_data.get('poster_url'))
                s_match = search_sweettv(driver, film_name, get_poster=need_s_poster)
                if s_match:
                    driver.get(s_match['url'])
                    sweettv_data = parse_film_page_sweettv(driver, megogo_data is None)
                    if sweettv_data:
                        sweettv_data['url_sweet_tv'] = s_match['url']
                        s_poster_fallback = s_match.get('poster_url')

                if not megogo_data and not sweettv_data:
                    print("    [!] Дані не знайдено. Пропуск.")
                    continue

                save_and_normalize_data(
                    cursor, film_id, 
                    megogo_data, sweettv_data, 
                    gen_cache, plat_cache, 
                    m_poster_fallback, s_poster_fallback
                )
                conn.commit()
                time.sleep(1)

    finally:
        driver.quit(); conn.close()

if __name__ == "__main__":
    main()