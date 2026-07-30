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

    # collapse all: click first header twice
    page.locator('.wa-creator-field-header').first.click()
    page.wait_for_timeout(300)
    page.locator('.wa-creator-field-header').first.click()
    page.wait_for_timeout(300)

    page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop = 200')
    page.wait_for_timeout(100)
    before = page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop')
    print('before click scroll', before)

    headers = page.locator('.wa-creator-field-header').all()
    headers[3].click(force=True)
    page.wait_for_timeout(500)
    after = page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop')
    print('after click scroll', after)

    page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop = 250')
    page.wait_for_timeout(100)
    before2 = page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop')
    page.locator('#wa-creator-add-field').click(force=True)
    page.wait_for_timeout(500)
    after2 = page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop')
    print('after add field scroll', after2, '(before', before2, ')')

    browser.close()
