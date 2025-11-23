import pymysql
import pymysql.cursors
import json
import os
import re
import requests
from bs4 import BeautifulSoup as bs
from difflib import SequenceMatcher
import urllib.parse
import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException

def get_db_config():
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(base_dir, 'db_config.json')
        
        with open(config_path, 'r') as f:
            config = json.load(f)
            
        config['cursorclass'] = pymysql.cursors.DictCursor
        return config
        
    except FileNotFoundError:
        print("[!] ПОМИЛКА: Файл 'db_config.json' не знайдено!")
        raise

def load_cookies():
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        cookie_path = os.path.join(base_dir, 'cookies.json')
        with open(cookie_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("[!] ПОМИЛКА: Файл 'cookies.json' не знайдено!")
        return []
    
def create_connection():
    config = get_db_config()
    return pymysql.connect(**config)

def normalize_title(title):
    if not title: return None
    title = title.lower()
    title = re.sub(r'["\'"“”’‘:,\-\s]+', ' ', title)
    title = re.sub(r'\([^)]*\)', '', title)
    return title.strip()

def similarity(a, b):
    if not a or not b: return 0
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()

def get_or_create_genre(cursor, genre_cache, genre_name):
    clean_name = genre_name.strip()
    if not clean_name:
        return None
    
    if clean_name in genre_cache:
        return genre_cache[clean_name]

    cursor.execute("SELECT genre_id FROM genre WHERE name = %s", (clean_name,))
    result = cursor.fetchone()
    
    if result:
        genre_id = result['genre_id']
    else:
        try:
            cursor.execute("INSERT INTO genre (name) VALUES (%s)", (clean_name,))
            genre_id = cursor.lastrowid
            print(f"    -> Створено новий жанр: '{clean_name}' (ID: {genre_id})")
        except pymysql.err.IntegrityError:
            cursor.execute("SELECT genre_id FROM genre WHERE name = %s", (clean_name,))
            result = cursor.fetchone()
            genre_id = result['genre_id'] if result else None

    if genre_id:
        genre_cache[clean_name] = genre_id
    return genre_id

def parse_megogo_options(film_id, platform_id, json_str):
    rows_to_insert = []
    try:
        data = json.loads(json_str)
        
        if isinstance(data, list) and len(data) == 0:
            rows_to_insert.append((film_id, platform_id, 'Безкоштовно', None))
            return rows_to_insert

        if isinstance(data, list):
            for option in data:
                access_type = option.get('type', 'N/A')
                price_str = option.get('price')
                description = option.get('description', '')
                price = None
                
                if price_str and price_str.isdigit():
                    price = float(price_str)
                
                if 'Передплата' in access_type:
                    access_type = 'Підписка'
                    match = re.search(r'(\d{1,10})\s{0,20}грн', description)
                    if match:
                        price_from_desc = match.group(1)
                        if price_from_desc.isdigit():
                            price = float(price_from_desc)
                else:
                    quality = option.get('quality')
                    if quality:
                        access_type = f"{access_type} ({quality})"
                
                rows_to_insert.append((film_id, platform_id, access_type, price))
        
    except json.JSONDecodeError:
        print(f"    [!] Помилка JSON-парсингу Megogo для film_id: {film_id}")
    
    return rows_to_insert

def parse_sweettv_prices(driver):
    access_data = {}
    try:
        try:
            age_modal = WebDriverWait(driver, 2).until( 
                EC.presence_of_element_located((By.ID, "movieBlocked"))
            )
            print("    > Виявлено вікове обмеження доступу.")
            confirm_btn = age_modal.find_element(By.CSS_SELECTOR, ".btn")
            confirm_btn.click()
            WebDriverWait(driver, 5).until(
                EC.invisibility_of_element_located((By.ID, "movieBlocked"))
            )
            print("    > Вікове обмеження пройдено")
        except:
            pass

        buttons = driver.find_elements(By.CLASS_NAME, "movie-info__buttons-button")
        clicked = False

        for watch_button in buttons:
            button_text = watch_button.get_attribute("textContent").strip().lower()
            if "незабаром" in button_text: continue

            if "у передплаті" in button_text:
                print(f"    > Знайдено передплату: «{button_text}».")
                
                try: 
                    watch_button.click()
                    WebDriverWait(driver, 10).until( 
                        EC.presence_of_element_located((By.CLASS_NAME, "subscriptions__cards-card")) 
                    )
                    
                    subs = driver.find_elements(By.CLASS_NAME, "subscriptions__cards-card")
                    if subs:
                        print(f"    > Знайдено {len(subs)} пакет(ів) підписки:")
                        for sub in subs:
                            name = "N/A"
                            price = "N/A"
                            try:
                                name = sub.find_element(By.CLASS_NAME, "subscriptions__cards-card-title").text.strip()
                            except NoSuchElementException: pass
                            
                            try:
                                price = sub.find_element(By.CLASS_NAME, "subscriptions__cards-card-discount-price").get_attribute("textContent").strip()
                            except NoSuchElementException: pass
                                
                            access_data[name] = price
                            print(f"    >  - {name}: {price}")
                    try:
                        close_btn = driver.find_element(By.CSS_SELECTOR, ".modal-content .close")
                        close_btn.click()
                        WebDriverWait(driver, 5).until(
                            EC.invisibility_of_element_located((By.CLASS_NAME, "subscriptions__cards-card"))
                        )
                    except: 
                        driver.back() 
                        time.sleep(2)
                        
                except Exception as e:
                    print(f"    [!] Помилка під час обробки модального вікна підписки: {e}")
                
                clicked = True
                break

        if not clicked:
            offer_sections = driver.find_elements(By.CLASS_NAME, "movie-offers__modal-purchase")
            if offer_sections:
                print("    > Знайдено пропозиції Покупки/Оренди:")
                for section in offer_sections:
                    try:
                        section_title = section.find_element(By.CLASS_NAME, "movie-offers__modal-purchase-title").get_attribute("textContent").strip()
                        offer_blocks = section.find_elements(By.CLASS_NAME, "movie-offers__modal-purchase-offers-offer")
                        section_data = {}
                        for block in offer_blocks:
                            quality = block.find_element(By.CLASS_NAME, "movie-offers__modal-purchase-offers-offer-title").get_attribute("textContent").strip()
                            price = block.find_element(By.CLASS_NAME, "movie-offers__modal-purchase-offers-offer-price-amount").get_attribute("textContent").strip()
                            section_data[quality] = price
                        if section_data:
                            access_data[section_title] = section_data
                    except Exception as e:
                        print(f"    [!] Помилка парсингу блоку покупки/оренди: {e}")
                        
    except Exception as e:
        print(f"    [!] Загальна помилка у parse_sweettv_prices: {e}")

    if not access_data:
        print("    > Ціни на Sweet.tv не знайдено (можливо, доступно у базовій підписці).")
        access_data = {"M": "0 грн"}
        
    return json.dumps(access_data, ensure_ascii=False)

def parse_sweettv_options(film_id, platform_id, json_str):
    rows_to_insert = []
    try:
        data = json.loads(json_str)
        if not isinstance(data, dict):
            return []

        for access_type, details in data.items():
            if isinstance(details, str):
                price_str = re.sub(r'[^0-9.]', '', details)
                price = float(price_str) if price_str else 0.0
                rows_to_insert.append((film_id, platform_id, f"Підписка ({access_type})", price))
            
            elif isinstance(details, dict):
                for quality, price_full in details.items():
                    price_str = re.sub(r'[^0-9.]', '', price_full)
                    price = float(price_str) if price_str else None
                    full_access_type = f"{access_type} ({quality})"
                    rows_to_insert.append((film_id, platform_id, full_access_type, price))

    except json.JSONDecodeError:
        print(f"    [!] Помилка JSON-парсингу Sweet.tv (parse_options): {json_str}")
    return rows_to_insert

def parse_film_page_megogo(url):
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status() 
        soup = bs(r.text, "html.parser")
    except requests.RequestException as e:
        print(f"    [!] Не вдалося завантажити сторінку {url}: {e}")
        return None

    name_tag = soup.select_one('h1.video-title[itemprop="name"]')
    name = name_tag.get_text(strip=True) if name_tag else None
    if not name: return None
        
    normalized_name = normalize_title(name)
    poster_tag = soup.select_one('.player-poster img[itemprop="url"]')
    poster_url = poster_tag['src'] if poster_tag else None
    age_tag = soup.select_one('.videoInfoPanel-age-limit')
    age_limit = age_tag.get_text(strip=True) if age_tag else None
    rating_tags = soup.select('.videoInfoPanel-rating')
    imdb_rating = None
    for tag in rating_tags:
        if 'IMDb' in tag.get_text():
            value_span = tag.select_one('.value')
            imdb_rating = value_span.get_text(strip=True).strip(',') if value_span else None
            break
    genre_tags = soup.select('a.video-genre')
    genres = ', '.join(tag.get_text(strip=True) for tag in genre_tags)
    duration_tag = soup.select_one('.video-duration span[itemprop="duration"]')
    film_duration = duration_tag.get_text(strip=True) if duration_tag else None
    year_tag = soup.select_one('.video-info .video-year')
    release_year = year_tag.get_text(strip=True) if year_tag else None
    country_tag = soup.select_one('.video-info .video-country')
    country = country_tag.get_text(strip=True) if country_tag else None
    description_tag = soup.select_one('.video-description .show-more')
    description = description_tag.get_text(separator=' ', strip=True) if description_tag else None
    
    access_options_megogo_obj = []
    subscription_overlay = soup.select_one('.trailer-overlay.svod')
    if subscription_overlay:
        desc = subscription_overlay.select_one('.stub-description')
        if desc: access_options_megogo_obj.append({"type": "Передплата", "description": desc.get_text(separator=' ', strip=True)})
    
    tvod_overlay = soup.select_one('.trailer-overlay.tvod')
    if tvod_overlay:
        blocks = tvod_overlay.select('.pQuality__1')
        for block in blocks:
            title = block.select_one('.pQuality__title')
            if not title: continue
            access_type = title.get_text(strip=True)
            items = block.select('.pQuality__item')
            for item in items:
                quality = item.select_one('.pQualityItem__quality')
                duration = item.select_one('.pQualityItem__duration')
                price = item.select_one('.pQualityItemPrice__value')
                currency = item.select_one('.pQualityItemPrice__currency')
                access_options_megogo_obj.append({
                    'type': access_type,
                    'quality': quality.get_text(strip=True) if quality else None,
                    'duration': duration.get_text(strip=True) if duration else None,
                    'price': price.get_text(strip=True) if price else None,
                    'currency': currency.get_text(strip=True) if currency else None
                })
    
    return {
        "name": name,
        "normalized_name": normalized_name,
        "url": url,
        "poster_url": poster_url,
        "age_limit": age_limit,
        "imdb_rating": imdb_rating,
        "access_options_megogo": json.dumps(access_options_megogo_obj, ensure_ascii=False),
        "geners": genres,
        "description": description,
        "duration": film_duration,
        "release_year": release_year,
        "country": country
    }

def parse_film_page_sweettv(driver, parse_full_data):
    try:
        WebDriverWait(driver, 15).until(
            lambda d: (el := d.find_element(By.CSS_SELECTOR, "h1.movie__title")) and el.text.strip() != "" and el or None
        )
        print("    > [Sweet.tv] Сторінка динамічно завантажена.")
    except TimeoutException:
        print("    > [Sweet.tv] Не вдалося дочекатися завантаження заголовку. Парсинг неможливий.")
        return None
    except Exception as e:
        print(f"    > [Sweet.tv] Помилка під час очікування: {e}")
        return None

    try:
        json_prices = parse_sweettv_prices(driver)
    except Exception as e:
        print(f"    [!] Критична помилка у parse_sweettv_prices: {e}")
        json_prices = json.dumps({"error": "parsing failed"}, ensure_ascii=False)
    
    film_data = {
        "access_options_PK": json_prices
    }

    if parse_full_data:
        print("    > Megogo не знайдено. Парсинг всіх даних з Sweet.tv...")
        try:
            try:
                film_data["name"] = driver.find_element(By.CSS_SELECTOR, "h1.movie__title").text.strip()
                film_data["normalized_name"] = normalize_title(film_data["name"])
                print(f"    > Знайдено Name: {film_data['name']}")
            except NoSuchElementException:
                print("    [!] Назву не знайдено.")
            try:
                description = driver.find_element(By.CSS_SELECTOR, "p#film_description").text.strip()
                film_data["description"] = description
                print(f"    > Знайдено Description: {description[:50]}...")
            except NoSuchElementException:
                print("    [!] Опис не знайдено.")
            try:
                imdb_rating = driver.find_element(By.CSS_SELECTOR, "span[data-movie-el='16']").text.strip()
                film_data["imdb_rating"] = imdb_rating
                print(f"    > Знайдено IMDb Rating: {imdb_rating}")
            except NoSuchElementException:
                print("    [!] Рейтинг IMDb не знайдено.")
            try:
                country_tags = driver.find_elements(By.CSS_SELECTOR, "p.desc-film-countries a")
                countries = [tag.text.strip() for tag in country_tags]
                film_data["country"] = ', '.join(countries)
                print(f"    > Знайдено Country: {film_data['country']}")
            except NoSuchElementException:
                print("    [!] Країну не знайдено.")
            try:
                genre_tags = driver.find_elements(By.CSS_SELECTOR, "p.desc-film-page-genre")
                genres = [tag.text.strip() for tag in genre_tags]
                film_data["geners"] = ', '.join(genres)
                print(f"    > Знайдено Genres: {film_data['geners']}")
            except NoSuchElementException:
                print("    [!] Жанри не знайдено.")
            try:
                age_limit = driver.find_element(By.CSS_SELECTOR, "span[data-movie-el='25']").text.strip()
                film_data["age_limit"] = age_limit
                print(f"    > Знайдено Age Limit: {age_limit}")
            except NoSuchElementException:
                print("    [!] Вікове обмеження не знайдено.")
            try:
                duration = driver.find_element(By.CSS_SELECTOR, "span#timeCount").text.strip()
                duration_unit = driver.find_element(By.CSS_SELECTOR, "span#timeLabel").text.strip()
                film_data["duration"] = f"{duration} {duration_unit}"
                print(f"    > Знайдено Duration: {film_data['duration']}")
            except NoSuchElementException:
                print("    [!] Тривалість не знайдено.")
            try:
                release_year = driver.find_element(By.CSS_SELECTOR, "span[data-movie-el='14']").text.strip()
                film_data["release_year"] = release_year
                print(f"    > Знайдено Release Year: {release_year}")
            except NoSuchElementException:
                print("    [!] Рік випуску не знайдено.")

        except Exception as e:
            print(f"    [!] Загальна помилка парсингу повних даних з Sweet.tv: {e}")

    return film_data


def search_megogo(film_name_to_search):
    try:
        search_query = urllib.parse.quote(film_name_to_search)
        search_url = f"https://megogo.net/ua/search-extended?q={search_query}"
        print(f"    > [Megogo] Пошуковий URL: {search_url}")
        
        r = requests.get(search_url, timeout=10)
        r.raise_for_status()
        soup = bs(r.text, "html.parser")
    
        cards = soup.find_all('div', class_='card')[:7] 
        
        if not cards:
            print("    > [Megogo] На сторінці пошуку нічого не знайдено.")
            return None
        
        for card in cards:
            site_title, film_url, poster_url = None, None, None
            
            img_tag = card.select_one('div.thumb img[data-original]')
            if img_tag:
                poster_url = img_tag.get('data-original')

            link_tag = card.select_one('a.card-content-title')
            if link_tag:
                title_tag = link_tag.select_one('h3.card-title')
                if title_tag:
                    site_title = title_tag.get_text(strip=True)
                    film_url = link_tag.get('href')
            
            if not site_title:
                link_tag = card.select_one('div.thumb a') 
                if link_tag:
                    site_title = link_tag.get('title')
                    if not site_title:
                        img_tag_alt = link_tag.find('img')
                        if img_tag_alt: site_title = img_tag_alt.get('alt')
                    film_url = link_tag.get('href')
            
            if not site_title or not film_url:
                continue
            
            sim_score = similarity(film_name_to_search, site_title)
            print(f"    > [Megogo] Знайдено: '{site_title}' | Схожість: {sim_score:.2f}")

            if sim_score > 0.85:
                if film_url.startswith('/'):
                    film_url = "https://megogo.net" + film_url
                print(f"    > [Megogo]  Збіг знайдено: {film_url}")
                return {"url": film_url, "title": site_title, "poster_url": poster_url}
        
        print("    > [Megogo] Не знайдено збігів з високою схожістю.")
        return None

    except Exception as e:
        print(f"    > [Megogo]  Помилка пошуку: {e}")
        return None

def search_sweettv(driver, film_name_to_search, get_poster=False):
    try:
        search_url = f"https://sweet.tv/search?q={urllib.parse.quote(film_name_to_search)}"
        print(f"    > [Sweet.tv] Пошуковий URL: {search_url}")
        driver.get(search_url)

        results = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.swiper-slide a.swiper-slide-wrap"))
        )
        
        for result in results[:5]: 
            href = result.get_attribute("href")
            if not href: continue
            
            site_title = None
            poster_url = None 

            try:
                site_title = result.find_element(By.CLASS_NAME, "movie-card__title").text.strip()
            except NoSuchElementException:
                pass 

            if get_poster:
                try:
                    img_tag = result.find_element(By.TAG_NAME, "img")
                    poster_url = img_tag.get_attribute("src")
                    if 'data:image' in poster_url: 
                        poster_url = img_tag.get_attribute("data-src") or poster_url
                    print("    > [Sweet.tv] Знайдено запасний постер.")
                except NoSuchElementException:
                    print("    > [Sweet.tv] Не знайдено <img> на картці.")
            
            if not site_title:
                try:
                    original_window = driver.current_window_handle
                    driver.execute_script("window.open(arguments[0]);", href)
                    driver.switch_to.window(driver.window_handles[1])
                    
                    movie_title_element = WebDriverWait(driver, 10).until(
                        lambda d: (el := d.find_element(By.CSS_SELECTOR, "h1.movie__title")) and el.text.strip() != "" and el or None
                    )
                    site_title = movie_title_element.text.strip()
                    
                    driver.close()
                    driver.switch_to.window(original_window)
                    
                except Exception as e:
                    print(f"    > [Sweet.tv] Помилка при отриманні назви з суб-сторінки: {e}")
                    if len(driver.window_handles) > 1:
                        driver.close()
                        driver.switch_to.window(original_window)
                    continue
            
            sim_score = similarity(film_name_to_search, site_title)
            print(f"    > [Sweet.tv] Знайдено: '{site_title}' | Схожість: {sim_score:.2f}")
            
            if sim_score > 0.85:
                print(f"    > [Sweet.tv] Збіг знайдено: {href}")
                return {"url": href, "title": site_title, "poster_url": poster_url} 
        
        print("    > [Sweet.tv]  Не знайдено збігів з високою схожістю.")
        return None

    except TimeoutException:
        print(f"    > [Sweet.tv]  Нічого не знайдено для '{film_name_to_search}'")
        return None
    except Exception as e:
        print(f"    > [Sweet.tv] Помилка пошуку: {e}")
        return None

def save_and_normalize_data(cursor, film_id, megogo_data, sweettv_data, genre_cache, platform_cache, megogo_poster_url_fallback=None, sweettv_poster_url_fallback=None):
    try:
        full_data = megogo_data if megogo_data else sweettv_data
        
        poster_to_save = None
        if full_data: poster_to_save = full_data.get('poster_url')
        if not poster_to_save and megogo_poster_url_fallback: poster_to_save = megogo_poster_url_fallback
        if not poster_to_save and sweettv_poster_url_fallback: poster_to_save = sweettv_poster_url_fallback

        if full_data:
            cursor.execute("""
                UPDATE films 
                SET url = %s, poster_url = %s, age_limit = %s, imdb_rating = %s,
                    description = %s, duration = %s, 
                    release_year = %s, country = %s
                WHERE id = %s
            """, (
                full_data.get('url'), poster_to_save, full_data.get('age_limit'),
                full_data.get('imdb_rating'), full_data.get('description'),
                full_data.get('duration'), full_data.get('release_year'), 
                full_data.get('country'), film_id 
            ))
            
            cursor.execute("DELETE FROM film_genre WHERE film_id = %s", (film_id,))
            if full_data.get('geners'):
                genre_names = full_data['geners'].split(',')
                film_genre_rows = []
                for name in genre_names:
                    genre_id = get_or_create_genre(cursor, genre_cache, name)
                    if genre_id: film_genre_rows.append((film_id, genre_id))
                if film_genre_rows:
                    cursor.executemany("INSERT INTO film_genre (film_id, genre_id) VALUES (%s, %s)", film_genre_rows)
        
        platform_id_megogo = platform_cache['Megogo']
        cursor.execute("DELETE FROM film_platform WHERE film_id = %s AND platform_id = %s", (film_id, platform_id_megogo))
        if megogo_data and megogo_data.get('access_options_megogo'):
            megogo_rows = parse_megogo_options(film_id, platform_id_megogo, megogo_data['access_options_megogo'])
            if megogo_rows:
                cursor.executemany("INSERT INTO film_platform (film_id, platform_id, access_type, price) VALUES (%s, %s, %s, %s)", megogo_rows)
        
        platform_id_sweettv = platform_cache['Sweet.tv']
        cursor.execute("DELETE FROM film_platform WHERE film_id = %s AND platform_id = %s", (film_id, platform_id_sweettv))
        if sweettv_data and sweettv_data.get('access_options_PK'):
            cursor.execute("UPDATE films SET url_sweet_tv = %s WHERE id = %s", (sweettv_data.get('url_sweet_tv'), film_id))
            sweettv_rows = parse_sweettv_options(film_id, platform_id_sweettv, sweettv_data['access_options_PK'])
            if sweettv_rows:
                cursor.executemany("INSERT INTO film_platform (film_id, platform_id, access_type, price) VALUES (%s, %s, %s, %s)", sweettv_rows)
        
        print(f"     Дані для ID {film_id} успішно оновлено.")
        
    except Exception as e:
        print(f"    [!] Помилка save_and_normalize_data: {e}")
        raise
