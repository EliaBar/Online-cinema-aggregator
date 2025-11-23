import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from core import (
    create_connection, load_cookies, save_and_normalize_data, normalize_title,
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

            cursor.execute("SELECT log_id, query_text FROM search_log WHERE is_processed = 0 LIMIT 50")
            logs = cursor.fetchall()
            print(f"\n--- Щоденна обробка логів: {len(logs)} запитів ---")

            for log in logs:
                query = log['query_text']
                log_id = log['log_id']
                print(f"\n--- Запит: '{query}' ---")

                megogo_data = None
                sweettv_data = None
                m_poster = None; s_poster = None

                m_match = search_megogo(query)
                if m_match:
                    megogo_data = parse_film_page_megogo(m_match['url'])
                    m_poster = m_match.get('poster_url')

                need_s_poster = not m_poster and not (megogo_data and megogo_data.get('poster_url'))
                s_match = search_sweettv(driver, query, get_poster=need_s_poster)
                if s_match:
                    driver.get(s_match['url'])
                    sweettv_data = parse_film_page_sweettv(driver, megogo_data is None)
                    if sweettv_data:
                        sweettv_data['url_sweet_tv'] = s_match['url']
                        s_poster = s_match.get('poster_url')

                if not megogo_data and not sweettv_data:
                    print("    [!] Нічого не знайдено.")
                    cursor.execute("UPDATE search_log SET is_processed = 1 WHERE log_id = %s", (log_id,))
                    conn.commit()
                    continue

                full_data = megogo_data if megogo_data else sweettv_data
                norm_name = full_data.get('normalized_name')
                
                cursor.execute("SELECT id FROM films WHERE normalized_name = %s", (norm_name,))
                existing = cursor.fetchone()

                if existing:
                    print(f"     Фільм вже є в базі (ID {existing['id']}). ПРОПУСКАЄМО.")
                else:

                    print(f"    > Створення нового фільму: '{full_data['name']}'...")
                    
                    cursor.execute("""
                        INSERT INTO films (name, normalized_name) VALUES (%s, %s)
                    """, (full_data['name'], norm_name))
                    new_id = cursor.lastrowid
                    
                    save_and_normalize_data(
                        cursor, new_id, 
                        megogo_data, sweettv_data, 
                        gen_cache, plat_cache, 
                        m_poster, s_poster
                    )

                cursor.execute("UPDATE search_log SET is_processed = 1 WHERE log_id = %s", (log_id,))
                conn.commit()
                time.sleep(1)

    finally:
        driver.quit(); conn.close()

if __name__ == "__main__":
    main()