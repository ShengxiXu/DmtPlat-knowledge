from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('http://localhost:5173/?view=workAssistant')
    time.sleep(2)
    page.click('text=创建模板')
    time.sleep(1)
    page.click('.wa-creator-tab[data-tab="form"]')
    time.sleep(2)
    page.screenshot(path='e:\\dmtplat-test\\actual-form-final.png', full_page=True)
    print('截图: actual-form-final.png')
    browser.close()
