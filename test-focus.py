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
    page.locator('#creator-name').fill('测试')
    for i in range(8):
        page.locator('#wa-creator-add-field').click()
        page.wait_for_timeout(200)
        labels = page.locator('.wa-creator-field-label').all()
        labels[-1].fill(f'字段{i+1}')
        labels[-1].blur()
        page.wait_for_timeout(200)
    page.locator('.wa-creator-field-header').first.click()
    page.wait_for_timeout(300)
    page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop = 0')
    page.wait_for_timeout(100)

    headers = page.locator('.wa-creator-field-header').all()
    headers[1].click()
    page.wait_for_timeout(500)
    print('scroll after click', page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop'))
    print('active element', page.evaluate('document.activeElement?.className'))
    print('active tag', page.evaluate('document.activeElement?.tagName'))
    browser.close()
