from playwright.sync_api import sync_playwright

BASE_URL = 'http://localhost:5173'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto(f'{BASE_URL}?view=workAssistant')
    page.wait_for_timeout(1000)
    page.locator('#wa-template-creator-btn').click()
    page.wait_for_timeout(500)
    page.locator('.wa-creator-tab[data-tab="form"]').click()
    page.wait_for_timeout(300)
    style = page.evaluate('''() => {
        const el = document.querySelector('.wa-creator-form-config');
        const cs = window.getComputedStyle(el);
        return {
            overflowAnchor: cs.overflowAnchor,
            overflowY: cs.overflowY,
            height: cs.height,
            scrollBehavior: cs.scrollBehavior,
        };
    }''')
    print(style)
    browser.close()
