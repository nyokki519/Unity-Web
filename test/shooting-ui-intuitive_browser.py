"""Smoke checks for plain-language shooting menus at common phone sizes."""
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('SHOOTING_URL', 'http://127.0.0.1:3443/shooting/index.html')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-dev-shm-usage'])
    for width in (375, 390, 414):
        page = browser.new_page(viewport={'width': width, 'height': 844})
        page.goto(BASE, wait_until='domcontentloaded')
        page.wait_for_function('() => !!window.SHOOTING')
        title = page.locator('#menu').inner_text()
        assert 'すぐ遊ぶ（おすすめ）' in title
        assert 'パワーアップ' in title
        assert 'ステージを選ぶ' in title
        assert '工廠' not in title and '航路選択' not in title
        assert page.locator('#menu').evaluate('(el) => el.scrollWidth <= innerWidth')

        page.locator('[data-do=hangar]').click()
        panel = page.locator('#menu').inner_text()
        assert 'あそび方' in panel and 'ストーリー' in panel and 'かんたん' in panel
        assert 'この装備で発進' not in panel and '工廠' not in panel
        assert page.locator('#menu').evaluate('(el) => el.scrollWidth <= innerWidth')
        print(f'{width}px: title and preparation menus readable without horizontal overflow')
        page.close()
    browser.close()
